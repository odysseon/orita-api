import { Injectable, NotFoundException } from '@nestjs/common';
import { IBusinessProfileRepository } from '../../domain/ports/business-profile.repository.port.js';
import { BusinessProfileView } from '../../domain/types/business-profile.types.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';

@Injectable()
export class GetPublicBusinessProfileUseCase {
  constructor(
    private readonly repo: IBusinessProfileRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    slug: string,
    currentUserId?: string,
  ): Promise<BusinessProfileView & { isFollowed?: boolean }> {
    const profile = await this.repo.findBySlug(slug);

    if (!profile || !profile.isPublic) {
      throw new NotFoundException('Business profile not found.');
    }

    let isFollowed = false;
    if (currentUserId) {
      const followCount = await this.prisma.follow.count({
        where: { followerId: currentUserId, businessId: profile.id },
      });
      isFollowed = followCount > 0;
    }

    return { ...profile, isFollowed };
  }
}
