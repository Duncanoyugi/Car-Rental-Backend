import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '../../generated/prisma';
import { FavoriteService } from './favorite.service';
import { AddFavoriteDto } from './dtos/add-favorite.dto';

@Controller('favorites')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post()
  addFavorite(@Body() dto: AddFavoriteDto, @Req() req) {
    return this.favoriteService.addFavorite(req.user.id, dto);
  }

  @Delete(':vehicleId')
  removeFavorite(@Param('vehicleId') vehicleId: string, @Req() req) {
    return this.favoriteService.removeFavorite(req.user.id, vehicleId);
  }

  @Get()
  getFavorites(@Req() req) {
    return this.favoriteService.getFavorites(req.user.id);
  }

  @Get(':vehicleId/check')
  isFavorite(@Param('vehicleId') vehicleId: string, @Req() req) {
    return this.favoriteService.isFavorite(req.user.id, vehicleId);
  }
}