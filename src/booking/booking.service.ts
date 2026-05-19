import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Booking } from 'src/interfaces/booking.interface';
import { BookingStatus } from '../../generated/prisma';
import { Booking as BookingInterface } from 'src/interfaces/booking.interface';
import { CreateBookingDto } from './dtos/create-booking.dto';




@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  private mapToInterface(booking: any): Booking {
    return {
      ...booking,
      startDate: booking.startDate.toISOString(),
      endDate: booking.endDate.toISOString(),
      createdAt: booking.createdAt.toISOString(),
    };
  }

  async findAll(): Promise<any[]> {
    const bookings = await this.prisma.booking.findMany({
      include: {
        vehicle: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return bookings.map((b) => ({
      ...this.mapToInterface(b),
      vehicle: b.vehicle,
      user: b.user,
    }));
  }

  async updateStatus(id: string, status: BookingStatus): Promise<Booking> {
    const booking = await this.prisma.booking.update({
        where: { id },
        data: { status },
    });
    return this.mapToInterface(booking);
  }
  async getBookingsForAgent(agentId: string): Promise<BookingInterface[]> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { createdBy: agentId },
      select: { id: true },
    });

    const vehicleIds = vehicles.map((v) => v.id);

    if (vehicleIds.length === 0) {
      return [];
    }

    const bookings = await this.prisma.booking.findMany({
      where: { vehicleId: { in: vehicleIds } },
      include: {
        vehicle: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookings.map((b) => ({
      id: b.id,
      userId: b.userId,
      vehicleId: b.vehicleId,
      startDate: b.startDate.toISOString(),
      endDate: b.endDate.toISOString(),
      status: b.status,
      totalPrice: b.totalPrice,
      createdAt: b.createdAt.toISOString(),
      vehicle: b.vehicle,
      user: b.user,
    }));
  }

  async createBooking(
    userId: string,
    dto: CreateBookingDto,
  ): Promise<BookingInterface> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    if (startDate < new Date(new Date().toISOString().split('T')[0])) {
      throw new BadRequestException('Start date cannot be in the past');
    }

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const overlapping = await this.prisma.booking.findFirst({
      where: {
        vehicleId: dto.vehicleId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
    });

    if (overlapping) {
      throw new BadRequestException('Vehicle is not available for the selected dates');
    }

    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const totalPrice = days * vehicle.pricePerDay;

    const booking = await this.prisma.booking.create({
      data: {
        userId,
        vehicleId: dto.vehicleId,
        startDate,
        endDate,
        totalPrice,
        status: 'PENDING',
      },
      include: { vehicle: true },
    });

    return {
      id: booking.id,
      userId: booking.userId,
      vehicleId: booking.vehicleId,
      startDate: booking.startDate.toISOString(),
      endDate: booking.endDate.toISOString(),
      status: booking.status,
      totalPrice: booking.totalPrice,
      createdAt: booking.createdAt.toISOString(),
      vehicle: booking.vehicle,
    };
  }

  async cancelBookingByCustomer(
    bookingId: string,
    userId: string,
  ): Promise<BookingInterface> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { vehicle: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
      throw new BadRequestException('Only pending or confirmed bookings can be cancelled');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
      include: { vehicle: true },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      vehicleId: updated.vehicleId,
      startDate: updated.startDate.toISOString(),
      endDate: updated.endDate.toISOString(),
      status: updated.status,
      totalPrice: updated.totalPrice,
      createdAt: updated.createdAt.toISOString(),
      vehicle: updated.vehicle,
    };
  }

  async updateBookingStatusByAgent(
    bookingId: string,
    status: BookingInterface['status'],
    agentId: string,
  ): Promise<BookingInterface> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { vehicle: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.vehicle.createdBy !== agentId)
      throw new ForbiddenException('You do not own this vehicle');

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      vehicleId: updated.vehicleId,
      startDate: updated.startDate.toISOString(),
      endDate: updated.endDate.toISOString(),
      status: updated.status,
      totalPrice: updated.totalPrice,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async getBookingsForCustomer(userId: string): Promise<BookingInterface[]> {
    const bookings = await this.prisma.booking.findMany({
      where: { userId },
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' },
    });

    return bookings.map((b) => ({
      id: b.id,
      userId: b.userId,
      vehicleId: b.vehicleId,
      startDate: b.startDate.toISOString(),
      endDate: b.endDate.toISOString(),
      status: b.status,
      totalPrice: b.totalPrice,
      createdAt: b.createdAt.toISOString(),
      vehicle: b.vehicle, // Include vehicle details
    }));
  }
}
