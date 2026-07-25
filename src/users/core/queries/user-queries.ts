import { UserStatus, type Prisma } from '../../../../generated/prisma/client.js';

/**
 * Reusable filter conditions for targeting only live, active users in Prisma queries.
 */
export const activeUserWhere = {
  status: UserStatus.ACTIVE,
  deletedAt: null,
} as const;

/**
 * Combines existing query conditions with active user filtering to prevent
 * pending deletion or suspended accounts from surfacing in queries or operations.
 */
export function buildActiveUserWhere(where?: Prisma.UserWhereInput): Prisma.UserWhereInput {
  return {
    ...where,
    status: UserStatus.ACTIVE,
    deletedAt: null,
  };
}
