import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription.service';
import { z } from 'zod';
import { SubscriptionStatus } from '@/types/payment';
import { prisma } from '@/lib/prisma';

const statusQuerySchema = z.object({
    userId: z.string().min(1, 'User ID is required'),
});

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        // Validate with Zod
        const { userId: validatedUserId } = statusQuerySchema.parse({ userId });

        // Get user's subscription (active or expired)
        const totalSubscriptionsCount = await prisma.subscription.count({
            where: { userId: validatedUserId }
        });
        const subscription = await SubscriptionService.getActiveSubscription(validatedUserId);

        if (!subscription) {
            return NextResponse.json({
                success: true,
                data: {
                    hasActiveSubscription: false,
                    subscription: null,
                    message: 'No subscription found for this user',
                    totalSubscriptionsCount
                },
            });
        }

        //total subscription can be used differentiate bw 

        // Check if subscription is expired or requests exhausted
        const isExpired = SubscriptionService.isSubscriptionExpired(subscription);
        const requestsRemaining = subscription.totalRequests - subscription.requestsUsed;

        // Auto-update status if expired but still marked as ACTIVE
        if (isExpired && subscription.status === SubscriptionStatus.ACTIVE) {
            await prisma.subscription.update({
                where: { id: subscription.id },
                data: {
                    status: SubscriptionStatus.EXPIRED,
                    expiresAt: new Date()
                }
            });
            subscription.status = SubscriptionStatus.EXPIRED;
        }

        // Determine subscription state
        const hasActiveSubscription = subscription.status === SubscriptionStatus.ACTIVE && !isExpired && requestsRemaining > 0;

        // Build response with detailed info
        let statusMessage = '';
        if (!hasActiveSubscription) {
            if (subscription.expiresAt && subscription.expiresAt < new Date()) {
                statusMessage = 'Subscription expired';
            } else if (requestsRemaining <= 0) {
                statusMessage = 'All requests used';
            } else {
                statusMessage = 'Subscription inactive';
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                hasActiveSubscription,
                subscription: subscription,
                statusMessage: statusMessage || 'Active',
                isExpired,
                totalSubscriptionsCount
            },
        });

    } catch (error) {
        console.error('❌ Get subscription status error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    error: error.errors[0].message
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch subscription status'
            },
            { status: 500 }
        );
    }
}