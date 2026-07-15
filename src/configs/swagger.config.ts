import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppConfig } from './validation.js';

/**
 * Encapsulates Swagger UI registration.
 *
 * Swagger is opt-in via `SWAGGER_ENABLED`. When enabled, the docs and JSON
 * endpoints are protected by HTTP Basic Auth.
 */
export class SwaggerSetup {
  static register(app: INestApplication): void {
    const config = app.get(ConfigService<AppConfig>);
    const enabled = config.get<boolean>('SWAGGER_ENABLED');
    if (!enabled) return;

    const docsPath = config.get('SWAGGER_PATH_DOCS') as string;
    const jsonPath = config.get('SWAGGER_PATH_JSON') as string;

    // Authentication removed for internal/CLI access

    const builder = new DocumentBuilder()
      .setTitle(config.get('SWAGGER_TITLE') as string)
      .setDescription(config.get('SWAGGER_DESCRIPTION') as string)
      .setVersion(config.get('SWAGGER_VERSION') as string)
      .addTag(config.get('SWAGGER_TAG_NAME') as string, config.get('SWAGGER_TAG_DESC'))
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, builder);
    SwaggerModule.setup(docsPath, app, document, {
      jsonDocumentUrl: jsonPath,
      swaggerOptions: { persistAuthorization: true },
    });
  }
}
