import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as path from 'path';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { StorageProvider, UploadParams, UploadResult } from './ports/provider.port.js';

const MAGIC_PEEK_BYTES = 12;

/**
 * Verifies file integrity via magic numbers (byte checking).
 * Operates on just the first MAGIC_PEEK_BYTES bytes of the stream.
 */
function detectMimeType(head: Buffer): string | undefined {
  if (head.length < 4) return undefined;

  // --- IMAGES ---
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47)
    return 'image/png';
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  if (head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x38)
    return 'image/gif';
  if (
    head.length >= 12 &&
    head[0] === 0x52 &&
    head[1] === 0x49 &&
    head[2] === 0x46 &&
    head[3] === 0x46 &&
    head[8] === 0x57 &&
    head[9] === 0x45 &&
    head[10] === 0x42 &&
    head[11] === 0x50
  )
    return 'image/webp';

  // --- VIDEOS ---
  // WebM (EBML Header)
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3)
    return 'video/webm';

  // ISO Base Media (MP4 / MOV) - Check for 'ftyp' at bytes 4-7
  if (
    head.length >= 8 &&
    head[4] === 0x66 &&
    head[5] === 0x74 &&
    head[6] === 0x79 &&
    head[7] === 0x70
  ) {
    // QuickTime specific check: bytes 8-11 are 'qt  '
    if (
      head.length >= 12 &&
      head[8] === 0x71 &&
      head[9] === 0x74 &&
      head[10] === 0x20 &&
      head[11] === 0x20
    ) {
      return 'video/quicktime';
    }
    return 'video/mp4';
  }

  return undefined;
}

import { PassThrough } from 'stream';

/**
 * Accurately reads `n` bytes by accumulating chunks, resolving early if the stream ends.
 * It returns the `head` buffer for inspection, and a `newStream` that combines the peeked
 * data and the rest of the stream safely without using `unshift` on potentially ended streams.
 */
async function peekStream(
  stream: Readable,
  n: number,
): Promise<{ head: Buffer; newStream: Readable }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalLength = 0;

    const cleanup = () => {
      stream.removeListener('readable', onReadable);
      stream.removeListener('end', onEnd);
      stream.removeListener('error', onError);
    };

    const finalize = (head: Buffer) => {
      cleanup();
      const pt = new PassThrough();
      pt.write(head);
      stream.pipe(pt);
      resolve({ head, newStream: pt });
    };

    const onReadable = () => {
      while (totalLength < n) {
        const chunk = stream.read() as Buffer | null;
        if (chunk === null) break;
        chunks.push(chunk);
        totalLength += chunk.length;
      }

      if (totalLength >= n) {
        const fullBuffer = Buffer.concat(chunks);
        const head = fullBuffer.subarray(0, n);
        const remainder = fullBuffer.subarray(n);

        cleanup();
        const pt = new PassThrough();
        pt.write(head);
        if (remainder.length > 0) pt.write(remainder);
        stream.pipe(pt);

        resolve({ head, newStream: pt });
      }
    };

    const onEnd = () => {
      if (totalLength === 0) {
        cleanup();
        reject(new BadRequestException('File stream is empty.'));
        return;
      }
      finalize(Buffer.concat(chunks));
    };

    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    stream.on('readable', onReadable);
    stream.on('end', onEnd);
    stream.on('error', onError);

    stream.pause();
    onReadable();
  });
}

@Injectable()
export class MediaStorageService {
  private readonly logger = new Logger(MediaStorageService.name);

  private readonly allowedExtensions = [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.mp4',
    '.mov',
    '.webm',
  ];
  private readonly allowedMimeTypes = [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm',
  ];

  constructor(private readonly storageProvider: StorageProvider) {}

  public async uploadNewMedia(params: UploadParams): Promise<UploadResult> {
    const extension = path.extname(params.fileName).toLowerCase();

    if (!this.allowedExtensions.includes(extension)) {
      throw new BadRequestException(`${extension} is not a supported media format.`);
    }

    const { head, newStream } = await peekStream(params.fileData, MAGIC_PEEK_BYTES);

    const mime = detectMimeType(head);
    if (!mime || !this.allowedMimeTypes.includes(mime)) {
      throw new BadRequestException('The file content is not a valid or supported media type.');
    }

    const safeFileName = `${uuidv4()}${extension}`;

    return await this.storageProvider.upload({
      ...params,
      fileData: newStream,
      fileName: safeFileName,
    });
  }

  public async deleteMedia(fileId: string) {
    try {
      const result = await this.storageProvider.delete(fileId);
      if (!result.success) {
        this.logger.warn(`Media cleanup failed for ID: ${fileId}`);
      }
      return result;
    } catch (error) {
      this.logger.error(`Exception during cleanup for ID: ${fileId}`, error);
      return { success: false, message: 'Internal cleanup exception' };
    }
  }

  public async getMetadata(fileId: string): Promise<UploadResult | null> {
    return this.storageProvider.getMetadata(fileId);
  }

  public async generateUploadSignature(
    folder: string,
    publicId: string,
    timestamp: number,
    constraints?: import('./ports/provider.port.js').SignatureConstraints,
  ) {
    return this.storageProvider.generateUploadSignature(folder, publicId, timestamp, constraints);
  }
}
