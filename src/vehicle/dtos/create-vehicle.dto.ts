import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsNumber()
  pricePerDay: number;

  @IsArray()
  @IsString({ each: true })
  features: string[];

  // Optional: if not provided, images can be uploaded separately via /upload-images endpoint
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @IsDateString()
  availableFrom: string;

  @IsDateString()
  availableTo: string;

  @IsString()
  @IsNotEmpty()
  location: string;
}
