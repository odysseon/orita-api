import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AdminGuard } from '../../../../shared/decorators/admin-guard.decorator.js';
import { CreateCategoryUseCase } from '../../application/use-cases/create-category.use-case.js';
import { UpdateCategoryUseCase } from '../../application/use-cases/update-category.use-case.js';
import { DeactivateCategoryUseCase } from '../../application/use-cases/deactivate-category.use-case.js';
import { GetCategoryUseCase } from '../../application/use-cases/get-category.use-case.js';
import { GetCategoryTreeUseCase } from '../../application/use-cases/get-category-tree.use-case.js';
import { ICategoryRepository } from '../../domain/ports/category.repository.port.js';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateCategoryAttributeDto,
  UpdateCategoryAttributeDto,
} from '../dto/request.dto.js';
import { CategoryResponseDto, CategoryTreeNodeDto } from '../dto/response.dto.js';
import { toCategoryView } from '../../domain/types/category.types.js';
import { CreateCategoryAttributeUseCase } from '../../application/use-cases/create-category-attribute.use-case.js';
import { UpdateCategoryAttributeUseCase } from '../../application/use-cases/update-category-attribute.use-case.js';
import { DeleteCategoryAttributeUseCase } from '../../application/use-cases/delete-category-attribute.use-case.js';
import { ApiBearerAuth } from '@nestjs/swagger';

/**
 * Admin-only category management endpoints.
 * All routes require ADMIN platform role.
 *
 * GET    /admin/categories           — full tree (including inactive)
 * POST   /admin/categories           — create root or leaf
 * GET    /admin/categories/:id       — single category
 * PATCH  /admin/categories/:id       — update name/description/order
 * POST   /admin/categories/:id/deactivate — soft-disable
 * POST   /admin/categories/:id/activate   — re-enable
 * DELETE /admin/categories/:id       — hard delete (only if no assignments)
 * POST   /admin/categories/:id/attributes — add attribute
 * PATCH  /admin/categories/:id/attributes/:attrId — update attribute
 * DELETE /admin/categories/:id/attributes/:attrId — delete attribute
 */
@ApiBearerAuth()
@Controller('admin/categories')
@AdminGuard()
export class CategoryController {
  constructor(
    private readonly createCategory: CreateCategoryUseCase,
    private readonly updateCategory: UpdateCategoryUseCase,
    private readonly deactivateCategory: DeactivateCategoryUseCase,
    private readonly getCategory: GetCategoryUseCase,
    private readonly getCategoryTree: GetCategoryTreeUseCase,
    private readonly categoryRepo: ICategoryRepository,
    private readonly createAttribute: CreateCategoryAttributeUseCase,
    private readonly updateAttribute: UpdateCategoryAttributeUseCase,
    private readonly deleteAttribute: DeleteCategoryAttributeUseCase,
  ) {}

  @Get()
  async getTree(): Promise<CategoryTreeNodeDto[]> {
    const tree = await this.getCategoryTree.execute(false); // admin sees all
    return tree.map((node) => CategoryTreeNodeDto.from(node));
  }

  @Post()
  async create(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const category = await this.createCategory.execute(dto);
    return CategoryResponseDto.from(toCategoryView(category));
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<CategoryResponseDto> {
    const view = await this.getCategory.byId(id);
    return CategoryResponseDto.from(view);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.updateCategory.execute(id, dto);
    return CategoryResponseDto.from(toCategoryView(category));
  }

  @Post(':id/deactivate')
  async deactivate(@Param('id') id: string): Promise<CategoryResponseDto> {
    const category = await this.deactivateCategory.execute(id);
    return CategoryResponseDto.from(toCategoryView(category));
  }

  @Post(':id/activate')
  async activate(@Param('id') id: string): Promise<CategoryResponseDto> {
    const existing = await this.getCategory.byId(id);
    if (existing.isActive) {
      throw new BadRequestException('Category is already active.');
    }
    const category = await this.categoryRepo.activate(id);
    return CategoryResponseDto.from(toCategoryView(category));
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ deleted: true }> {
    const existing = await this.getCategory.byId(id);
    const hasAssignments = await this.categoryRepo.hasAssignments(existing.id);
    if (hasAssignments) {
      throw new ConflictException(
        'Cannot hard-delete a category with existing assignments. Deactivate it instead.',
      );
    }
    // Also block deletion of root categories that have children
    if (!existing.parentId) {
      const tree = await this.getCategoryTree.execute(false);
      const node = tree.find((n) => n.id === existing.id);
      if (node && node.children.length > 0) {
        throw new ConflictException(
          'Cannot delete a root category that has children. Delete or reassign children first.',
        );
      }
    }
    await this.categoryRepo.delete(existing.id);
    return { deleted: true };
  }

  // ---------------------------------------------------------------------------
  // Category Attributes
  // ---------------------------------------------------------------------------

  @Post(':id/attributes')
  async addAttribute(@Param('id') id: string, @Body() dto: CreateCategoryAttributeDto) {
    return this.createAttribute.execute(id, dto);
  }

  @Patch(':id/attributes/:attrId')
  async editAttribute(
    @Param('id') id: string,
    @Param('attrId') attrId: string,
    @Body() dto: UpdateCategoryAttributeDto,
  ) {
    return this.updateAttribute.execute(id, attrId, dto);
  }

  @Delete(':id/attributes/:attrId')
  async removeAttribute(@Param('id') id: string, @Param('attrId') attrId: string) {
    await this.deleteAttribute.execute(id, attrId);
    return { deleted: true };
  }
}
