import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Public } from '@odysseon/whoami-adapter-nestjs';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminGuard } from '../../../../shared/decorators/admin-guard.decorator.js';
import { CreateTagUseCase } from '../../application/use-cases/create-tag.use-case.js';
import { DeleteTagUseCase } from '../../application/use-cases/delete-tag.use-case.js';
import { GetTagUseCase } from '../../application/use-cases/get-tag.use-case.js';
import { ListTagsUseCase } from '../../application/use-cases/list-tags.use-case.js';
import { UpdateTagUseCase } from '../../application/use-cases/update-tag.use-case.js';
import { CreateTagRequestDto, UpdateTagRequestDto } from '../dto/request.dto.js';
import { PaginatedTagsResponseDto, TagResponseDto } from '../dto/response.dto.js';

@ApiTags('Tags')
@ApiBearerAuth()
@Controller('tags')
export class TagController {
  constructor(
    private readonly createTagUseCase: CreateTagUseCase,
    private readonly getTagUseCase: GetTagUseCase,
    private readonly updateTagUseCase: UpdateTagUseCase,
    private readonly deleteTagUseCase: DeleteTagUseCase,
    private readonly listTagsUseCase: ListTagsUseCase,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List or search tags' })
  @ApiResponse({ status: 200, type: PaginatedTagsResponseDto })
  async listTags(
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedTagsResponseDto> {
    const page = parseInt(pageRaw ?? '1', 10);
    const limitNum = parseInt(limitRaw ?? '20', 10);
    const limit = isNaN(limitNum) ? 20 : limitNum;
    const result = await this.listTagsUseCase.execute(page, limit, search);
    return PaginatedTagsResponseDto.from(result);
  }

  @Get(':idOrSlug')
  @Public()
  @ApiOperation({ summary: 'Get a tag by ID or slug' })
  @ApiResponse({ status: 200, type: TagResponseDto })
  async getTag(@Param('idOrSlug') idOrSlug: string): Promise<TagResponseDto> {
    const tag = await this.getTagUseCase.execute(idOrSlug);
    return TagResponseDto.from(tag);
  }

  @Post()
  @AdminGuard()
  @ApiOperation({ summary: 'Create a new tag (Moderator/Admin)' })
  @ApiResponse({ status: 201, type: TagResponseDto })
  async createTag(@Body() dto: CreateTagRequestDto): Promise<TagResponseDto> {
    const tag = await this.createTagUseCase.execute(dto);
    return TagResponseDto.from(tag);
  }

  @Put(':id')
  @AdminGuard()
  @ApiOperation({ summary: 'Update an existing tag (Moderator/Admin)' })
  @ApiResponse({ status: 200, type: TagResponseDto })
  async updateTag(
    @Param('id') id: string,
    @Body() dto: UpdateTagRequestDto,
  ): Promise<TagResponseDto> {
    const tag = await this.updateTagUseCase.execute(id, dto);
    return TagResponseDto.from(tag);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AdminGuard()
  @ApiOperation({ summary: 'Delete a tag (Moderator/Admin)' })
  @ApiResponse({ status: 204 })
  async deleteTag(@Param('id') id: string): Promise<void> {
    await this.deleteTagUseCase.execute(id);
  }
}
