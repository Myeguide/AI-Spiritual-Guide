import { PricingPlan, PlanType } from '@/types/payment';

// Payment Configuration
export const PRICING_PLANS: Record<PlanType, PricingPlan> = {
    [PlanType.MONTHLY]: {
        id: 'monthly',
        name: 'Monthly Plan',
        amount: 49900, // Amount in paise (499 INR)
        currency: 'INR',
        period: 'monthly',
        interval: 1,
        description: 'Monthly subscription for AI Spiritual Chat',
        features: [
            'Unlimited spiritual guidance',
            'Daily meditation insights',
            'Personalized spiritual journey'
        ]
    },
    [PlanType.ANNUALLY]: {
        id: 'annually',
        name: 'Annual Plan',
        amount: 199900, // Amount in paise (1999 INR)
        currency: 'INR',
        period: 'yearly',
        interval: 1,
        description: 'Annual subscription for AI Spiritual Chat (Save 67%)',
        features: [
            'All Monthly Plan features',
            'Priority support',
            'Exclusive content access',
            'Save ₹3,989 per year'
        ]
    },
    [PlanType.FAMILY]: {
        id: 'family',
        name: 'Family Plan',
        amount: 599900, // Amount in paise (5999 INR)
        currency: 'INR',
        period: 'yearly',
        interval: 1,
        description: 'Annual family plan for up to 5 members',
        features: [
            'All Annual Plan features',
            'Up to 5 family members',
            'Shared spiritual library',
            'Family meditation sessions',
            'Best value for families'
        ]
    }
};

// Razorpay Configuration
export const RAZORPAY_CONFIG = {
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
};

// Validate environment variables
export function validateConfig(): void {
    const required = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'DATABASE_URL'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

// Helper function to get plan by ID
export function getPlanById(planId: string): PricingPlan | null {
    return PRICING_PLANS[planId as PlanType] || null;
}

// Helper function to validate plan ID
export function isValidPlan(planId: string): planId is PlanType {
    return planId in PRICING_PLANS;
}