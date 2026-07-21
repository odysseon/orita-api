import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Response, Request } from 'express';
import { Prisma } from '../../../generated/prisma/client.js';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Detailed internal log: Request ID, Path, Prisma Code, etc.
    // In a real app we might extract an X-Request-ID here
    type RequestWithIdentity = Request & { identity?: { accountId: string } };
    const identity = (request as RequestWithIdentity).identity?.accountId || 'unauthenticated';
    this.logger.error(
      `Prisma Exception [${exception.code}] on ${request.method} ${request.url} by ${identity}`,
      exception.stack,
    );

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    switch (exception.code) {
      case 'P2002': // Unique constraint failed
        status = HttpStatus.CONFLICT;
        message = 'Resource already exists.';
        break;
      case 'P2003': // Foreign key constraint failed
        status = HttpStatus.UNPROCESSABLE_ENTITY;
        message = 'Related resource not found or constraint failed.';
        break;
      case 'P2025': // Record to update not found
        status = HttpStatus.NOT_FOUND;
        message = 'Resource not found.';
        break;
      default:
        // Do not leak other codes, leave as generic 500
        break;
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
