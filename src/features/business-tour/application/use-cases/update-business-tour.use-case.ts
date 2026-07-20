import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IBusinessTourRepository } from '../../domain/ports/business-tour.repository.port.js';
import { BusinessTour, BusinessTourStatus } from '../../domain/types/business-tour.entity.js';
import { UpdateBusinessTourInput } from '../../domain/types/business-tour.types.js';
import { MailQueueService } from '../../../../mail/mail-queue.service.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../../configs/validation.js';

@Injectable()
export class UpdateBusinessTourUseCase {
  constructor(
    private readonly businessTourRepo: IBusinessTourRepository,
    private readonly prisma: PrismaService,
    private readonly mailQueueService: MailQueueService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async execute(id: string, input: UpdateBusinessTourInput): Promise<BusinessTour> {
    const existing = await this.businessTourRepo.findById(id);
    if (!existing) {
      throw new NotFoundException('Store tour not found.');
    }

    if (input.status === BusinessTourStatus.PUBLISHED) {
      if (!existing.media || existing.media.length === 0) {
        throw new BadRequestException(
          'Cannot publish a store tour without at least one media item.',
        );
      }
    }

    const updatedTour = await this.businessTourRepo.update(id, input);

    if (
      input.status === BusinessTourStatus.PUBLISHED &&
      existing.status !== BusinessTourStatus.PUBLISHED
    ) {
      const business = await this.prisma.businessProfile.findUnique({
        where: { id: existing.businessProfileId },
        select: { email: true, name: true },
      });

      if (business && business.email) {
        await this.mailQueueService.enqueueMail({
          to: business.email,
          subject: 'Your Store Tour is Live on Orita!',
          template: 'business-tour-published',
          context: {
            businessName: business.name,
            action_url: `${this.configService.get('FRONTEND_URL')}/business-tours/${updatedTour.id}`,
          },
        });
      }
    }

    return updatedTour;
  }
}
