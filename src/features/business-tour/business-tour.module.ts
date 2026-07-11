import { Module, forwardRef } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { IBusinessTourRepository } from './domain/ports/business-tour.repository.port.js';
import { PrismaBusinessTourRepository } from './infrastructure/prisma-business-tour.repository.js';
import { CreateBusinessTourUseCase } from './application/use-cases/create-business-tour.use-case.js';
import { UpdateBusinessTourUseCase } from './application/use-cases/update-business-tour.use-case.js';
import { DeleteBusinessTourUseCase } from './application/use-cases/delete-business-tour.use-case.js';
import { GetBusinessTourUseCase } from './application/use-cases/get-business-tour.use-case.js';
import { GetBusinessToursByProfileUseCase } from './application/use-cases/get-business-tours-by-profile.use-case.js';
import { GetBusinessToursUseCase } from './application/use-cases/get-business-tours.use-case.js';
import { BusinessTourController } from './api/controllers/business-tour.controller.js';
import { StorageModule } from '../../storage/storage.module.js';
import { MailModule } from '../../mail/mail.module.js';

@Module({
  imports: [StorageModule, MailModule, forwardRef(() => MediaModule)],
  controllers: [BusinessTourController],
  providers: [
    {
      provide: IBusinessTourRepository,
      useClass: PrismaBusinessTourRepository,
    },
    CreateBusinessTourUseCase,
    UpdateBusinessTourUseCase,
    DeleteBusinessTourUseCase,
    GetBusinessTourUseCase,
    GetBusinessToursByProfileUseCase,
    GetBusinessToursUseCase,
  ],
  exports: [IBusinessTourRepository],
})
export class BusinessTourModule {}
