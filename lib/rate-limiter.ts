
import { prisma } from '@/lib/prisma'; // Adjust path to your prisma client

// Types
export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: string;
  tokensUsedLastMin?: number;
  tokensUsedThisMonth?: number;
  tokensUsedLifetime?: number;
  tokensRemaining?: number;
  retryAfter?: number;
  tier: string;
  limits?: {
    perMinute: number;
    perMonth: number;
  };
}

export interface TokenUsageResult {
  success: boolean;
  tokensRecorded: number;
}

export interface UserTokenStats {
  tier: string;
  subscription: {
    expiresAt: Date | null;
    isActive: boolean;
  };
  usage: {
    lastMinute: number;
    thisMonth: number;
    lifetime: number;
  };
  limits: {
    perMinute: number;
    perMonth: number;
  };
  remaining: {
    perMinute: number;
    perMonth: number;
  };
  resetAt: {
    minute: Date;
    month: Date;
  };
}

export interface PurchaseResult {
  success: boolean;
  tier: string;
  expiresAt: Date | null;
  price: number;
}

export interface ResetResult {
  success: boolean;
  tier: string;
}

/**
 * Check if user can use tokens (rate limiting)
 */
// lib/token-tracker.ts

/**
 * Check if user can use tokens (rate limiting)
 * CORRECTED VERSION
 */
// lib/token-tracker.ts

export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: string;
  tokensUsedLastMin?: number;
  tokensUsedThisMonth?: number;
  tokensUsedLifetime?: number;
  tokensRemaining?: number;
  retryAfter?: number;
  tier: string;
  limits?: {
    perMinute: number;
    perMonth: number;
  };
  resetDate?: Date;
  monthlyResetDate?: Date;
  needsRenewal?: boolean;
}

/**
 * Check if user can use tokens (rate limiting)
 */
export async function checkRateLimit(
  userId: string,
  estimatedTokens: number = 0
): Promise<RateLimitCheckResult> {

  let user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tier: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const now = new Date();

  // 1. Check if subscription expired (downgrade to free)
  if (user.subscriptionExpiresAt && now > user.subscriptionExpiresAt) {
    const freeTier = await prisma.priorityTier.findUnique({
      where: { name: 'free' }
    });

    if (!freeTier) {
      throw new Error('Free tier not found');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        tierId: freeTier.id,
        subscriptionExpiresAt: null,
        tokensUsedThisMonth: 0,
      }
    });

    user.tier = freeTier;
    user.tierId = freeTier.id;
    user.tokensUsedThisMonth = 0;
  }

  // 2. For YEARLY PREMIUM users only: Reset monthly quota every month
  if (user.tier.name === 'premium-yearly' && now > user.monthResetAt) {
    const nextMonthReset = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    );

    await prisma.user.update({
      where: { id: userId },
      data: {
        tokensUsedThisMonth: 0,
        monthResetAt: nextMonthReset,
      }
    });

    user.tokensUsedThisMonth = 0;
    user.monthResetAt = nextMonthReset;

    console.log(`✅ Reset monthly tokens for yearly premium user ${userId}`);
  }

  // 3. Check token limits based on tier
  if (user.tier.name === 'free') {
    // Free tier: Check lifetime limit
    const lifetimeOk = user.tokensUsedLifetime + estimatedTokens <= user.tier.tokensPerMonth;

    if (!lifetimeOk) {
      return {
        allowed: false,
        reason: 'Free tier limit (30K tokens) reached. Please upgrade to premium.',
        tokensUsedLifetime: user.tokensUsedLifetime,
        tokensRemaining: Math.max(0, user.tier.tokensPerMonth - user.tokensUsedLifetime),
        tier: user.tier.name
      };
    }
  } else if (user.tier.name === 'premium-monthly') {
    // Premium monthly: Check if they've used all tokens (no auto-reset)
    const monthlyOk = user.tokensUsedThisMonth + estimatedTokens <= user.tier.tokensPerMonth;

    if (!monthlyOk) {
      return {
        allowed: false,
        reason: 'Monthly token limit reached. Please renew your subscription to get more tokens.',
        tokensUsedThisMonth: user.tokensUsedThisMonth,
        tokensRemaining: Math.max(0, user.tier.tokensPerMonth - user.tokensUsedThisMonth),
        tier: user.tier.name,
        needsRenewal: true,
      };
    }
  } else if (user.tier.name === 'premium-yearly') {
    // Premium yearly: Check monthly limit (resets automatically every month)
    const monthlyOk = user.tokensUsedThisMonth + estimatedTokens <= user.tier.tokensPerMonth;

    if (!monthlyOk) {
      const daysUntilReset = Math.ceil(
        (user.monthResetAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        allowed: false,
        reason: `Monthly token limit reached. Your quota resets in ${daysUntilReset} day${daysUntilReset !== 1 ? 's' : ''}.`,
        tokensUsedThisMonth: user.tokensUsedThisMonth,
        tokensRemaining: Math.max(0, user.tier.tokensPerMonth - user.tokensUsedThisMonth),
        tier: user.tier.name,
        resetDate: user.monthResetAt,
      };
    }
  }

  // 4. Check per-minute rate limit (for all tiers)
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

  const tokensInLastMinute = await prisma.tokenHistory.aggregate({
    where: {
      userId,
      createdAt: { gte: oneMinuteAgo }
    },
    _sum: { tokens: true }
  });

  const tokensUsedLastMin = tokensInLastMinute._sum.tokens || 0;
  const perMinuteOk = tokensUsedLastMin + estimatedTokens <= user.tier.tokensPerMinute;

  if (!perMinuteOk) {
    return {
      allowed: false,
      reason: 'Rate limit exceeded. Please wait a moment.',
      tokensUsedLastMin,
      tokensRemaining: Math.max(0, user.tier.tokensPerMinute - tokensUsedLastMin),
      retryAfter: 60,
      tier: user.tier.name
    };
  }

  // 5. All checks passed ✅
  return {
    allowed: true,
    tokensUsedLastMin,
    tokensUsedThisMonth: user.tokensUsedThisMonth,
    tokensUsedLifetime: user.tokensUsedLifetime,
    limits: {
      perMinute: user.tier.tokensPerMinute,
      perMonth: user.tier.tokensPerMonth
    },
    tier: user.tier.name,
    monthlyResetDate: user.tier.name === 'premium-yearly' ? user.monthResetAt : undefined,
  };
}
/**
 * Record token usage after request
 */
export async function recordTokenUsage(
  userId: string,
  tokensUsed: number
): Promise<TokenUsageResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tier: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  await prisma.$transaction([
    // Add to history for sliding window
    prisma.tokenHistory.create({
      data: {
        userId,
        tokens: tokensUsed
      }
    }),
    // Update counters
    prisma.user.update({
      where: { id: userId },
      data: {
        tokensUsedThisMonth: { increment: tokensUsed },
        tokensUsedLifetime: { increment: tokensUsed }
      }
    })
  ]);

  // Clean up old history (older than 2 minutes)
  const twoMinutesAgo = new Date(Date.now() - 120 * 1000);
  await prisma.tokenHistory.deleteMany({
    where: {
      userId,
      createdAt: { lt: twoMinutesAgo }
    }
  });

  return {
    success: true,
    tokensRecorded: tokensUsed
  };
}

/**
 * Get user's token usage stats
 */
export async function getUserTokenStats(userId: string): Promise<UserTokenStats> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tier: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

  // Get tokens used in last minute
  const tokensInLastMinute = await prisma.tokenHistory.aggregate({
    where: {
      userId,
      createdAt: { gte: oneMinuteAgo }
    },
    _sum: { tokens: true }
  });

  const tokensUsedLastMin = tokensInLastMinute._sum.tokens || 0;

  // Calculate remaining
  const remaining = {
    perMinute: Math.max(0, user.tier.tokensPerMinute - tokensUsedLastMin),
    perMonth: user.tier.name === 'free'
      ? Math.max(0, user.tier.tokensPerMonth - user.tokensUsedLifetime)
      : Math.max(0, user.tier.tokensPerMonth - user.tokensUsedThisMonth)
  };

  return {
    tier: user.tier.name,
    subscription: {
      expiresAt: user.subscriptionExpiresAt,
      isActive: !user.subscriptionExpiresAt || now < user.subscriptionExpiresAt
    },
    usage: {
      lastMinute: tokensUsedLastMin,
      thisMonth: user.tokensUsedThisMonth,
      lifetime: user.tokensUsedLifetime
    },
    limits: {
      perMinute: user.tier.tokensPerMinute,
      perMonth: user.tier.tokensPerMonth
    },
    remaining,
    resetAt: {
      minute: new Date(now.getTime() + 60 * 1000),
      month: user.monthResetAt
    }
  };
}

/**
 * Purchase premium subscription
 */
export async function purchasePremium(
  userId: string,
  tierName: string
): Promise<PurchaseResult> {
  const tier = await prisma.priorityTier.findUnique({
    where: { name: tierName }
  });

  if (!tier) {
    throw new Error('Tier not found');
  }

  if (tier.name === 'free') {
    throw new Error('Cannot purchase free tier');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + tier.validityDays * 24 * 60 * 60 * 1000);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      tierId: tier.id,
      subscriptionExpiresAt: expiresAt,
      tokensUsedThisMonth: 0, // Reset on upgrade
      monthResetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
    },
    include: { tier: true }
  });

  return {
    success: true,
    tier: updatedUser.tier.name,
    expiresAt: updatedUser.subscriptionExpiresAt,
    price: Number(tier.price)
  };
}

/**
 * Reset user to free tier (subscription expired or cancelled)
 */
export async function resetToFreeTier(userId: string): Promise<ResetResult> {
  const freeTier = await prisma.priorityTier.findUnique({
    where: { name: 'free' }
  });

  if (!freeTier) {
    throw new Error('Free tier not found');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      tierId: freeTier.id,
      subscriptionExpiresAt: null
    },
    include: { tier: true }
  });

  return {
    success: true,
    tier: updatedUser.tier.name
  };
}

/**
 * Seed priority tiers (run once during setup)
 */
export async function seedPriorityTiers(): Promise<void> {
  await prisma.priorityTier.createMany({
    data: [
      {
        name: 'free',
        tokensPerMinute: 10000,      // 10K TPM
        tokensPerMonth: 30000,       // 30K lifetime
        price: 0,
        validityDays: 0              // Lifetime
      },
      {
        name: 'premium-monthly',
        tokensPerMinute: 150000,     // 150K TPM
        tokensPerMonth: 10000000,    // 10M per month
        price: 499,
        validityDays: 30
      },
      {
        name: 'premium-yearly',
        tokensPerMinute: 150000,     // 150K TPM
        tokensPerMonth: 10000000,    // 10M per month
        price: 1999,
        validityDays: 365
      }
    ],
    skipDuplicates: true
  });

  console.log('Priority tiers seeded successfully');
}

/**
 * Cleanup old token history (run as cron job)
 */
export async function cleanupOldTokenHistory(): Promise<number> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const deleted = await prisma.tokenHistory.deleteMany({
    where: {
      createdAt: { lt: fiveMinutesAgo }
    }
  });

  console.log(`Cleaned up ${deleted.count} old token history records`);
  return deleted.count;
}