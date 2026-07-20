import { Injectable } from '@nestjs/common';
import { IMediaRepository } from '../../domain/ports/media.repository.port.js';

@Injectable()
export class AttachMediaToMessageUseCase {
  constructor(private readonly mediaRepo: IMediaRepository) {}

  async execute(mediaIds: string[], messageId: string): Promise<void> {
    if (!mediaIds?.length) return;
    await this.mediaRepo.attachToMessage(mediaIds, messageId);
  }
}
