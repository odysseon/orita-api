import { Injectable, BadRequestException } from '@nestjs/common';
import { MessageEmbedType } from '../../../../../generated/prisma/client.js';
import { EmbedSnapshot } from '../../domain/types/messaging.types.js';
import { IEmbedBuilder } from './embed-builders/embed-builder.interface.js';
import { BusinessEmbedBuilder } from './embed-builders/business.embed-builder.js';
import { ListingEmbedBuilder } from './embed-builders/listing.embed-builder.js';
import { TourEmbedBuilder } from './embed-builders/tour.embed-builder.js';
import { LocationEmbedBuilder } from './embed-builders/location.embed-builder.js';

@Injectable()
export class EmbedResolverService {
  private builders: IEmbedBuilder[];

  constructor(
    businessBuilder: BusinessEmbedBuilder,
    listingBuilder: ListingEmbedBuilder,
    tourBuilder: TourEmbedBuilder,
    locationBuilder: LocationEmbedBuilder,
  ) {
    this.builders = [businessBuilder, listingBuilder, tourBuilder, locationBuilder];
  }

  async resolve(type: MessageEmbedType, targetId: string): Promise<EmbedSnapshot> {
    const builder = this.builders.find(b => b.supports(type));
    
    if (!builder) {
      throw new BadRequestException(`No embed builder found for type: ${type}`);
    }

    return builder.build(targetId);
  }
}
