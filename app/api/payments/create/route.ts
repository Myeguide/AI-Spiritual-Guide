import { NextRequest, NextResponse } from 'next/server';
import {
    createRazorpayOrder,
    generateReceiptId
} from '@/lib/services/razorpay';
import {
    RAZORPAY_CONFIG
} from '@/lib/config/payment.config';
import {
    PlanType,
    PaymentError,
    DatabaseError
} from '@/types/payment';
import { getPlanByType } from '@/lib/rate-limiter';
import { SubscriptionService } from '@/lib/services/subscription.service';
import { PaymentService } from '@/lib/services/payment.service';

/**
 * POST /api/payments/create-order
 * Creates a Razorpay order for subscription payment
 */
export async function POST(req: NextRequest) {
    try {
        // Parse request body
        const body = await req.json();
        const { planType, userId } = body;

        // Validate required fields
        if (!planType || !userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields: planType and userId'
                },
                { status: 400 }
            );
        }


        // Validate userId is a string (cuid)
        if (typeof userId !== 'string' || !userId.trim()) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid userId. Must be a valid string'
                },
                { status: 400 }
            );
        }

        const plan = await getPlanByType(planType);
        if (!plan) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Plan not found'
                },
                { status: 404 }
            );
        }

        // Create subscription record in database (status: pending)
        const subscription = await SubscriptionService.createSubscription(plan, userId);

        // Generate receipt ID
        const receiptId = generateReceiptId(userId, planType as PlanType);

        // Create Razorpay order
        const order = await createRazorpayOrder(
            plan.price,
            plan.currency,
            receiptId,
            {
                userId: userId,
                subscriptionId: subscription.id,
                planType: planType,
                planName: plan.name,
            }
        );

        // Create payment record in database
        await PaymentService.createPayment({
            userId: userId,
            subscriptionId: subscription.id,
            razorpayOrderId: order.id,
            amount: plan.price,
            currency: plan.currency,
            description: `Payment for ${plan.name}`,
            notes: {
                planType: planType,
                subscriptionId: subscription.id,
            },
        });

        // Return order details to frontend
        return NextResponse.json({
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                key: RAZORPAY_CONFIG.key_id,
                subscriptionId: subscription.id,
                planName: plan.name,
                receipt: receiptId,
            },
        });

    } catch (error) {
        console.error('Create order error:', error);

        if (error instanceof PaymentError) {
            return NextResponse.json(
                {
                    success: false,
                    error: error.message
                },
                { status: error.statusCode }
            );
        }

        if (error instanceof DatabaseError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Database error occurred. Please try again.'
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to create order. Please try again.'
            },
            { status: 500 }
        );
    }
}

// Handle unsupported methods
export async function GET() {
    return NextResponse.json(
        {
            success: false,
            error: 'Method not allowed'
        },
        { status: 405 }
    );
}