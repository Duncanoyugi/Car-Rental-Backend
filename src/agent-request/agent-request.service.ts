import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AgentRequestStatus } from '../../generated/prisma';

export interface CreateAgentRequestDto {
  experience: string;
  vehicleCount: number;
  reason: string;
}

@Injectable()
export class AgentRequestService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, data: CreateAgentRequestDto) {
    return this.prisma.agentRequest.create({
      data: {
        userId,
        experience: data.experience,
        vehicleCount: data.vehicleCount,
        reason: data.reason,
      },
    });
  }

  async findAll() {
    return this.prisma.agentRequest.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: AgentRequestStatus) {
    return this.prisma.agentRequest.update({
      where: { id },
      data: { status },
      include: { user: true },
    });
  }
}