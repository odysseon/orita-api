import { MediaRole } from '../types/media-role.enum.js';

export interface MediaPolicy {
  allowedFormats: string[];
  maxSizeBytes: number;
  allowedResourceTypes: ('image' | 'video')[];
  maxWidth?: number;
  maxHeight?: number;
  maxDurationSeconds?: number;
}

const MB = 1024 * 1024;

export const MEDIA_CONSTRAINTS: Record<MediaRole, MediaPolicy> = {
  [MediaRole.AVATAR]: {
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    maxSizeBytes: 5 * MB,
    allowedResourceTypes: ['image'],
    maxWidth: 4096,
    maxHeight: 4096,
  },
  [MediaRole.LOGO]: {
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    maxSizeBytes: 5 * MB,
    allowedResourceTypes: ['image'],
    maxWidth: 4096,
    maxHeight: 4096,
  },
  [MediaRole.BANNER]: {
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    maxSizeBytes: 10 * MB,
    allowedResourceTypes: ['image'],
    maxWidth: 6000,
    maxHeight: 4000,
  },
  [MediaRole.COVER]: {
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    maxSizeBytes: 10 * MB,
    allowedResourceTypes: ['image'],
    maxWidth: 6000,
    maxHeight: 4000,
  },
  [MediaRole.GALLERY]: {
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov'],
    maxSizeBytes: 50 * MB,
    allowedResourceTypes: ['image', 'video'],
    maxWidth: 6000,
    maxHeight: 4000,
    maxDurationSeconds: 300, // 5 minutes
  },
  [MediaRole.MESSAGE]: {
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov'],
    maxSizeBytes: 50 * MB,
    allowedResourceTypes: ['image', 'video'],
    maxWidth: 6000,
    maxHeight: 4000,
    maxDurationSeconds: 300, // 5 minutes
  },
};
