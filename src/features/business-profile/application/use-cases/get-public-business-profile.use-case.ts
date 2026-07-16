import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
    // If it looks like a CUID (25 chars, starts with 'c'), reject it as bad request
    if (slug.startsWith('c') && slug.length >= 24) {
      throw new BadRequestException('Public calls must use the business slug, not the ID.');
    }
    const profile = await this.repo.findBySlug(slug);

    if (!profile || !profile.isPublic) {
      throw new NotFoundException('Business profile not found.');
    }

    let isFollowed = false;
    if (currentUserId) {
      const followCount = await this.prisma.businessFollow.count({
        where: { userId: currentUserId, businessId: profile.id },
      });
      isFollowed = followCount > 0;
    }

    return { ...profile, isFollowed };
  }
}
