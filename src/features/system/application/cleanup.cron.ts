import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service.js';

@Injectable()
export class CleanupCronService {
  private readonly logger = new Logger(CleanupCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCleanup() {
    this.logger.log('Starting daily cleanup job...');

    // 1. Delete expired sessions
    const expiredSessions = await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (expiredSessions.count > 0) {
      this.logger.log(`Cleaned up ${expiredSessions.count} expired sessions.`);
    }

    // 2. Delete revoked sessions older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const revokedSessions = await this.prisma.session.deleteMany({
      where: { revokedAt: { lt: sevenDaysAgo } },
    });
    if (revokedSessions.count > 0) {
      this.logger.log(`Cleaned up ${revokedSessions.count} revoked sessions.`);
    }

    // 3. Process staged account deletions (users pending deletion > 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const usersToDelete = await this.prisma.user.findMany({
      where: {
        status: 'PENDING_DELETION',
        deletedAt: { lt: thirtyDaysAgo },
      },
    });

    for (const user of usersToDelete) {
      try {
        // Cascade will delete the Account and associated Sessions
        await this.prisma.user.delete({
          where: { id: user.id },
        });
        this.logger.log(`Permanently deleted user: ${user.id}`);
      } catch (err) {
        this.logger.error(`Failed to delete user ${user.id}:`, err);
      }
    }

    // 4. Delete old notifications in batches to prevent lock escalation
    try {
      let deletedCount = 0;
      while (true) {
        const result = await this.prisma.$executeRaw`
          DELETE FROM "InAppNotification"
          WHERE id IN (
            SELECT id FROM "InAppNotification"
            WHERE "createdAt" < ${thirtyDaysAgo}
            LIMIT 1000
          )
        `;
        if (result === 0) break;
        deletedCount += result;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedCount} old notifications.`);
      }
    } catch (err) {
      this.logger.error('Failed to cleanup old notifications:', err);
    }

    this.logger.log('Daily cleanup job completed.');
  }
}
