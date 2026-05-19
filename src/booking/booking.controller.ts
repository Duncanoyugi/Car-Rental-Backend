import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '../../generated/prisma';
import { Booking } from 'src/interfaces/booking.interface';
import { RequestWithUser } from 'src/interfaces/request-with-user.interface';
import { CreateBookingDto } from './dtos/create-booking.dto';

@Controller('booking')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @Roles(Role.CUSTOMER)
  createBooking(
    @Body() dto: CreateBookingDto,
    @Req() req: RequestWithUser,
  ): Promise<Booking> {
    return this.bookingService.createBooking(req.user.id, dto);
  }

  @Get('my-vehicles')
  @Roles(Role.AGENT)
  getBookingsForMyVehicles(@Req() req: RequestWithUser): Promise<Booking[]> {
    return this.bookingService.getBookingsForAgent(req.user.id);
  }

  @Get('my')
  @Roles(Role.CUSTOMER)
  getMyBookings(@Req() req: RequestWithUser): Promise<Booking[]> {
    return this.bookingService.getBookingsForCustomer(req.user.id);
  }

  @Patch(':id/cancel')
  @Roles(Role.CUSTOMER)
  cancelBooking(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<Booking> {
    return this.bookingService.cancelBookingByCustomer(id, req.user.id);
  }

  @Patch(':id/status')
  @Roles(Role.AGENT)
  updateBookingStatus(
    @Param('id') id: string,
    @Body('status') status: Booking['status'],
    @Req() req: RequestWithUser,
  ): Promise<Booking> {
    return this.bookingService.updateBookingStatusByAgent(id, status, req.user.id);
  }
}
