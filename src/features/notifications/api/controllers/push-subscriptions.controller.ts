import { Controller, Post, Delete, Body, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentIdentity, type RequestIdentity } from '@odysseon/whoami-adapter-nestjs';
import { IdentityService } from '../../../../shared/identity/identity.service.js';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../../configs/validation.js';
import { PushSubscriptionService } from '../../application/services/push-subscriptions.service.js';
import {
  SavePushSubscriptionDto,
  DeletePushSubscriptionDto,
} from '../dto/push-subscriptions.dto.js';

@ApiTags('Push Subscriptions')
@ApiBearerAuth()
@Controller('notifications/push-subscriptions')
export class PushSubscriptionsController {
  constructor(
    private readonly pushSubscriptionService: PushSubscriptionService,
    private readonly identityService: IdentityService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Register or update a push subscription' })
  async saveSubscription(
    @CurrentIdentity() identity: RequestIdentity,
    @Body() dto: SavePushSubscriptionDto,
  ) {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);
    await this.pushSubscriptionService.saveSubscription(user.id, dto);
    return { success: true };
  }

  @Delete('current')
  @ApiOperation({ summary: 'Remove a push subscription' })
  async removeSubscription(
    @CurrentIdentity() identity: RequestIdentity,
    @Body() dto: DeletePushSubscriptionDto,
  ) {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);
    await this.pushSubscriptionService.removeSubscription(user.id, dto.endpoint);
    return { success: true };
  }

  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Get the VAPID public key for push notifications' })
  getVapidPublicKey() {
    // Note: The VAPID public key is mathematically designed to be public and is not a sensitive secret.
    return { publicKey: this.config.get('VAPID_PUBLIC_KEY', { infer: true }) || 'BPv_placeholder_vapid_public_key_from_server' };
  }
}
