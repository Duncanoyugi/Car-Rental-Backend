import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddFavoriteDto } from './dtos/add-favorite.dto';

@Injectable()
export class FavoriteService {
  constructor(private readonly prisma: PrismaService) {}

  async addFavorite(userId: string, dto: AddFavoriteDto) {
    const { vehicleId } = dto;

    // Check if vehicle exists
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Check if already favorited
    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_vehicleId: {
          userId,
          vehicleId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('Vehicle already in favorites');
    }

    return this.prisma.favorite.create({
      data: {
        userId,
        vehicleId,
      },
      include: {
        vehicle: true,
      },
    });
  }

  async removeFavorite(userId: string, vehicleId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_vehicleId: {
          userId,
          vehicleId,
        },
      },
    });
    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    return this.prisma.favorite.delete({
      where: {
        userId_vehicleId: {
          userId,
          vehicleId,
        },
      },
    });
  }

  async getFavorites(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: {
        vehicle: {
          include: {
            reviews: true,
            bookings: {
              where: {
                status: 'CONFIRMED',
              },
            },
          },
        },
      },
    });
  }

  async isFavorite(userId: string, vehicleId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_vehicleId: {
          userId,
          vehicleId,
        },
      },
    });
    return !!favorite;
  }
}