import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BusinessProfileView,
  BusinessSummary,
  PaginatedBusinessSummaries,
} from '../../domain/types/business-profile.types.js';
import { VerificationStatus } from '../../domain/types/verification-status.enum.js';
import { OperatingHoursDto } from './operating-hours.dto.js';
import { TagDto } from './tag.dto.js';

export class BusinessProfileResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() ownerId: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty() isPublic: boolean;
  @ApiProperty({ enum: VerificationStatus }) verificationStatus: VerificationStatus;
  @ApiProperty() businessType: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiPropertyOptional({ nullable: true }) phoneNumber: string | null;
  @ApiPropertyOptional({ nullable: true }) whatsapp: string | null;
  @ApiPropertyOptional({ nullable: true }) email: string | null;
  @ApiPropertyOptional({ nullable: true }) location: string | null;
  @ApiPropertyOptional({ nullable: true }) latitude: number | null;
  @ApiPropertyOptional({ nullable: true }) longitude: number | null;
  @ApiProperty({ type: [String] }) categoryIds: string[];
  @ApiProperty() isEmailVerified: boolean;
  @ApiProperty() isPhoneVerified: boolean;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;

  @ApiPropertyOptional({ type: [OperatingHoursDto] }) operatingHours?: OperatingHoursDto[];
  @ApiPropertyOptional({ type: [TagDto] }) tags?: TagDto[];
  @ApiPropertyOptional() avatarUrl?: string;
  @ApiPropertyOptional() coverUrl?: string;
  @ApiProperty({
    example: true,
    description: 'Whether the current user follows this business',
    required: false,
  })
  isFollowed?: boolean;

  private constructor(r: BusinessProfileView & { isFollowed?: boolean }) {
    this.id = r.id;
    this.ownerId = r.ownerId;
    this.name = r.name;
    this.slug = r.slug;
    this.isPublic = r.isPublic;
    this.verificationStatus = r.verificationStatus;
    this.businessType = r.businessType;
    this.description = r.description;
    this.phoneNumber = r.phoneNumber;
    this.whatsapp = r.whatsapp;
    this.email = r.email;
    this.location = r.location;
    this.latitude = r.latitude;
    this.longitude = r.longitude;
    this.categoryIds = r.categoryIds;
    this.isEmailVerified = r.isEmailVerified;
    this.isPhoneVerified = r.isPhoneVerified;
    this.createdAt = new Date(r.createdAt).toISOString();
    this.updatedAt = new Date(r.updatedAt).toISOString();

    if (r.avatarUrl) this.avatarUrl = r.avatarUrl;
    if (r.coverUrl) this.coverUrl = r.coverUrl;

    if (r.operatingHours) {
      this.operatingHours = r.operatingHours.map((h) => OperatingHoursDto.from(h));
    }
    if (r.tags) {
      this.tags = r.tags.map((t) => TagDto.from(t));
    }
    if (r.isFollowed !== undefined) {
      this.isFollowed = r.isFollowed;
    }
  }

  static from(r: BusinessProfileView): BusinessProfileResponseDto {
    return new BusinessProfileResponseDto(r);
  }
}

export class BusinessSummaryResponseDto {
  id: string;
  name: string;
  slug: string;
  verificationStatus: string;
  description: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  categoryIds: string[];
  distanceKm?: number;
  @ApiPropertyOptional() isFollowed?: boolean;

  private constructor(summary: BusinessSummary) {
    this.id = summary.id;
    this.name = summary.name;
    this.slug = summary.slug;
    this.verificationStatus = summary.verificationStatus;
    this.description = summary.description;
    this.location = summary.location;
    this.latitude = summary.latitude;
    this.longitude = summary.longitude;
    this.categoryIds = summary.categoryIds;
    if (summary.distanceKm !== undefined) {
      this.distanceKm = summary.distanceKm;
    }
    if (summary.isFollowed !== undefined) {
      this.isFollowed = summary.isFollowed;
    }
  }

  static from(summary: BusinessSummary): BusinessSummaryResponseDto {
    return new BusinessSummaryResponseDto(summary);
  }
}

export class PaginatedBusinessesResponseDto {
  items: BusinessSummaryResponseDto[];
  total: number;
  page: number;
  limit: number;

  private constructor(paginated: PaginatedBusinessSummaries) {
    this.items = paginated.items.map((s) => BusinessSummaryResponseDto.from(s));
    this.total = paginated.total;
    this.page = paginated.page;
    this.limit = paginated.limit;
  }

  static from(paginated: PaginatedBusinessSummaries): PaginatedBusinessesResponseDto {
    return new PaginatedBusinessesResponseDto(paginated);
  }
}

export class DashboardStatsResponseDto {
  @ApiProperty()
  totalListings!: number;

  @ApiProperty()
  profileViews!: number;

  @ApiProperty()
  totalSaves!: number;

  @ApiProperty()
  totalContactClicks!: number;
}
