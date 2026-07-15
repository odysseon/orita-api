import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IBusinessProfileRepository } from '../../domain/ports/business-profile.repository.port.js';
import { BusinessPublicationPolicy } from '../../domain/policies/business-publication.policy.js';
import { PublicationIssue } from '../../../../shared/domain/publication.types.js';

export interface PublicationReadinessResult {
  ready: boolean;
  issues: PublicationIssue[];
}

@Injectable()
export class CheckBusinessPublicationReadinessUseCase {
  constructor(private readonly repo: IBusinessProfileRepository) {}

  async execute(id: string, requesterId: string): Promise<PublicationReadinessResult> {
    const profile = await this.repo.findById(id);

    if (!profile) {
      throw new NotFoundException('Business profile not found.');
    }

    if (profile.ownerId !== requesterId) {
      throw new ForbiddenException('You do not own this business profile.');
    }

    const validationResult = BusinessPublicationPolicy.validate(profile);

    return {
      ready: validationResult.isValid(),
      issues: validationResult.issues, // Expose both errors and warnings
    };
  }
}
