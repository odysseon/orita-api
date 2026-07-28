import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '@odysseon/whoami-adapter-nestjs';

@Public()
@Controller()
export class AppController {
  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  getRobotsTxt(): string {
    return 'User-agent: *\nDisallow: /\n';
  }
}
