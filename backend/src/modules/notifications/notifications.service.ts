import type { PrismaClient } from '@prisma/client';
import { AppError } from '../../utils/errors.js';

export class NotificationsService {
  constructor(private prisma: PrismaClient) {}

  async getNotifications(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return notifications.map((n) => {
      // Calculate relative time string matching frontend mock
      const diffMs = Date.now() - new Date(n.createdAt).getTime();
      const diffDays = Math.floor(diffMs / 86400000);
      const diffHours = Math.floor(diffMs / 3600000);

      let time = 'Just now';
      if (diffDays >= 7) time = `${Math.floor(diffDays / 7)} week ago`;
      else if (diffDays > 0) time = `${diffDays} days ago`;
      else if (diffHours > 0) time = `${diffHours} hours ago`;

      return {
        id: n.id,
        type: n.type,
        text: n.text,
        time,
        read: n.read,
        profileId: n.relatedProfileId,
      };
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw AppError.notFound('Notification not found');
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    return { read: true };
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return { success: true };
  }
}
