import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import {
  CreateUploadIntentInput,
  IUploadIntentRepository,
} from '../domain/ports/upload-intent.repository.port.js';
import { UploadIntent } from '../domain/types/upload-intent.entity.js';

@Injectable()
export class PrismaUploadIntentRepository implements IUploadIntentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUploadIntentInput): Promise<UploadIntent> {
    return this.prisma.uploadIntent.create({
      data: input,
    });
  }

  async findById(intentId: string): Promise<UploadIntent | null> {
    return this.prisma.uploadIntent.findUnique({
      where: { id: intentId },
    });
  }

  async markConsumed(intentId: string): Promise<void> {
    await this.prisma.uploadIntent.update({
      where: { id: intentId },
      data: { consumedAt: new Date() },
    });
  }
}
