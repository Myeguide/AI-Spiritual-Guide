
import { prisma } from '@/lib/prisma'; // Adjust path to your prisma client
// import { SubscriptionStatus } from '@/lib/generated/prisma';
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


export async function seedSubscriptionTiers(): Promise<void> {
  await prisma.subscriptionTier.createMany({
    data: [
      {
        name: "Free",
        type: "free",
        totalRequests: 30000, // same as previous tokensPerMonth
        price: "0",
        validityDays: 0,
        description: "Perfect for trying out EternalGuide",
        features: [
          "5 free prompts",
          "Basic spiritual guidance",
          "Limited conversation history",
          "Community support",
        ],
      },
      {
        name: "Monthly",
        type: "premium-monthly",
        totalRequests: 1000000,
        price: "499",
        validityDays: 30,
        description: "Best for regular seekers",
        features: [
          "Unlimited conversations",
          "Advanced AI responses",
          "Full conversation history",
          "Priority support",
          "WhatsApp integration",
          "1M tokens per month",
        ],
      },
      {
        name: "Annual",
        type: "premium-yearly",
        totalRequests: 12000000,
        price: "1999",
        validityDays: 365,
        description: "Save 67% with annual plan",
        features: [
          "Everything in Monthly",
          "Save ₹4,000 annually",
          "Extended token limits (12M)",
          "Premium support",
          "Early access to new features",
          "Personalized guidance",
        ],
      },
      {
        name: "Family",
        type: "family",
        totalRequests: 50000000,
        price: "5999",
        validityDays: 365,
        description: "Share wisdom with your family",
        features: [
          "Everything in Annual",
          "Up to 4 family members",
          "Shared token pool (50M)",
          "Individual profiles & memories",
          "Family dashboard",
          "Dedicated support",
          "Perfect for spiritual families",
        ],
      },
    ],
    skipDuplicates: true,
  });
}

// Run using:
// npx tsx prisma/seedPriorityTiers.ts



// class DatabaseError extends Error {
//   constructor(message: string, public originalError?: any) {
//     super(message);
//     this.name = 'DatabaseError';
//   }
// }



/**
 * Create a new subscription
 */


export async function getPlanByType(planType: 'free' | 'premium-monthly' | 'premium-yearly') {
  try {
    const plan = await prisma.subscriptionTier.findUnique({
      where: { type: planType }
    });

    if (!plan) {
      throw new Error(`Plan ${planType} not found`);
    }

    return plan;
  } catch (error) {
    console.error('Error fetching plan:', error);
    throw error;
  }
}

/**
 * Cleanup old token history (run as cron job)
 */
