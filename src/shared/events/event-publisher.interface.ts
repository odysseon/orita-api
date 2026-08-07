import { OutboxEvent } from '../../../generated/prisma/client.js';

export const EVENT_PUBLISHER = 'EVENT_PUBLISHER';

export interface IEventPublisher {
  publish(event: OutboxEvent): Promise<void>;
}
