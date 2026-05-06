import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { VehicleModule } from './vehicle/vehicle.module';
import { BookingModule } from './booking/booking.module';
import { PaymentModule } from './payment/payment.module';
import { ReviewModule } from './review/review.module';
import { AdminModule } from './admin/admin.module';
import { MailModule } from './mail/mail.module';
import { AgentController } from './agent/agent.controller';
import { AgentService } from './agent/agent.service';
import { AgentModule } from './agent/agent.module';
import { CustomerModule } from './customer/customer.module';
import { CloudinaryModule } from './utils/cloudinary.module';
import { FavoriteModule } from './favorite/favorite.module';
import { AgentRequestModule } from './agent-request/agent-request.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    VehicleModule,
    BookingModule,
    PaymentModule,
    ReviewModule,
    AdminModule,
    MailModule,
    AgentModule,
    CustomerModule,
    CloudinaryModule,
    FavoriteModule,
    AgentRequestModule,
  ],
  controllers: [AppController, AgentController],
  providers: [AppService, AgentService],
})
export class AppModule {}
