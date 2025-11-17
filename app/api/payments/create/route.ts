import { NextRequest, NextResponse } from 'next/server';
import { createRazorpayOrder } from '@/lib/services/razorpay';
import { ApiResponse, RazorpayError } from '@/types/payment';
import { verifyToken } from '@/lib/generate-token';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/payments/create-order
 * Creates a Razorpay order for subscription payment
 */
export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.split(" ")[1];

        if (!token) {
            return NextResponse.json(
                { error: "Unauthorized - No token provided" },
                { status: 401 }
            );
        }

        const verified = verifyToken(token);
        if (!verified) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            )
        }
        const userId = verified.userId;
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized - Invalid token" },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await req.json();
        const { subscriptionId, tierId } = body;

        if (!subscriptionId && !tierId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Subscription ID or Tier ID is required' },
                { status: 400 }
            );
        }

        let subscription: any;
        let tier: any;

        // If subscription exists, fetch it
        // If subscription exists, fetch it
        if (subscriptionId) {
            subscription = await prisma.subscription.findUnique({
                where: { id: subscriptionId },
                include: { tier: true },
            });

            if (!subscription || subscription.userId !== userId) {
                return NextResponse.json<ApiResponse>(
                    { success: false, error: 'Subscription not found' },
                    { status: 404 }
                );
            }

            // If upgrading (tierId is also provided)
            if (tierId && tierId !== subscription.tierId) {
                // Fetch the new tier
                const newTier = await prisma.subscriptionTier.findUnique({
                    where: { id: tierId },
                });

                if (!newTier) {
                    return NextResponse.json<ApiResponse>(
                        { success: false, error: 'New subscription tier not found' },
                        { status: 404 }
                    );
                }

                // Create new paid subscription
                subscription = await prisma.subscription.create({
                    data: {
                        userId: userId,
                        tierId: newTier.id,
                        planType: newTier.type,
                        amount: newTier.price,
                        currency: newTier.currency,
                        totalRequests: newTier.totalRequests,
                        status: 'PENDING',
                    },
                });

                tier = newTier;
            } else {
                // Just using existing subscription
                tier = subscription.tier;
            }
        }

        // Create Razorpay order
        const order = await createRazorpayOrder({
            amount: tier.price,
            currency: tier.currency,
            subscriptionId: subscription.id,
            userId: userId,
            notes: {
                tierName: tier.name,
                planType: tier.type,
            },
        });

        // Create payment record
        const payment = await prisma.payment.create({
            data: {
                userId: userId,
                subscriptionId: subscription.id,
                razorpayOrderId: order.id,
                amount: tier.price,
                currency: tier.currency,
                status: 'CREATED',
                description: `Payment for ${tier.name} subscription`,
                notes: {
                    orderId: order.id,
                    tierName: tier.name,
                },
            },
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                subscriptionId: subscription.id,
                paymentId: payment.id,
                keyId: process.env.RAZORPAY_KEY_ID,
            },
        });
    } catch (error: any) {
        console.error('POST /api/payments/create error:', error);

        if (error instanceof RazorpayError) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: error.message },
                { status: error.statusCode }
            );
        }

        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Failed to create payment order' },
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