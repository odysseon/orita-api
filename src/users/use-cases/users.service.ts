import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  type IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '../core/ports/user.repository.interface.js';
import { UpdateUserProfileDto } from '../delivery/http/dto/update-user-profile.dto.js';
import { UpdateExplorationContextDto } from '../delivery/http/dto/update-exploration-context.dto.js';
import { MediaStorageService } from '../../storage/media-storage.service.js';
import { UploadOwnerType, MediaRole, StorageProvider } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    private readonly mediaStorage: MediaStorageService,
    private readonly prisma: PrismaService,
  ) {}

  async getMyProfile(accountId: string) {
    const user = await this.userRepository.findByAccountId(accountId);
    if (!user) {
      throw new NotFoundException('User profile not found. Please complete registration.');
    }
    return user;
  }

  async updateMyProfile(accountId: string, payload: UpdateUserProfileDto) {
    return this.userRepository.updateProfile(accountId, payload);
  }

  async updateExplorationContext(accountId: string, payload: UpdateExplorationContextDto) {
    return this.userRepository.updateExplorationContext(accountId, payload);
  }

  async updateInterests(accountId: string, categoryIds: string[]) {
    return this.userRepository.updateInterests(accountId, categoryIds);
  }

  async generateAvatarUploadIntent(accountId: string) {
    const user = await this.getMyProfile(accountId);
    
    const folder = `users/${user.id}/avatar`;
    const publicId = `media_${uuidv4()}`;
    const timestamp = Math.round(new Date().getTime() / 1000);

    const signatureResult = await this.mediaStorage.generateUploadSignature(folder, publicId, timestamp);
    
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const intent = await this.prisma.uploadIntent.create({
      data: {
        ownerType: UploadOwnerType.USER,
        ownerId: user.id,
        role: MediaRole.AVATAR,
        provider: StorageProvider.CLOUDINARY,
        folder,
        publicId,
        createdById: user.id,
        expiresAt,
      }
    });
    
    return {
      ...signatureResult,
      intentId: intent.id,
      folder,
      publicId,
    };
  }

  async consumeAvatarUploadIntent(accountId: string, payload: { intentId: string; publicId: string; version: string }) {
    const user = await this.getMyProfile(accountId);
    
    const intent = await this.prisma.uploadIntent.findUnique({
      where: { id: payload.intentId },
    });
    
    if (!intent || intent.ownerId !== user.id || intent.role !== MediaRole.AVATAR || intent.consumedAt) {
      throw new BadRequestException('Invalid or expired upload intent.');
    }
    
    const metadata = await this.mediaStorage.getMetadata(payload.publicId);
    if (!metadata) {
      throw new BadRequestException('Media not found on storage provider.');
    }
    
    await this.prisma.$transaction(async (tx) => {
      await tx.uploadIntent.update({
        where: { id: intent.id },
        data: { consumedAt: new Date() },
      });
      
      await tx.media.deleteMany({
        where: { userId: user.id, role: MediaRole.AVATAR },
      });
      
      await tx.media.create({
        data: {
          fileId: payload.publicId,
          version: payload.version,
          provider: StorageProvider.CLOUDINARY,
          mimeType: metadata.mimeType || 'image/jpeg',
          mediaType: metadata.mimeType?.startsWith('video') ? 'VIDEO' : 'IMAGE',
          format: metadata.format ?? null,
          bytes: metadata.bytes ?? null,
          width: metadata.width ?? null,
          height: metadata.height ?? null,
          role: MediaRole.AVATAR,
          userId: user.id,
        }
      });
    });
    
    // We don't actually need to clear Redis manually if we trigger a cache update from userRepository, 
    // but the next fetch will retrieve the new avatar.
    
    return { url: metadata.url, role: MediaRole.AVATAR };
  }
}
