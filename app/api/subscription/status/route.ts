import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription.service';
import { z } from 'zod';

const statusQuerySchema = z.object({
    userId: z.string().min(1, 'User ID is required'),
});

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        // Validate with Zod
        const { userId: validatedUserId } = statusQuerySchema.parse({ userId });

        // Get active subscription using your existing service
        const activeSubscription = await SubscriptionService.getActiveSubscription(validatedUserId);

        if (!activeSubscription) {
            return NextResponse.json({
                success: true,
                data: {
                    hasActiveSubscription: false,
                    subscription: null,
                },
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                hasActiveSubscription: true,
                subscription: activeSubscription,
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