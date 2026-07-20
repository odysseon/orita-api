import { Module, forwardRef } from '@nestjs/common';
import { MessagingModule } from '../messaging/messaging.module.js';
import { IMediaRepository } from './domain/ports/media.repository.port.js';
import { PrismaMediaRepository } from './infrastructure/prisma-media.repository.js';
import { AddMediaUseCase } from './application/use-cases/add-media.use-case.js';
import { DeleteMediaUseCase } from './application/use-cases/delete-media.use-case.js';
import { ReorderMediaUseCase } from './application/use-cases/reorder-media.use-case.js';
import { GetResourceMediaUseCase } from './application/use-cases/get-resource-media.use-case.js';
import { MediaController } from './api/controllers/media.controller.js';

import { PrismaUploadIntentRepository } from './infrastructure/prisma-upload-intent.repository.js';
import { IUploadIntentRepository } from './domain/ports/upload-intent.repository.port.js';
import { GenerateUploadIntentUseCase } from './application/use-cases/generate-upload-intent.use-case.js';
import { ConsumeUploadIntentUseCase } from './application/use-cases/consume-upload-intent.use-case.js';
import { FinalizeMessageAttachmentsUseCase } from './application/use-cases/finalize-message-attachments.use-case.js';
import { MediaUrlService } from './application/services/media-url.service.js';
import { OrphanCleanupJob } from './application/jobs/orphan-cleanup.job.js';

@Module({
  imports: [forwardRef(() => MessagingModule)],
  controllers: [MediaController],
  providers: [
    {
      provide: IMediaRepository,
      useClass: PrismaMediaRepository,
    },
    {
      provide: IUploadIntentRepository,
      useClass: PrismaUploadIntentRepository,
    },
    AddMediaUseCase,
    DeleteMediaUseCase,
    ReorderMediaUseCase,
    GetResourceMediaUseCase,
    GenerateUploadIntentUseCase,
    ConsumeUploadIntentUseCase,
    FinalizeMessageAttachmentsUseCase,
    MediaUrlService,
    OrphanCleanupJob,
  ],
  exports: [
    AddMediaUseCase,
    DeleteMediaUseCase,
    ReorderMediaUseCase,
    GetResourceMediaUseCase,
    GenerateUploadIntentUseCase,
    ConsumeUploadIntentUseCase,
    FinalizeMessageAttachmentsUseCase,
    MediaUrlService,
    IMediaRepository,
  ],
})
export class MediaModule {}
