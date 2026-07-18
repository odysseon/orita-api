import { Category } from '../types/category.entity.js';
import {
  CategoryTreeNode,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../types/category.types.js';

/**
 * Port: persistence contract for categories.
 *
 * Zone 0 (domain) — implemented in Zone 3 (infrastructure).
 * Abstract class so it survives TypeScript erasure and acts as injection token.
 */
export abstract class ICategoryRepository {
  abstract create(input: CreateCategoryInput, slug: string): Promise<Category>;

  abstract findById(id: string): Promise<Category | null>;

  abstract findBySlug(slug: string): Promise<Category | null>;

  abstract isSlugTaken(slug: string): Promise<boolean>;

  /**
   * Return all root categories with their active leaf children.
   * Ordered by root.order ASC, then child.order ASC.
   */
  abstract findTree(activeOnly?: boolean): Promise<CategoryTreeNode[]>;

  /**
   * Return all leaf IDs whose parent has the given slug.
   * Used to resolve rootSlug → set of leaf categoryIds for discovery queries.
   */
  abstract findLeafIdsByRootSlug(rootSlug: string): Promise<string[]>;

  abstract update(id: string, input: UpdateCategoryInput): Promise<Category>;

  abstract deactivate(id: string): Promise<Category>;

  abstract activate(id: string): Promise<Category>;

  /** Returns true if a BusinessProfile or Listing references this category id. */
  abstract hasAssignments(id: string): Promise<boolean>;

  abstract delete(id: string): Promise<void>;

  // ---------------------------------------------------------------------------
  // Category Attributes
  // ---------------------------------------------------------------------------

  abstract findAttributesByCategoryId(
    categoryId: string,
  ): Promise<import('../types/category-attribute.entity.js').CategoryAttribute[]>;

  abstract createAttribute(
    input: import('../types/category.types.js').CreateCategoryAttributeInput,
  ): Promise<import('../types/category-attribute.entity.js').CategoryAttribute>;

  abstract updateAttribute(
    id: string,
    input: import('../types/category.types.js').UpdateCategoryAttributeInput,
  ): Promise<import('../types/category-attribute.entity.js').CategoryAttribute>;

  abstract deleteAttribute(id: string): Promise<void>;
}
