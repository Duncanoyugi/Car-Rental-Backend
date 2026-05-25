import {
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AgentService } from './agent.service';
import { MulterFile } from 'src/interfaces/multer-file.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '../../generated/prisma';
import { RequestWithUser } from 'src/interfaces/request-with-user.interface';
import { UpdateAgentProfileDto } from './dtos/update-profile.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { FileInterceptor } from '@nestjs/platform-express';


@Controller('agent')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AGENT)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get('stats')
  getStats(@Req() req: RequestWithUser) {
    return this.agentService.getStats(req.user.id);
  }

  @Get('customers')
  getCustomers(@Req() req: RequestWithUser) {
    return this.agentService.getCustomersForAgent(req.user.id);
  }


  @Get('payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT)
  getAgentPayments(@Req() req: RequestWithUser) {
    return this.agentService.getPaymentsForAgent(req.user.id);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT)
  getProfile(@Req() req: RequestWithUser) {
    return this.agentService.getProfile(req.user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT)
  updateProfile(
    @Body() dto: UpdateAgentProfileDto,
    @Req() req: RequestWithUser,
  ) {
    return this.agentService.updateProfile(req.user.id, dto);
  }

  @Post('profile/photo')
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT)
  async uploadPhoto(
    @UploadedFile() file: MulterFile,
    @Req() req: RequestWithUser,
  ) {
    return this.agentService.uploadProfileImage(req.user.id, file);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT)
  changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: RequestWithUser,
  ) {
    return this.agentService.changePassword(req.user.id, dto);
  }
}
