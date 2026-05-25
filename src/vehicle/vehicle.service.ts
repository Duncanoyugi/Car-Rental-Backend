import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateVehicleDto } from './dtos/create-vehicle.dto';
import { UpdateVehicleDto } from './dtos/update-vehicle.dto';
import { MulterFile } from 'src/interfaces/multer-file.interface';
import { Vehicle } from 'src/interfaces/vehicle.interface';
import { Vehicle as PrismaVehicle } from '../../generated/prisma';
import { CloudinaryService, UploadType } from 'src/utils/cloudinary.service';

@Injectable()
export class VehicleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  private mapToInterface(vehicle: PrismaVehicle): Vehicle {
    return {
      id: vehicle.id,
      title: vehicle.title,
      category: vehicle.category,
      pricePerDay: vehicle.pricePerDay,
      features: vehicle.features,
      imageUrls: vehicle.imageUrls,
      availableFrom: vehicle.availableFrom.toISOString(),
      availableTo: vehicle.availableTo.toISOString(),
      location: vehicle.location,
      createdBy: vehicle.createdBy,
      createdAt: vehicle.createdAt.toISOString(),
      updatedAt: vehicle.updatedAt.toISOString(),
    };
  }

  async uploadImages(file: MulterFile): Promise<{ urls: string[] }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.cloudinary.uploadFile(file, UploadType.VEHICLE_IMAGE, {
      entityType: 'vehicle',
      entityId: 'temp_' + Date.now(),
    });

    return { urls: [result.secure_url] };
  }

  // Admin or Agent create with optional files and optional existing imageUrls
  async create(dto: CreateVehicleDto, createdBy: string, files?: MulterFile[]): Promise<Vehicle> {
    const imageUrls: string[] = [...(dto.imageUrls || [])];

    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const uploadResult = await this.cloudinary.uploadFile(file, UploadType.VEHICLE_IMAGE, {
            entityType: 'vehicle',
            entityId: 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(7),
          });
          imageUrls.push(uploadResult.secure_url);
        } catch (error) {
          // Clean up already uploaded images if one fails
          for (const url of imageUrls) {
            try {
              const publicId = this.cloudinary.extractPublicIdFromUrl(url);
              await this.cloudinary.deleteFile(publicId);
            } catch {}
          }
          throw new BadRequestException('Failed to upload one or more images');
        }
      }
    }

    const vehicle = await this.prisma.vehicle.create({
      data: {
        ...dto,
        // Prisma DateTime requires full ISO-8601 timestamp.
        // Frontend sends YYYY-MM-DD from <input type="date"/>, so coerce to Date.
        availableFrom: new Date(dto.availableFrom),
        availableTo: new Date(dto.availableTo),
        imageUrls,
        createdBy,
      },
    });
    return this.mapToInterface(vehicle);
  }

  async update(id: string, dto: UpdateVehicleDto, files?: MulterFile[]): Promise<Vehicle> {
    const existing = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Vehicle not found');

    const updateData: any = { ...dto };

    // Handle image uploads
    if (files && files.length > 0) {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        try {
          const result = await this.cloudinary.uploadFile(file, UploadType.VEHICLE_IMAGE, {
            entityType: 'vehicle',
            entityId: id,
          });
          uploadedUrls.push(result.secure_url);
        } catch (error) {
          throw new BadRequestException('Failed to upload one or more images');
        }
      }

      if (dto.imageUrls !== undefined) {
        // Merge with explicitly provided URLs
        updateData.imageUrls = [...dto.imageUrls, ...uploadedUrls];
      } else {
        // Append to existing images
        updateData.imageUrls = [...(existing.imageUrls || []), ...uploadedUrls];
      }
    } else if (dto.imageUrls !== undefined) {
      updateData.imageUrls = dto.imageUrls;
    }

    const vehicle = await this.prisma.vehicle.update({
      where: { id },
      data: updateData,
    });
    return this.mapToInterface(vehicle);
  }

  async delete(id: string): Promise<Vehicle> {
    const existing = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Vehicle not found');

    // Delete Cloudinary images
    if (existing.imageUrls && Array.isArray(existing.imageUrls)) {
      for (const url of existing.imageUrls) {
        try {
          const publicId = this.cloudinary.extractPublicIdFromUrl(url);
          await this.cloudinary.deleteFile(publicId);
        } catch (error) {
          console.warn(`Failed to delete image from Cloudinary: ${url}`, error);
        }
      }
    }

    const vehicle = await this.prisma.vehicle.delete({ where: { id } });
    return this.mapToInterface(vehicle);
  }

  async findAll(): Promise<Vehicle[]> {
    const vehicles = await this.prisma.vehicle.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return vehicles.map((v) => this.mapToInterface(v));
  }

  async getById(id: string): Promise<Vehicle> {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    return this.mapToInterface(vehicle);
  }

  // Agent-specific vehicle creation (without files - can add images via update)
  async createVehicle(dto: CreateVehicleDto, agentId: string) {
    // Since this method doesn't handle file uploads, we simply create vehicle without images
    // or with any URLs provided in dto.imageUrls (if any)
    return this.prisma.vehicle.create({
      data: {
        ...dto,
        createdBy: agentId,
      },
    });
  }

  async getMyVehicles(agentId: string) {
    return this.prisma.vehicle.findMany({
      where: { createdBy: agentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateMyVehicle(id: string, dto: UpdateVehicleDto, agentId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle || vehicle.createdBy !== agentId) {
      throw new ForbiddenException('Access denied');
    }

    // Simple update without handling file uploads (images should be sent as URLs in dto)
    return this.prisma.vehicle.update({
      where: { id },
      data: dto,
    });
  }

  async deleteMyVehicle(id: string, agentId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle || vehicle.createdBy !== agentId) {
      throw new ForbiddenException('Access denied');
    }

    // Clean up Cloudinary images before delete
    if (vehicle.imageUrls && Array.isArray(vehicle.imageUrls)) {
      for (const url of vehicle.imageUrls) {
        try {
          const publicId = this.cloudinary.extractPublicIdFromUrl(url);
          await this.cloudinary.deleteFile(publicId);
        } catch (error) {
          console.warn(`Failed to delete Cloudinary image: ${url}`, error);
        }
      }
    }

    return this.prisma.vehicle.delete({ where: { id } });
  }

  async searchAvailableVehicles(filters: {
    location?: string;
    category?: string;
    from?: string;
    to?: string;
    q?: string;
  }): Promise<PrismaVehicle[]> {
    const { location, category, from, to, q } = filters;

    // Treat missing dates as "available on today" (not "from now") to avoid
    // timezone/time-of-day edge cases with YYYY-MM-DD inputs.
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999,
    );

    const fromDate = from ? new Date(from) : startOfToday;
    const toDate = to ? new Date(to) : endOfToday;

    const baseFilter: any = {
      ...(location && {
        location: { contains: location, mode: 'insensitive' },
      }),
      ...(category && {
        category: { equals: category, mode: 'insensitive' },
      }),
      ...(q && {
        title: { contains: q, mode: 'insensitive' },
      }),
    };

    if (!from && !to) {
      // Browsing without explicit dates should show all vehicles
      // that have not yet expired (future or current availability).
      return this.prisma.vehicle.findMany({
        where: {
          ...baseFilter,
          availableTo: { gte: startOfToday },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // If availableTo is earlier than availableFrom (bad data), swap the range
    // so customers don't get an empty list.
    const safeFrom = fromDate <= toDate ? fromDate : toDate;
    const safeTo = fromDate <= toDate ? toDate : fromDate;

    return this.prisma.vehicle.findMany({
      where: {
        ...baseFilter,
        // Visible if it overlaps requested date range.
        AND: [
          {
            availableFrom: { lte: safeTo },
          },
          {
            availableTo: { gte: safeFrom },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFeaturedVehicles(): Promise<Vehicle[]> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // Last 7 days as featured
      take: 6, // Limit to 6 vehicles
      orderBy: { createdAt: 'desc' },
    });
    return vehicles.map((v) => this.mapToInterface(v));
  }
}