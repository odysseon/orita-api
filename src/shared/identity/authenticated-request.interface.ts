import type { Request } from 'express';

/**
 * Standardized authenticated HTTP request interface supporting both Whoami overlay identity
 * and direct request identity attribution used across guards and exception filters.
 */
export interface AuthenticatedRequest extends Request {
  whoami?: {
    identity?: {
      accountId: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  identity?: {
    accountId: string;
    [key: string]: unknown;
  };
  sessionId?: string;
}
