import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { IBusinessProfileRepository } from '../../domain/ports/business-profile.repository.port.js';
import { BusinessPublicationPolicy } from '../../domain/policies/business-publication.policy.js';

@Injectable()
export class PublishBusinessProfileUseCase {
  constructor(private readonly repo: IBusinessProfileRepository) {}

  async execute(id: string, requesterId: string): Promise<void> {
    const profile = await this.repo.findById(id);

    if (!profile) {
      throw new NotFoundException('Business profile not found.');
    }

    if (profile.ownerId !== requesterId) {
      throw new ForbiddenException('You do not own this business profile.');
    }

    if (profile.isPublic) {
      return; // Already published
    }

    const validationResult = BusinessPublicationPolicy.validate(profile);

    if (!validationResult.isValid()) {
      throw new BadRequestException({
        message: 'Business profile is not ready for publication.',
        issues: validationResult.errors,
      });
    }

    await this.repo.setVisibility(id, true);
  }
}
