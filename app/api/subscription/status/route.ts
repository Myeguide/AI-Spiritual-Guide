import { NextRequest, NextResponse } from 'next/server';
import { 
  getUserActiveSubscription,
  getUserSubscriptions 
} from '@/lib/prisma';
import { isSubscriptionActive } from '@/lib/services/razorpay';

/**
 * GET /api/subscriptions/status?userId=123
 * Get user's subscription status
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'userId is required' 
        },
        { status: 400 }
      );
    }

    // Validate userId is a string
    if (typeof userId !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid userId' 
        },
        { status: 400 }
      );
    }

    // Get active subscription
    const activeSubscription = await getUserActiveSubscription(userId);

    if (!activeSubscription) {
      return NextResponse.json({
        success: true,
        data: {
          hasActiveSubscription: false,
          subscription: null,
        },
      });
    }

    // Check if subscription is truly active
    const isActive = isSubscriptionActive({
      status: activeSubscription.status,
      end_date: activeSubscription.endDate,
    });

    return NextResponse.json({
      success: true,
      data: {
        hasActiveSubscription: isActive,
        subscription: {
          id: activeSubscription.id,
          planType: activeSubscription.planType,
          status: activeSubscription.status,
          amount: activeSubscription.amount,
          currency: activeSubscription.currency,
          startDate: activeSubscription.startDate,
          endDate: activeSubscription.endDate,
          nextBillingDate: activeSubscription.nextBillingDate,
          daysRemaining: activeSubscription.endDate 
            ? Math.ceil((new Date(activeSubscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null,
        },
      },
    });

  } catch (error) {
    console.error('Get subscription status error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch subscription status' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/subscriptions/history?userId=123
 * Get user's subscription history
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'userId is required' 
        },
        { status: 400 }
      );
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid userId' 
        },
        { status: 400 }
      );
    }

    // Get all subscriptions
    const subscriptions = await getUserSubscriptions(userId);

    return NextResponse.json({
      success: true,
      data: {
        subscriptions: subscriptions.map(sub => ({
          id: sub.id,
          planType: sub.planType,
          status: sub.status,
          amount: sub.amount,
          currency: sub.currency,
          startDate: sub.startDate,
          endDate: sub.endDate,
          cancelledAt: sub.cancelledAt,
          createdAt: sub.createdAt,
        })),
        total: subscriptions.length,
      },
    });

  } catch (error) {
    console.error('Get subscription history error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch subscription history' 
      },
      { status: 500 }
    );
  }
}