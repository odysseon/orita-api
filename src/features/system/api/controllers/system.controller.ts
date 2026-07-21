import { Controller, Get, Req } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiInternalServerErrorResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { SystemService } from "../../application/system.service.js";
import { SystemStatusDto, VersionDto } from "../dto/system-status.dto.js";
import { Public } from "@odysseon/whoami-adapter-nestjs";
import type { Request } from "express";

@ApiTags("System")
@ApiBearerAuth()
@Controller("status")
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Get application bootstrap configuration and status" })
  @ApiOkResponse({ type: SystemStatusDto, description: "System status payload" })
  @ApiInternalServerErrorResponse({ description: "Server error" })
  getStatus(@Req() req: Request): SystemStatusDto {
    return {
      status: "operational",
      timestamp: new Date().toISOString(),
      requestId: (req.headers["x-request-id"] as string) || "unknown",
      environment: this.systemService.getEnvironment(),
      maintenance: { enabled: false, message: null },
      version: this.systemService.getVersion(),
      limits: this.systemService.getLimits(),
      features: this.systemService.getFeatures(),
      services: this.systemService.getServices(),
    };
  }

  @Public()
  @Get("version")
  @ApiOperation({ summary: "Get quick application version (for CI/CD and health checks)" })
  @ApiOkResponse({ type: VersionDto, description: "Version metadata" })
  @ApiInternalServerErrorResponse({ description: "Server error" })
  getVersion(): VersionDto {
    return this.systemService.getVersion();
  }
}
