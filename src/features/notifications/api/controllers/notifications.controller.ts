import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { CurrentIdentity, type RequestIdentity } from '@odysseon/whoami-adapter-nestjs';
import { NotificationsService } from '../../application/services/notifications.service.js';
import { NotificationViewDto, PaginatedNotificationsDto } from '../dto/response.dto.js';
import { IdentityService } from '../../../../shared/identity/identity.service.js';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
    private readonly identityService: IdentityService,
  ) {}

  @Get()
  async getPaginated(
    @CurrentIdentity() identity: RequestIdentity,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedNotificationsDto> {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);
    const take = limit ? parseInt(limit, 10) : 20;
    return this.service.getPaginated(user.id, take, cursor);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentIdentity() identity: RequestIdentity): Promise<{ count: number }> {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);
    const count = await this.service.getUnreadCount(user.id);
    return { count };
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentIdentity() identity: RequestIdentity): Promise<{ success: boolean }> {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);
    await this.service.markAllAsRead(user.id);
    return { success: true };
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('id') id: string,
  ): Promise<NotificationViewDto> {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);
    return this.service.markAsRead(user.id, id);
  }
}
