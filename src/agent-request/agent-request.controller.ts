import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AgentRequestService, CreateAgentRequestDto } from './agent-request.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role, AgentRequestStatus } from '../../generated/prisma';
import { RequestWithUser } from 'src/interfaces/request-with-user.interface';

@Controller('agent-request')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgentRequestController {
  constructor(private readonly agentRequestService: AgentRequestService) {}

  @Post()
  @Roles(Role.CUSTOMER)


  create(@Req() req: RequestWithUser, @Body() data: CreateAgentRequestDto) {
    return this.agentRequestService.create(req.user.sub, data);
  }




  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.agentRequestService.findAll();
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  updateStatus(@Param('id') id: string, @Body('status') status: AgentRequestStatus) {
    return this.agentRequestService.updateStatus(id, status);
  }
}