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
  include: { location: true; author: true; category: true; media: true };
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

    if (activeCount >= 5) {
      throw new ConflictException('You can only have a maximum of 5 active opportunity posts.');
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
          categoryId: dto.categoryId,
          title: dto.title,
          description: dto.description ?? null,
          price: dto.price ?? null,
          type: dto.type,
          locationId: dto.locationId,
          expiresAt,
        },
        include: {
          location: true,
          author: true,
          category: true,
          media: true,
        },
      });

      return this.mapToDto(post, authorId);
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new UnprocessableEntityException('The provided location does not exist.');
      }
      throw error;
    }
  }

  async getMyPosts(authorId: string): Promise<NearbyItemDto[]> {
    const posts = await this.prisma.opportunityPost.findMany({
      where: { authorId, status: { not: 'REMOVED' } },
      include: { location: true, author: true, category: true, media: true },
      orderBy: { createdAt: 'desc' },
    });
    return posts.map((p) => this.mapToDto(p, authorId));
  }

  async getById(id: string, viewerId?: string): Promise<NearbyItemDto> {
    const post = await this.prisma.opportunityPost.findUnique({
      where: { id },
      include: { location: true, author: true, category: true, media: true },
    });
    if (!post) throw new NotFoundException();
    return this.mapToDto(post, viewerId);
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

    let updated;
    try {
      updated = await this.prisma.opportunityPost.update({
        where: { id },
        data: {
          title: dto.title ?? post.title,
          description: dto.description ?? post.description,
          expiresAt: updatedExpiresAt,
          ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
          ...(dto.price !== undefined && { price: dto.price }),
        },
        include: { location: true, author: true, category: true, media: true },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new UnprocessableEntityException('The provided category does not exist.');
      }
      throw error;
    }

    return this.mapToDto(updated, authorId);
  }

  async complete(authorId: string, id: string): Promise<void> {
    const post = await this.prisma.opportunityPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException();
    if (post.authorId !== authorId) throw new ForbiddenException();

    await this.prisma.opportunityPost.update({
      where: { id },
      data: { status: 'FULFILLED' },
    });
  }

  async delete(authorId: string, id: string): Promise<void> {
    const post = await this.prisma.opportunityPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException();
    if (post.authorId !== authorId) throw new ForbiddenException();

    await this.prisma.opportunityPost.update({
      where: { id },
      data: {
        status: 'REMOVED',
        deletedAt: new Date(),
        deletedBy: authorId,
      },
    });
  }

  private mapToDto(post: PostWithRelations, viewerId?: string): NearbyItemDto {
    const isAuthor = viewerId === post.authorId;
    const isEditingOpen =
      new Date().getTime() - post.createdAt.getTime() <=
      OPPORTUNITY_TYPE_POLICIES[post.type].editWindowHours * 60 * 60 * 1000;

    const editableUntil = new Date(
      post.createdAt.getTime() +
        OPPORTUNITY_TYPE_POLICIES[post.type].editWindowHours * 60 * 60 * 1000,
    ).toISOString();

    let capabilities = {
      canReply: false,
      canEdit: false,
      canComplete: false,
      canDelete: false,
    };

    if (post.status === 'ACTIVE') {
      if (isAuthor) {
        capabilities = {
          canReply: false,
          canEdit: isEditingOpen,
          canComplete: true,
          canDelete: true,
        };
      } else {
        capabilities = {
          canReply: Boolean(viewerId),
          canEdit: false,
          canComplete: false,
          canDelete: false,
        };
      }
    } else if (post.status === 'FULFILLED' || post.status === 'EXPIRED') {
      if (isAuthor) {
        capabilities.canDelete = true;
      }
    }

    return {
      id: post.id,
      kind: NearbyItemKind.OPPORTUNITY_POST,
      title: post.title,
      description: post.description ?? undefined,
      price: post.price ? Number(post.price) : undefined,
      categoryId: post.categoryId,
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
      capabilities,
      editableUntil,
    };
  }
}
