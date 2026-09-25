/**
 * LUXION PRODUCT-LEVEL USER USAGE MANAGER
 * 
 * Separates internal product usage policies from external provider quotas:
 * - Free users: max 3 compatible model/provider fallbacks per request
 * - Paid users: max 7 compatible model/provider fallbacks per request
 * - Admin/Owner: max 10 compatible model/provider fallbacks + provider diagnostics
 * 
 * Strict Principle:
 * - Owner privileges do NOT bypass external provider quotas, billing, or rate limits.
 * - Owner role is NEVER assigned blindly from frontend claims; it requires backend authorization.
 */

import { UserRole } from './types.ts';

export interface UserTierPolicy {
  maxFallbacks: number;
  canViewDiagnostics: boolean;
  canSwitchModelDirectly: boolean;
}

export const USER_TIER_POLICIES: Record<UserRole, UserTierPolicy> = {
  USER: {
    maxFallbacks: 3,
    canViewDiagnostics: false,
    canSwitchModelDirectly: false,
  },
  PAID_USER: {
    maxFallbacks: 7,
    canViewDiagnostics: false,
    canSwitchModelDirectly: true,
  },
  ADMIN: {
    maxFallbacks: 10,
    canViewDiagnostics: true,
    canSwitchModelDirectly: true,
  },
  OWNER: {
    maxFallbacks: 10,
    canViewDiagnostics: true,
    canSwitchModelDirectly: true,
  },
};

export class UserUsageManager {
  private static instance: UserUsageManager;

  private constructor() {}

  public static getInstance(): UserUsageManager {
    if (!UserUsageManager.instance) {
      UserUsageManager.instance = new UserUsageManager();
    }
    return UserUsageManager.instance;
  }

  public getPolicy(role?: UserRole): UserTierPolicy {
    const activeRole: UserRole = role && USER_TIER_POLICIES[role] ? role : 'USER';
    return USER_TIER_POLICIES[activeRole];
  }

  public normalizeRole(roleString?: string): UserRole {
    if (!roleString) return 'USER';
    const upper = roleString.toUpperCase();
    if (upper === 'OWNER') return 'OWNER';
    if (upper === 'ADMIN') return 'ADMIN';
    if (upper === 'PAID_USER' || upper === 'PRO') return 'PAID_USER';
    return 'USER';
  }
}

export const userUsageManager = UserUsageManager.getInstance();
