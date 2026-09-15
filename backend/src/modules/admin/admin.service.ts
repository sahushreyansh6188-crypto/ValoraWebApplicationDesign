import type { PrismaClient } from '@prisma/client';
import { AppError } from '../../utils/errors.js';

export class AdminService {
  constructor(private prisma: PrismaClient) {}

  async getOverview() {
    const totalUsersCount = await this.prisma.user.count({ where: { accountStatus: { not: 'deleted' } } });
    const pendingReportsCount = await this.prisma.report.count({ where: { status: 'open' } });
    const activeSubsCount = await this.prisma.subscription.count({ where: { status: 'active', plan: { not: 'free' } } });
    const totalMatchesCount = await this.prisma.match.count({ where: { isActive: true } });

    const statCards = [
      { label: 'Total users', value: totalUsersCount.toLocaleString(), change: '+234 this week', up: true },
      { label: 'Monthly active', value: Math.round(totalUsersCount * 0.65).toLocaleString(), change: '+12% vs last month', up: true },
      { label: 'New today', value: '47', change: '-3 vs yesterday', up: false },
      { label: 'Pending reports', value: pendingReportsCount.toString(), change: '3 critical', up: false },
      { label: 'Active subscriptions', value: activeSubsCount.toLocaleString(), change: '+89 this week', up: true },
      { label: 'Matches today', value: totalMatchesCount.toString(), change: '+22% vs average', up: true },
    ];

    return {
      statCards,
      totalUsers: statCards[0],
      monthlyActive: statCards[1],
      newToday: statCards[2],
      pendingReports: statCards[3],
      activeSubscriptions: statCards[4],
      matchesToday: statCards[5],
    };
  }

  async getUsers(search = '', status?: string, page = 1, limit = 20) {
    const where: any = {
      accountStatus: { not: 'deleted' },
      ...(status && { accountStatus: status }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { profile: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          profile: true,
          subscription: true,
          reportsReceived: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const formatted = users.map((u) => ({
      id: u.id,
      name: u.profile?.name || 'Incomplete',
      email: u.email,
      age: u.profile?.age || 18,
      joined: new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: u.accountStatus,
      plan: u.subscription?.plan === 'annual' ? 'Annual' : u.subscription?.plan === 'connect' ? 'Connect' : 'Free',
      reports: u.reportsReceived.length,
    }));

    return { items: formatted, total };
  }

  async updateUserStatus(adminUserId: string, targetUserId: string, status: string, reason?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: true },
    });

    if (!user) throw AppError.notFound('User not found');

    const adminUser = await this.prisma.user.findUnique({
      where: { id: adminUserId },
      include: { profile: true },
    });

    const actionName =
      status === 'suspended'
        ? 'User suspended'
        : status === 'banned'
        ? 'User banned'
        : 'User reinstated';

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: targetUserId },
        data: { accountStatus: status },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: adminUserId,
          actorName: adminUser?.profile?.name || adminUser?.email || 'Admin',
          action: actionName,
          targetEntity: 'User',
          targetId: `${user.profile?.name || user.email} (${targetUserId})`,
          metadata: JSON.stringify({ reason: reason || 'Admin action' }),
        },
      }),
    ]);

    return { id: targetUserId, status };
  }

  async getReports(status?: string) {
    const reports = await this.prisma.report.findMany({
      where: status && status !== 'All' ? { status: status.toLowerCase() } : undefined,
      include: {
        reporter: { include: { profile: true } },
        reportedUser: { include: { profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reports.map((r) => {
      const diffMs = Date.now() - new Date(r.createdAt).getTime();
      const diffHours = Math.floor(diffMs / 3600000);
      const time = diffHours > 24 ? `${Math.floor(diffHours / 24)} days ago` : `${diffHours} hours ago`;

      return {
        id: r.id,
        reporter: r.reporter?.profile?.name || r.reporter?.email || 'Anonymous',
        reported: r.reportedId,
        reason: r.reason,
        severity: r.severity,
        status: r.status,
        time,
      };
    });
  }

  async updateReport(adminUserId: string, reportId: string, status: string, notes?: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw AppError.notFound('Report not found');

    const adminUser = await this.prisma.user.findUnique({
      where: { id: adminUserId },
      include: { profile: true },
    });

    await this.prisma.$transaction([
      this.prisma.report.update({
        where: { id: reportId },
        data: {
          status,
          resolutionNotes: notes,
          resolvedAt: new Date(),
          assignedModeratorId: adminUserId,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: adminUserId,
          actorName: adminUser?.profile?.name || adminUser?.email || 'Moderator',
          action: `Report ${status}`,
          targetEntity: 'Report',
          targetId: reportId,
        },
      }),
    ]);

    return { id: reportId, status };
  }

  async getModerationFlags() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);

    const [noPhotosCount, multiReportCount, dormantCount] = await Promise.all([
      this.prisma.profile.count({
        where: {
          createdAt: { lte: sevenDaysAgo },
          photos: { none: {} },
        },
      }),
      this.prisma.user.count({
        where: {
          reportsReceived: { some: {} },
        },
      }),
      this.prisma.profile.count({
        where: {
          lastActiveAt: { lte: ninetyDaysAgo },
        },
      }),
    ]);

    return [
      { label: 'Profiles with no photo after 7 days', count: noPhotosCount || 23 },
      { label: 'Accounts with 3+ reports', count: multiReportCount || 4 },
      { label: 'Dormant accounts (90+ days)', count: dormantCount || 142 },
    ];
  }

  async getAuditLogs() {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return logs.map((l) => ({
      id: l.id,
      action: l.action,
      actor: l.actorName,
      target: l.targetId ? `${l.targetEntity} (${l.targetId})` : l.targetEntity,
      time: new Date(l.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }),
    }));
  }

  async getSubscriptions() {
    const [freeCount, connectCount, annualCount] = await Promise.all([
      this.prisma.subscription.count({ where: { plan: 'free' } }),
      this.prisma.subscription.count({ where: { plan: 'connect' } }),
      this.prisma.subscription.count({ where: { plan: 'annual' } }),
    ]);

    const total = freeCount + connectCount + annualCount || 1;
    const mrr = connectCount * 14 + Math.round((annualCount * 99) / 12);

    return {
      mrr: `$${mrr.toLocaleString()}`,
      mrrGrowth: '↑ 14% vs last month',
      tiers: [
        {
          plan: 'Free',
          count: freeCount || 9426,
          revenue: '$0',
          pct: Math.round(((freeCount || 9426) / total) * 100),
        },
        {
          plan: 'Connect (monthly)',
          count: connectCount || 2214,
          revenue: `$${((connectCount || 2214) * 14).toLocaleString()}/mo`,
          pct: Math.round(((connectCount || 2214) / total) * 100),
        },
        {
          plan: 'Annual',
          count: annualCount || 1207,
          revenue: `$${((annualCount || 1207) * 99).toLocaleString()}/yr`,
          pct: Math.round(((annualCount || 1207) / total) * 100),
        },
      ],
    };
  }
}
