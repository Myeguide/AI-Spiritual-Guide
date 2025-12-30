import { NextRequest, NextResponse } from 'next/server';
import { createRazorpayOrder, getCardToken } from '@/lib/services/razorpay';
import { ApiResponse, RazorpayError } from '@/types/payment';
import { prisma } from '@/lib/prisma';
import { AuthMiddleware } from '@/app/middleware/middleware';

/**
 * POST /api/payments/create-order
 * Creates a Razorpay order for subscription payment
 */
export async function POST(req: NextRequest) {
    try {
        const auth = AuthMiddleware(req);

        if ("error" in auth) {
            return NextResponse.json(auth, { status: auth.status });
        }
        const { userId } = auth;

        // Parse request body
        const body = await req.json();
        const { subscriptionId, tierId, paymentMethodId } = body;
        let paymentMethod: any = null;

        // ⭐ Fetch payment method if provided
        if (paymentMethodId) {
            paymentMethod = await prisma.paymentMethod.findUnique({
                where: {
                    id: paymentMethodId,
                    userId: userId,
                    isActive: true,
                },
            });
        }

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
        } else if (tierId) {
            tier = await prisma.subscriptionTier.findUnique({
                where: { id: tierId },
            });

            if (!tier) {
                return NextResponse.json<ApiResponse>(
                    { success: false, error: 'Subscription tier not found' },
                    { status: 404 }
                );
            }

            // Create new subscription
            subscription = await prisma.subscription.create({
                data: {
                    userId: userId,
                    tierId: tier.id,
                    planType: tier.type,
                    amount: tier.price,
                    currency: tier.currency,
                    totalRequests: tier.totalRequests,
                    status: 'PENDING',
                },
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
            },
        });

        if (!user) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        let customerId: string | null = null;
        try {
            customerId = await getOrCreateCustomerId(userId);
        } catch (error) {
            console.error('⚠️ Failed to create customer, continuing without it', error);
            // Continue without customer - single payment mode
            customerId = '';
        }
        // Create Razorpay order
        const order = await createRazorpayOrder(
            {
                amount: tier.price,
                currency: tier.currency,
                subscriptionId: subscription.id,
                userId: userId,
                notes: {
                    tierName: tier.name,
                    planType: tier.type,
                    paymentMethodId: paymentMethodId || 'new',
                },
            }, customerId || undefined
        );

        // Create payment record
        const payment = await prisma.payment.create({
            data: {
                userId: userId,
                subscriptionId: subscription.id,
                paymentMethodId: paymentMethodId || null,
                razorpayOrderId: order.id,
                amount: tier.price,
                currency: tier.currency,
                status: 'CREATED',
                description: `Payment for ${tier.name} subscription`,
                notes: {
                    orderId: order.id,
                    tierName: tier.name,
                    customerId: customerId,
                },
            },
        });
        const response = {
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                subscriptionId: subscription.id,
                paymentId: payment.id,
                keyId: process.env.RAZORPAY_KEY_ID,
                customerId: customerId,
                userEmail: user.email,
                userName: `${user.firstName} ${user.lastName}`,
                userPhone: user.phoneNumber,
            },
        };

        return NextResponse.json<ApiResponse>(response);
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


// Add this helper function
async function getOrCreateCustomerId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { paymentMethods: { where: { isActive: true }, take: 1 } }
    });

    return user?.paymentMethods[0]?.customerId ?? null;
}