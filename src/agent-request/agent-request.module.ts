import { Module } from '@nestjs/common';
import { AgentRequestController } from './agent-request.controller';
import { AgentRequestService } from './agent-request.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [AgentRequestController],
  providers: [AgentRequestService, PrismaService],
})
export class AgentRequestModule {}