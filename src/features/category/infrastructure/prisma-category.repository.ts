import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { RedisService } from '../../../shared/redis/redis.service.js';
import { ICategoryRepository } from '../domain/ports/category.repository.port.js';
import { Category } from '../domain/types/category.entity.js';
import {
  CategoryTreeNode,
  CategoryLeaf,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../domain/types/category.types.js';

// ---------------------------------------------------------------------------
// Local Prisma type alias (pre-migration guard)
// ---------------------------------------------------------------------------
type PrismaCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  parent?: PrismaCategory | null;
};

function toDomain(raw: PrismaCategory): Category {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    parentId: raw.parentId,
    order: raw.order,
    isActive: raw.isActive,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    ...(raw.parent !== undefined && { parent: raw.parent ? toDomain(raw.parent) : null }),
  };
}

@Injectable()
export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  private getCacheKey(id: string): string {
    return `category:id:${id}`;
  }

  private getSlugCacheKey(slug: string): string {
    return `category:slug:${slug}`;
  }

  private getTreeCacheKey(activeOnly: boolean): string {
    return `category:tree:active:${activeOnly}`;
  }

  private updateCacheAsync(category: Category): void {
    Promise.resolve()
      .then(async () => {
        await this.redisService.set(this.getCacheKey(category.id), category);
        await this.redisService.set(this.getSlugCacheKey(category.slug), category);
        await this.redisService.delPattern('category:tree:*');
      })
      .catch(() => {});
  }

  private deleteCacheAsync(id: string, slug: string): void {
    Promise.resolve()
      .then(async () => {
        await this.redisService.del(this.getCacheKey(id));
        await this.redisService.del(this.getSlugCacheKey(slug));
        await this.redisService.delPattern('category:tree:*');
      })
      .catch(() => {});
  }

  async create(input: CreateCategoryInput, slug: string): Promise<Category> {
    const raw = await this.prisma.category.create({
      data: {
        name: input.name,
        slug,
        description: input.description ?? null,
        parentId: input.parentId ?? null,
        order: input.order ?? 0,
      },
    });
    const domain = toDomain(raw);
    this.updateCacheAsync(domain);
    return domain;
  }

  async findById(id: string): Promise<Category | null> {
    const cached = await this.redisService.get<Category>(this.getCacheKey(id));
    if (cached) return cached;

    const raw = await this.prisma.category.findUnique({ where: { id } });
    const domain = raw ? toDomain(raw) : null;
    if (domain) this.updateCacheAsync(domain);
    return domain;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const cached = await this.redisService.get<Category>(this.getSlugCacheKey(slug));
    if (cached) return cached;

    const raw = await this.prisma.category.findUnique({ where: { slug } });
    const domain = raw ? toDomain(raw) : null;
    if (domain) this.updateCacheAsync(domain);
    return domain;
  }

  async isSlugTaken(slug: string): Promise<boolean> {
    const count = await this.prisma.category.count({ where: { slug } });
    return count > 0;
  }

  async findTree(activeOnly = true): Promise<CategoryTreeNode[]> {
    const cacheKey = this.getTreeCacheKey(activeOnly);
    const cached = await this.redisService.get<CategoryTreeNode[]>(cacheKey);
    if (cached) return cached;

    // Fetch all roots + their children in one query via Prisma nested include
    const roots = await this.prisma.category.findMany({
      where: {
        parentId: null,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { order: 'asc' },
      include: {
        children: {
          where: activeOnly ? { isActive: true } : {},
          orderBy: { order: 'asc' },
        },
      },
    });

    const result = (roots as unknown as (PrismaCategory & { children: PrismaCategory[] })[]).map(
      (root): CategoryTreeNode => ({
        id: root.id,
        name: root.name,
        slug: root.slug,
        description: root.description,
        order: root.order,
        isActive: root.isActive,
        children: root.children.map((child): CategoryLeaf => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          description: child.description,
          order: child.order,
          isActive: child.isActive,
        })),
      }),
    );

    Promise.resolve()
      .then(() => this.redisService.set(cacheKey, result))
      .catch(() => {});
    return result;
  }

  async findLeafIdsByRootSlug(rootSlug: string): Promise<string[]> {
    const root = await this.prisma.category.findUnique({
      where: { slug: rootSlug },
      select: { id: true },
    });
    if (!root) return [];

    const leaves = await this.prisma.category.findMany({
      where: { parentId: root.id, isActive: true },
      select: { id: true },
    });
    return leaves.map((l) => l.id);
  }

  async update(id: string, input: UpdateCategoryInput): Promise<Category> {
    const raw = await this.prisma.category.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.order !== undefined ? { order: input.order } : {}),
      },
    });
    const domain = toDomain(raw);
    this.updateCacheAsync(domain);
    return domain;
  }

  async deactivate(id: string): Promise<Category> {
    const raw = await this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
    const domain = toDomain(raw);
    this.updateCacheAsync(domain);
    return domain;
  }

  async activate(id: string): Promise<Category> {
    const raw = await this.prisma.category.update({
      where: { id },
      data: { isActive: true },
    });
    const domain = toDomain(raw);
    this.updateCacheAsync(domain);
    return domain;
  }

  async hasAssignments(id: string): Promise<boolean> {
    const [bpCount, listingCount] = await Promise.all([
      this.prisma.businessProfile.count({ where: { categories: { some: { categoryId: id } } } }),
      this.prisma.listing.count({ where: { categoryId: id } }),
    ]);
    return bpCount > 0 || listingCount > 0;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) return;

    await this.prisma.category.delete({ where: { id } });
    this.deleteCacheAsync(existing.id, existing.slug);
  }

  // ---------------------------------------------------------------------------
  // Category Attributes
  // ---------------------------------------------------------------------------

  async findAttributesByCategoryId(
    categoryId: string,
  ): Promise<import('../domain/types/category-attribute.entity.js').CategoryAttribute[]> {
    const rows = await this.prisma.categoryAttribute.findMany({
      where: { categoryId },
      orderBy: { displayOrder: 'asc' },
    });

    return rows.map((r) => ({
      ...r,
      type: r.type as import('../domain/types/category-attribute.entity.js').AttributeType,
      options: r.options ? (r.options as string[]) : null,
    }));
  }

  async createAttribute(
    input: import('../domain/types/category.types.js').CreateCategoryAttributeInput & {
      categoryId: string;
    },
  ): Promise<import('../domain/types/category-attribute.entity.js').CategoryAttribute> {
    const raw = await this.prisma.categoryAttribute.create({
      data: {
        categoryId: input.categoryId,
        key: input.key,
        label: input.label,
        type: input.type,
        isRequired: input.isRequired ?? false,
        displayOrder: input.displayOrder ?? 0,
        options: input.options ? input.options : Prisma.DbNull,
      },
    });

    return {
      ...raw,
      type: raw.type as import('../domain/types/category-attribute.entity.js').AttributeType,
      options: raw.options ? (raw.options as string[]) : null,
    };
  }

  async updateAttribute(
    id: string,
    input: import('../domain/types/category.types.js').UpdateCategoryAttributeInput,
  ): Promise<import('../domain/types/category-attribute.entity.js').CategoryAttribute> {
    const raw = await this.prisma.categoryAttribute.update({
      where: { id },
      data: {
        ...(input.label !== undefined && { label: input.label }),
        ...(input.isRequired !== undefined && { isRequired: input.isRequired }),
        ...(input.displayOrder !== undefined && { displayOrder: input.displayOrder }),
        ...(input.options !== undefined && {
          options: input.options === null ? Prisma.DbNull : input.options,
        }),
      },
    });

    return {
      ...raw,
      type: raw.type as import('../domain/types/category-attribute.entity.js').AttributeType,
      options: raw.options ? (raw.options as string[]) : null,
    };
  }

  async deleteAttribute(id: string): Promise<void> {
    await this.prisma.categoryAttribute.delete({ where: { id } });
  }
}
