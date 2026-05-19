import { IsString, IsDateString, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  vehicleId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
