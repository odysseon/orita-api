import { IsArray, IsString, ArrayMinSize, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Media } from '../../domain/types/media.entity.js';
import { MediaType } from '../../domain/types/media-type.enum.js';
import { MediaRole } from '../../domain/types/media-role.enum.js';

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export class UploadIntentRequestDto {
  @ApiProperty({ enum: MediaRole, description: 'Semantic role of the media item.' })
  @IsEnum(MediaRole)
  role!: MediaRole;
}

export class ConsumeIntentRequestDto {
  @IsString()
  intentId!: string;

  @IsString()
  publicId!: string;

  @IsString()
  version!: string;
}

export class UploadIntentResponseDto {
  signature!: string;
  timestamp!: number;
  apiKey?: string;
  cloudName?: string;
  intentId!: string;
  folder!: string;
  publicId!: string;
}

export class ReorderMediaDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderedIds!: string[];
}

// ---------------------------------------------------------------------------
// Response — single item
// ---------------------------------------------------------------------------

export class MediaResponseDto {
  id: string;
  url: string;
  mediaType: MediaType;
  role: MediaRole;
  /** Null for singleton roles (LOGO, BANNER, COVER). */
  order: number | null;
  createdAt: string;

  private constructor(media: Media) {
    this.id = media.id;
    this.url = media.url;
    this.mediaType = media.mediaType;
    this.role = media.role;
    this.order = media.order;
    this.createdAt = new Date(media.createdAt).toISOString();
  }

  static from(media: Media): MediaResponseDto {
    return new MediaResponseDto(media);
  }
}

// ---------------------------------------------------------------------------
// Response — grouped by role (BusinessProfile storefront)
// ---------------------------------------------------------------------------

export class BusinessProfileMediaDto {
  /** Primary brand image — square identity mark. Null if not yet uploaded. */
  logo: MediaResponseDto | null;
  /** Wide hero image — storefront backdrop. Null if not yet uploaded. */
  banner: MediaResponseDto | null;
  /** Supplementary gallery images and videos. Ordered by position. */
  gallery: MediaResponseDto[];

  private constructor(
    logo: MediaResponseDto | null,
    banner: MediaResponseDto | null,
    gallery: MediaResponseDto[],
  ) {
    this.logo = logo;
    this.banner = banner;
    this.gallery = gallery;
  }

  static from(items: Media[]): BusinessProfileMediaDto {
    const logo = items.find((m) => m.role === MediaRole.LOGO);
    const banner = items.find((m) => m.role === MediaRole.BANNER);
    const gallery = items
      .filter((m) => m.role === MediaRole.GALLERY)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return new BusinessProfileMediaDto(
      logo ? MediaResponseDto.from(logo) : null,
      banner ? MediaResponseDto.from(banner) : null,
      gallery.map((item) => MediaResponseDto.from(item)),
    );
  }
}

// ---------------------------------------------------------------------------
// Response — grouped by role (Listing storefront)
// ---------------------------------------------------------------------------

export class ListingMediaDto {
  /** Primary listing image — shown in discovery cards. Null if not yet uploaded. */
  cover: MediaResponseDto | null;
  /** Supplementary gallery images and videos. Ordered by position. */
  gallery: MediaResponseDto[];

  private constructor(cover: MediaResponseDto | null, gallery: MediaResponseDto[]) {
    this.cover = cover;
    this.gallery = gallery;
  }

  static from(items: Media[]): ListingMediaDto {
    const cover = items.find((m) => m.role === MediaRole.COVER);
    const gallery = items
      .filter((m) => m.role === MediaRole.GALLERY)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return new ListingMediaDto(
      cover ? MediaResponseDto.from(cover) : null,
      gallery.map((item) => MediaResponseDto.from(item)),
    );
  }
}

// ---------------------------------------------------------------------------
// Response — grouped by role (Review — gallery only)
// ---------------------------------------------------------------------------

export class ReviewMediaDto {
  /**
   * Raw, user-uploaded photos attached to this review.
   * Gallery-ordered. No logo/banner/cover slots — reviews are unprocessed.
   */
  gallery: MediaResponseDto[];

  private constructor(gallery: MediaResponseDto[]) {
    this.gallery = gallery;
  }

  static from(items: Media[]): ReviewMediaDto {
    const gallery = items
      .filter((m) => m.role === MediaRole.GALLERY)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return new ReviewMediaDto(gallery.map((item) => MediaResponseDto.from(item)));
  }
}

// ---------------------------------------------------------------------------
// Response — grouped by role (BusinessTour — gallery only)
// ---------------------------------------------------------------------------

export class BusinessTourMediaDto {
  /**
   * Raw, user-uploaded photos and videos attached to this store tour.
   * Gallery-ordered. No logo/banner/cover slots.
   */
  gallery: MediaResponseDto[];

  private constructor(gallery: MediaResponseDto[]) {
    this.gallery = gallery;
  }

  static from(items: Media[]): BusinessTourMediaDto {
    const gallery = items
      .filter((m) => m.role === MediaRole.GALLERY)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return new BusinessTourMediaDto(gallery.map((item) => MediaResponseDto.from(item)));
  }
}
