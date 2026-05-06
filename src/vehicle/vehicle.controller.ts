import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Put,
  Param,
  Delete,
  Get,
  Query,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto } from './dtos/create-vehicle.dto';
import { UpdateVehicleDto } from './dtos/update-vehicle.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Vehicle } from 'src/interfaces/vehicle.interface';
import { Role } from '../../generated/prisma';
import { FileInterceptor } from '@nestjs/platform-express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vehicles')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post()
  @Roles(Role.ADMIN, Role.AGENT)
  @UseInterceptors(FileInterceptor('images', {
    limits: { files: 10, fileSize: 8 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new Error('Only image files allowed'), false);
    }
  }))
  async create(
    @Request() req,
    @Body() _dto: CreateVehicleDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<Vehicle> {
    // multipart/form-data parsing + validation can be inconsistent for arrays/numbers,
    // so build a DTO-compatible plain object from req.body.
    const body: any = req.body ?? {};

    const featuresRaw = body.features ?? body['features[]'] ?? body.featuresInput;
    const features: string[] = Array.isArray(featuresRaw)
      ? featuresRaw.map(String)
      : typeof featuresRaw === 'string'
        ? [featuresRaw]
        : [];

    const pricePerDay = typeof body.pricePerDay === 'string'
      ? Number(body.pricePerDay)
      : body.pricePerDay;

    const dto: CreateVehicleDto = {
      title: body.title,
      category: body.category,
      pricePerDay,
      features,
      availableFrom: body.availableFrom,
      availableTo: body.availableTo,
      location: body.location,
      imageUrls: body.imageUrls,
    };

    return this.vehicleService.create(dto, req.user.sub, files || []);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.AGENT)
  @UseInterceptors(FileInterceptor('images', {
    limits: { files: 10, fileSize: 8 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new Error('Only image files allowed'), false);
    }
  }))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<Vehicle> {
    return this.vehicleService.update(id, dto, files);
  }

  @Post(':id/upload-images')
  @Roles(Role.ADMIN, Role.AGENT)
  @UseInterceptors(FileInterceptor('images', {
    limits: { files: 10, fileSize: 8 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new Error('Only image files allowed'), false);
    }
  }))
  async uploadVehicleImages(@Param('id') id: string, @UploadedFiles() files: Express.Multer.File[]): Promise<{ urls: string[] }> {
    const imageUrls: string[] = [];
    for (const file of files) {
      const result = await this.vehicleService.uploadImages(file);
      imageUrls.push(...result.urls);
    }
    return { urls: imageUrls };
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.AGENT)
  delete(@Param('id') id: string): Promise<Vehicle> {
    return this.vehicleService.delete(id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.AGENT)
  findAll(): Promise<Vehicle[]> {
    return this.vehicleService.findAll();
  }

  @Get('featured')
  @Roles(Role.ADMIN, Role.AGENT, Role.CUSTOMER)
  getFeaturedVehicles(): Promise<Vehicle[]> {
    return this.vehicleService.getFeaturedVehicles();
  }

  @Get('browse')
  @Roles(Role.CUSTOMER)
  browseVehicles(
    @Query('location') location?: string,
    @Query('category') category?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('q') q?: string,
  ) {
    return this.vehicleService.searchAvailableVehicles({ location, category, from, to, q });
  }
}