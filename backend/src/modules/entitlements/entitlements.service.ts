import { env } from '../../config/env.js';

export interface PlanLimits {
  weeklyProfileViews: number;
  monthlyConversations: number;
  hasAdvancedFilters: boolean;
  hasReadReceipts: boolean;
  hasPriorityVisibility: boolean;
  hasFullCompatibilityBreakdown: boolean;
}

export const PLAN_CONFIGS: Record<string, PlanLimits> = {
  free: {
    weeklyProfileViews: 15,
    monthlyConversations: 3,
    hasAdvancedFilters: false,
    hasReadReceipts: false,
    hasPriorityVisibility: false,
    hasFullCompatibilityBreakdown: false,
  },
  connect: {
    weeklyProfileViews: Infinity,
    monthlyConversations: Infinity,
    hasAdvancedFilters: true,
    hasReadReceipts: true,
    hasPriorityVisibility: true,
    hasFullCompatibilityBreakdown: true,
  },
  annual: {
    weeklyProfileViews: Infinity,
    monthlyConversations: Infinity,
    hasAdvancedFilters: true,
    hasReadReceipts: true,
    hasPriorityVisibility: true,
    hasFullCompatibilityBreakdown: true,
  },
};

export class EntitlementsService {
  /**
   * Checks if user can view candidate profiles according to weekly quota
   */
  static canBrowseProfiles(userPlan = 'free', currentWeeklyViews = 0): boolean {
    if (!env.ENFORCE_QUOTAS) return true; // Disabled during development
    const limits = PLAN_CONFIGS[userPlan.toLowerCase()] || PLAN_CONFIGS.free;
    return currentWeeklyViews < limits.weeklyProfileViews;
  }

  /**
   * Checks if user can initiate conversations according to monthly quota
   */
  static canStartConversation(userPlan = 'free', currentMonthlyConversations = 0): boolean {
    if (!env.ENFORCE_QUOTAS) return true; // Disabled during development
    const limits = PLAN_CONFIGS[userPlan.toLowerCase()] || PLAN_CONFIGS.free;
    return currentMonthlyConversations < limits.monthlyConversations;
  }

  /**
   * Checks if user can see read receipts (✓✓)
   */
  static canSeeReadReceipts(userPlan = 'free'): boolean {
    const limits = PLAN_CONFIGS[userPlan.toLowerCase()] || PLAN_CONFIGS.free;
    return limits.hasReadReceipts;
  }
}
