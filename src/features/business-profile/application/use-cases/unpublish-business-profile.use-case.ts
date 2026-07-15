import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IBusinessProfileRepository } from '../../domain/ports/business-profile.repository.port.js';

@Injectable()
export class UnpublishBusinessProfileUseCase {
  constructor(private readonly repo: IBusinessProfileRepository) {}

  async execute(id: string, requesterId: string): Promise<void> {
    const profile = await this.repo.findById(id);

    if (!profile) {
      throw new NotFoundException('Business profile not found.');
    }

    if (profile.ownerId !== requesterId) {
      throw new ForbiddenException('You do not own this business profile.');
    }

    if (!profile.isPublic) {
      return; // Already private
    }

    await this.repo.setVisibility(id, false);
  }
}
