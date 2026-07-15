import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';
import { PostHogInterceptor } from 'posthog-node/nestjs';
import { AppConfig } from './validation.js';

export class PostHogSetup {
  static register(app: INestApplication): void {
    const config = app.get(ConfigService<AppConfig>);
    const apiKey = config.get<string>('POSTHOG_API_KEY');

    if (!apiKey) {
      Logger.warn(
        'POSTHOG_API_KEY is not set. Analytics and error tracking will be disabled.',
        'PostHogSetup',
      );
      return;
    }

    const posthog = new PostHog(apiKey, {
      host: 'https://us.i.posthog.com',
    });

    app.useGlobalInterceptors(new PostHogInterceptor(posthog, { captureExceptions: true }));
    Logger.log('PostHog initialized and interceptor attached', 'PostHogSetup');
  }
}
