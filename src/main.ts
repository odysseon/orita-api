import { NestFactory } from '@nestjs/core';
import { INestApplication, Logger, ValidationPipe, ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server } from 'socket.io';
import * as os from 'os';
import helmet from 'helmet';

import { AppModule } from './app.module.js';
import { SwaggerSetup } from './configs/swagger.config.js';
import { PostHogSetup } from './configs/posthog.config.js';
import { AppConfig } from './configs/validation.js';
import { RedisService } from './shared/redis/redis.service.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({ json: true, colors: true }),
  });

  const configService = app.get(ConfigService<AppConfig>);

  app.setGlobalPrefix(configService.get('GLOBAL_PREFIX') as string);
  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  SwaggerSetup.register(app);
  PostHogSetup.register(app);

  const allowedOriginsRaw = configService.get<string>('ALLOWED_ORIGINS');
  const frontendUrl = configService.get<string>('FRONTEND_URL') as string;
  let origins: string[] = [frontendUrl];
  if (allowedOriginsRaw) {
    origins = allowedOriginsRaw.split(',').map((o: string) => o.trim());
  }

  app.enableCors({
    origin: origins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const redisService = app.get(RedisService);
  const pubClient = redisService.getClient();
  const subClient = pubClient.duplicate();

  const ioAdapter = new IoAdapter(app);
  // Override the createIOServer so we can inject the Redis adapter
  const originalCreate = ioAdapter.createIOServer.bind(ioAdapter);
  ioAdapter.createIOServer = (port: number, options?: Record<string, unknown>): Server => {
    const server = originalCreate(port, options) as Server;
    server.adapter(createAdapter(pubClient, subClient));
    return server;
  };
  app.useWebSocketAdapter(ioAdapter);

  const port = configService.get('PORT') as number;
  await app.listen(port);
  logNetworkAddresses(app, port);
}

function logNetworkAddresses(_app: INestApplication, port: number): void {
  const addresses: string[] = [];
  try {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
      if (!iface) continue;
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) addresses.push(alias.address);
      }
    }
  } catch {
    Logger.warn('Could not enumerate network interfaces.', 'Bootstrap');
  }

  if (addresses.length > 0) {
    for (const address of addresses) {
      Logger.log(`App is listening at http://${address}:${port}`, 'Bootstrap');
    }
  } else {
    Logger.log(`App is listening on port ${port}`, 'Bootstrap');
  }
}

bootstrap().catch((err: unknown) => {
  console.error('Failed to bootstrap application', err);
  process.exit(1);
});
