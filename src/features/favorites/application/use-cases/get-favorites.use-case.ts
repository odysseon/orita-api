import { Injectable } from '@nestjs/common';
import {
  IFavoritesRepository,
  FavoriteView,
} from '../../domain/ports/favorites.repository.port.js';

@Injectable()
export class GetFavoritesUseCase {
  constructor(private readonly favoritesRepository: IFavoritesRepository) {}

  async execute(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: FavoriteView[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const { items, total } = await this.favoritesRepository.getFavorites(userId, skip, limit);
    return { items, total, page, limit };
  }
}
