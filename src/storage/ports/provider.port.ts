import type { Readable } from 'stream';
import { StorageProvider as ProviderEnum } from '../../../generated/prisma/client.js';

/**
 * Result returned after a successful file persistence.
 */
export interface UploadResult {
  url: string;
  fileId: string;
  provider: ProviderEnum;
  mimeType: string;
  bytes?: number;
  width?: number;
  height?: number;
  duration?: number;
  version?: string;
  format?: string;
}

export interface UploadSignatureResult {
  signature: string;
  timestamp: number;
  apiKey?: string;
  cloudName?: string;
}

/**
 * Specific arguments required to perform an upload operation.
 * This is a DTO, not a class dependency.
 */
export interface UploadParams {
  /** The logical folder or bucket prefix */
  destination: string;
  /** The unique, sanitized name for the file */
  fileName: string;
  /** The raw file content as a stream */
  fileData: Readable;
}

export interface DeleteResult {
  success: boolean;
  message?: string;
}

/**
 * The Port (Interface) that defines how the application interacts with storage.
 */
export abstract class StorageProvider {
  /**
   * Persists a stream to the infrastructure layer.
   * @param params - The specific data needed for this upload instance.
   */
  abstract upload(params: UploadParams): Promise<UploadResult>;

  /**
   * Removes a file using the fileId returned during upload.
   * @param fileId - The unique management ID (Key or PublicID).
   */
  abstract delete(fileId: string): Promise<DeleteResult>;

  /**
   * Retrieves authoritative metadata for an asset directly from the provider.
   * @param fileId - The unique management ID (Key or PublicID).
   */
  abstract getMetadata(fileId: string): Promise<UploadResult | null>;

  /**
   * Generates a signed upload signature for direct-from-browser uploads.
   * Throws NotSupportedException if the provider does not support it.
   */
  abstract generateUploadSignature(
    folder: string,
    publicId: string,
    timestamp: number,
  ): Promise<UploadSignatureResult>;
}
