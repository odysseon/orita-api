import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentIdentity } from '@odysseon/whoami-adapter-nestjs';
import type { RequestIdentity } from '@odysseon/whoami-adapter-nestjs';
import { PrismaService } from '../../../../prisma/prisma.service.js';

import { SaveListingUseCase } from '../../application/use-cases/save-listing.use-case.js';
import { UnsaveListingUseCase } from '../../application/use-cases/unsave-listing.use-case.js';
import { GetSavedListingsUseCase } from '../../application/use-cases/get-saved-listings.use-case.js';

@ApiTags('Saves')
@Controller()
export class SavesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly saveListing: SaveListingUseCase,
    private readonly unsaveListing: UnsaveListingUseCase,
    private readonly getSavedListings: GetSavedListingsUseCase,
  ) {}

  private async resolveUser(accountId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { accountId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User profile not found.');
    return user.id;
  }

  @Post('listings/:id/save')
  @HttpCode(HttpStatus.OK)
  async saveListingAction(@CurrentIdentity() identity: RequestIdentity, @Param('id') id: string) {
    const userId = await this.resolveUser(identity.accountId);
    await this.saveListing.execute(userId, id);
    return { success: true };
  }

  @Delete('listings/:id/save')
  @HttpCode(HttpStatus.OK)
  async unsaveListingAction(@CurrentIdentity() identity: RequestIdentity, @Param('id') id: string) {
    const userId = await this.resolveUser(identity.accountId);
    await this.unsaveListing.execute(userId, id);
    return { success: true };
  }

  @Get('users/me/saved-listings')
  async listSavedListings(
    @CurrentIdentity() identity: RequestIdentity,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = await this.resolveUser(identity.accountId);
    const pageNum = parseInt(page ?? '1', 10);
    const limitNum = parseInt(limit ?? '20', 10);
    return this.getSavedListings.execute(
      userId,
      isNaN(pageNum) ? 1 : pageNum,
      isNaN(limitNum) ? 20 : limitNum,
    );
  }
}
