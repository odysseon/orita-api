import { Injectable, Logger } from '@nestjs/common';
import handlebars from 'handlebars';
import { isError } from '../shared/utils/error.util.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

@Injectable()
export class MailTemplateService {
  private readonly logger = new Logger(MailTemplateService.name);
  private templatesCache = new Map<string, handlebars.TemplateDelegate>();

  async compile(templateName: string, context: Record<string, unknown> = {}): Promise<string> {
    try {
      let templateDelegate = this.templatesCache.get(templateName);

      if (!templateDelegate) {
        const currentDir = path.dirname(fileURLToPath(import.meta.url));
        const templatesDir = path.join(currentDir, 'templates');
        const templatePath = path.join(templatesDir, `${templateName}.hbs`);

        const templateContent = await fs.readFile(templatePath, 'utf8');
        templateDelegate = handlebars.compile(templateContent);

        // Cache for future use
        this.templatesCache.set(templateName, templateDelegate);
      }

      return templateDelegate(context);
    } catch (error) {
      this.logger.error(
        `Failed to compile template ${templateName}`,
        isError(error) ? error.stack : String(error),
      );
      throw error;
    }
  }
}
