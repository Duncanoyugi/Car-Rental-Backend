import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { CloudinaryModule } from 'src/utils/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  providers: [CustomerService],
  controllers: [CustomerController]
})
export class CustomerModule {}
