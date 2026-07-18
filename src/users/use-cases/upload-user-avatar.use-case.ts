import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Readable } from 'stream';
import { MediaStorageService } from '../../storage/media-storage.service.js';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
} from '../core/ports/user.repository.interface.js';
import { PrismaService } from '../../prisma/prisma.service.js';

import 'multer';

@Injectable()
export class UploadUserAvatarUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    private readonly mediaStorage: MediaStorageService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(accountId: string, file: Express.Multer.File): Promise<unknown> {
    const user = await this.userRepository.findByAccountId(accountId);
    if (!user) throw new NotFoundException('User not found');

    const { fileId, provider, bytes, format, mimeType, width, height } =
      await this.mediaStorage.uploadNewMedia({
        destination: 'users/avatars',
        fileName: file.originalname,
        fileData: Readable.from(file.buffer),
      });

    // Delete existing avatar media
    const existingMedia = await this.prisma.media.findFirst({
      where: { userId: user.id, role: 'AVATAR' },
    });

    if (existingMedia) {
      await this.prisma.media.delete({ where: { id: existingMedia.id } });
      await this.mediaStorage.deleteMedia(existingMedia.fileId);
    }

    // Create new media record
    await this.prisma.media.create({
      data: {
        userId: user.id,
        fileId,
        mediaType: 'IMAGE',
        role: 'AVATAR',
        bytes: bytes ?? null,
        format: format ?? null,
        mimeType: mimeType || file.mimetype,
        provider: provider,
        width: width ?? null,
        height: height ?? null,
      },
    });

    // Return the updated profile
    return this.userRepository.findByAccountId(accountId);
  }
}
