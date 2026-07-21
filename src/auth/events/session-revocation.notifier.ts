import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface SessionRevokedEvent {
  sessionId: string;
}

export interface GlobalSessionRevokedEvent {
  accountId: string;
}

export abstract class SessionRevocationNotifier {
  abstract notifySessionRevoked(sessionId: string): void;
  abstract notifyGlobalRevoked(accountId: string): void;
}

@Injectable()
export class EventEmitterSessionRevocationNotifier implements SessionRevocationNotifier {
  private readonly logger = new Logger(EventEmitterSessionRevocationNotifier.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  notifySessionRevoked(sessionId: string): void {
    this.logger.debug(`Broadcasting session.revoked for session ${sessionId}`);
    this.eventEmitter.emit('session.revoked', { sessionId });
  }

  notifyGlobalRevoked(accountId: string): void {
    this.logger.debug(`Broadcasting account.sessions.revoked for account ${accountId}`);
    this.eventEmitter.emit('account.sessions.revoked', { accountId });
  }
}
