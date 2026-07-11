import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BusinessTourStatus,
  BusinessTourMediaItem,
} from '../../domain/types/business-tour.entity.js';
import {
  PaginatedBusinessTours,
  BusinessTourView,
  BusinessTourSummary,
  PaginatedBusinessToursSummary,
} from '../../domain/types/business-tour.types.js';

export class BusinessTourHighlightDto {
  @ApiProperty() id: string;
  @ApiProperty() value: string;

  private constructor(h: { id: string; value: string }) {
    this.id = h.id;
    this.value = h.value;
  }

  static from(h: { id: string; value: string }) {
    return new BusinessTourHighlightDto(h);
  }
}

export class BusinessTourMediaItemDto {
  @ApiProperty() id: string;
  @ApiProperty() url: string;
  @ApiProperty() mediaType: string;
  @ApiPropertyOptional({ nullable: true }) order: number | null;
  @ApiProperty() createdAt: string;

  private constructor(m: BusinessTourMediaItem) {
    this.id = m.id;
    this.url = m.url;
    this.mediaType = m.mediaType;
    this.order = m.order;
    this.createdAt = new Date(m.createdAt).toISOString();
  }

  static from(m: BusinessTourMediaItem): BusinessTourMediaItemDto {
    return new BusinessTourMediaItemDto(m);
  }
}

export class BusinessTourResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() businessProfileId: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional({ nullable: true }) summary: string | null;
  @ApiProperty() visitDate: string;
  @ApiProperty({ enum: BusinessTourStatus }) status: BusinessTourStatus;
  @ApiPropertyOptional({ nullable: true }) publishedAt: string | null;
  @ApiProperty() createdById: string;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
  @ApiProperty({ type: [BusinessTourHighlightDto] }) highlights: BusinessTourHighlightDto[];
  @ApiProperty({ type: [BusinessTourMediaItemDto] }) media: BusinessTourMediaItemDto[];

  private constructor(tour: BusinessTourView) {
    this.id = tour.id;
    this.businessProfileId = tour.businessProfileId;
    this.title = tour.title;
    this.summary = tour.summary;
    this.visitDate = new Date(tour.visitDate).toISOString();
    this.status = tour.status;
    this.publishedAt = tour.publishedAt ? new Date(tour.publishedAt).toISOString() : null;
    this.createdById = tour.createdById;
    this.createdAt = new Date(tour.createdAt).toISOString();
    this.updatedAt = new Date(tour.updatedAt).toISOString();
    this.highlights = tour.highlights.map((h) => BusinessTourHighlightDto.from(h));
    this.media = tour.media.map((m) => BusinessTourMediaItemDto.from(m));
  }

  static from(tour: BusinessTourView): BusinessTourResponseDto {
    return new BusinessTourResponseDto(tour);
  }
}

export class PaginatedBusinessToursResponseDto {
  @ApiProperty({ type: [BusinessTourResponseDto] }) items: BusinessTourResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;

  private constructor(paginated: PaginatedBusinessTours) {
    this.items = paginated.items.map((i) => BusinessTourResponseDto.from(i));
    this.total = paginated.total;
    this.page = paginated.page;
    this.limit = paginated.limit;
  }

  static from(paginated: PaginatedBusinessTours): PaginatedBusinessToursResponseDto {
    return new PaginatedBusinessToursResponseDto(paginated);
  }
}

export class BusinessTourSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() businessProfileId: string;
  @ApiProperty() businessProfileSlug: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional({ nullable: true }) summary: string | null;
  @ApiProperty() visitDate: string;
  @ApiProperty({ enum: BusinessTourStatus }) status: BusinessTourStatus;
  @ApiPropertyOptional({ nullable: true }) publishedAt: string | null;
  @ApiPropertyOptional() coverUrl?: string;
  @ApiPropertyOptional() distanceKm?: number;

  private constructor(tour: BusinessTourSummary) {
    this.id = tour.id;
    this.businessProfileId = tour.businessProfileId;
    this.businessProfileSlug = tour.businessProfileSlug;
    this.title = tour.title;
    this.summary = tour.summary;
    this.visitDate = new Date(tour.visitDate).toISOString();
    this.status = tour.status;
    this.publishedAt = tour.publishedAt ? new Date(tour.publishedAt).toISOString() : null;
    if (tour.coverUrl !== undefined) this.coverUrl = tour.coverUrl;
    if (tour.distanceKm !== undefined) this.distanceKm = tour.distanceKm;
  }

  static from(tour: BusinessTourSummary): BusinessTourSummaryDto {
    return new BusinessTourSummaryDto(tour);
  }
}

export class PaginatedBusinessToursSummaryResponseDto {
  @ApiProperty({ type: [BusinessTourSummaryDto] }) items: BusinessTourSummaryDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;

  private constructor(paginated: PaginatedBusinessToursSummary) {
    this.items = paginated.items.map((i) => BusinessTourSummaryDto.from(i));
    this.total = paginated.total;
    this.page = paginated.page;
    this.limit = paginated.limit;
  }

  static from(paginated: PaginatedBusinessToursSummary): PaginatedBusinessToursSummaryResponseDto {
    return new PaginatedBusinessToursSummaryResponseDto(paginated);
  }
}
