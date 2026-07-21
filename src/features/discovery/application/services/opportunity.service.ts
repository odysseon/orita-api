import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
} from '../../api/dto/opportunity-request.dto.js';
import { OPPORTUNITY_TYPE_POLICIES } from '../../domain/opportunity-type.policy.js';
import { NearbyItemKind, NearbyItemDto } from '../../domain/discovery-publisher.interface.js';
import { MediaUrlService } from '../../../media/application/services/media-url.service.js';
import { Prisma } from '../../../../../generated/prisma/client.js';

type PostWithRelations = Prisma.OpportunityPostGetPayload<{
  include: { location: true; author: true; businessProfile: true; media: true };
}>;

@Injectable()
export class OpportunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaUrlService: MediaUrlService,
  ) {}

  async create(authorId: string, dto: CreateOpportunityDto): Promise<NearbyItemDto> {
    const activeCount = await this.prisma.opportunityPost.count({
      where: { authorId, status: 'ACTIVE' },
    });

    if (activeCount >= 3) {
      throw new ConflictException('You can only have a maximum of 3 active opportunity posts.');
    }

    const policy = OPPORTUNITY_TYPE_POLICIES[dto.type];
    if (!policy) {
      throw new UnprocessableEntityException('Invalid opportunity type.');
    }

    let expiresAt = new Date();
    if (policy.canOverrideExpiry && dto.expiresAt) {
      expiresAt = dto.expiresAt;
    } else {
      expiresAt.setHours(expiresAt.getHours() + policy.ttlHours);
    }

    try {
      const post = await this.prisma.opportunityPost.create({
        data: {
          authorId,
          businessProfileId: dto.businessProfileId ?? null,
          title: dto.title,
          body: dto.body ?? null,
          type: dto.type,
          locationId: dto.locationId,
          expiresAt,
        },
        include: {
          location: true,
          author: true,
          businessProfile: true,
          media: true,
        },
      });

      return this.mapToDto(post);
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new UnprocessableEntityException('The provided location does not exist.');
      }
      throw error;
    }
  }

  async getMyPosts(authorId: string): Promise<NearbyItemDto[]> {
    const posts = await this.prisma.opportunityPost.findMany({
      where: { authorId },
      include: { location: true, author: true, businessProfile: true, media: true },
      orderBy: { createdAt: 'desc' },
    });
    return posts.map((p) => this.mapToDto(p));
  }

  async getById(id: string): Promise<NearbyItemDto> {
    const post = await this.prisma.opportunityPost.findUnique({
      where: { id },
      include: { location: true, author: true, businessProfile: true, media: true },
    });
    if (!post) throw new NotFoundException();
    return this.mapToDto(post);
  }

  async update(authorId: string, id: string, dto: UpdateOpportunityDto): Promise<NearbyItemDto> {
    const post = await this.prisma.opportunityPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException();
    if (post.authorId !== authorId) throw new ForbiddenException();
    if (post.status !== 'ACTIVE') throw new ConflictException('Only active posts can be edited.');

    const policy = OPPORTUNITY_TYPE_POLICIES[post.type];
    const editWindowMs = policy.editWindowHours * 60 * 60 * 1000;
    if (new Date().getTime() - post.createdAt.getTime() > editWindowMs) {
      throw new UnprocessableEntityException('Edit window has closed for this post.');
    }

    let updatedExpiresAt = post.expiresAt;
    if (policy.canOverrideExpiry && dto.expiresAt) {
      updatedExpiresAt = dto.expiresAt;
    }

    const updated = await this.prisma.opportunityPost.update({
      where: { id },
      data: {
        title: dto.title ?? post.title,
        body: dto.body ?? post.body,
        expiresAt: updatedExpiresAt,
      },
      include: { location: true, author: true, businessProfile: true, media: true },
    });

    return this.mapToDto(updated);
  }

  async complete(authorId: string, id: string): Promise<void> {
    const post = await this.prisma.opportunityPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException();
    if (post.authorId !== authorId) throw new ForbiddenException();

    await this.prisma.opportunityPost.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
  }

  async delete(authorId: string, id: string): Promise<void> {
    const post = await this.prisma.opportunityPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException();
    if (post.authorId !== authorId) throw new ForbiddenException();

    await this.prisma.opportunityPost.update({
      where: { id },
      data: { status: 'DELETED' },
    });
  }

  private mapToDto(post: PostWithRelations): NearbyItemDto {
    return {
      id: post.id,
      kind: NearbyItemKind.OPPORTUNITY_POST,
      title: post.title,
      body: post.body ?? undefined,
      subtype: post.type,
      status: post.status,
      location: {
        id: post.location.id,
        name: post.location.name,
        formattedAddress: post.location.formattedAddress ?? undefined,
      },
      author: {
        id: post.author.id,
        username: post.author.username,
        displayName: post.author.displayName ?? undefined,
      },
      postedAs: post.businessProfile
        ? {
            id: post.businessProfile.id,
            name: post.businessProfile.name,
          }
        : undefined,
      media: (post.media || []).map((m) => ({
        url: this.mediaUrlService.getMediaUrl(
          m.provider,
          m.fileId,
          m.mimeType,
          m.version ?? undefined,
          m.format ?? undefined,
        ),
        mimeType: m.mimeType,
      })),
      expiresAt: post.expiresAt ?? undefined,
      createdAt: post.createdAt,
    };
  }
}
