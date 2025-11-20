import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, RazorpayError } from '@/types/payment';
import { fetchRazorpayPayment, savePaymentMethodFromPayment, verifyPaymentSignature } from '@/lib/services/razorpay';
import { prisma } from '@/lib/prisma';
import { AuthMiddleware } from '@/app/middleware/middleware';

export async function POST(req: NextRequest) {
    try {
        const auth = AuthMiddleware(req);

        if ("error" in auth) {
            return NextResponse.json(auth, { status: auth.status });
        }
        const { userId } = auth;

        // Parse and validate request body
        const body = await req.json();
        const {
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature,
            subscriptionId,
            savePaymentMethod = false,
            paymentMethodNickname,
        } = body;

        if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Invalid payment data' },
                { status: 400 }
            );
        }

        // Verify signature
        const isValid = verifyPaymentSignature(
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature
        );

        if (!isValid) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Invalid payment signature' },
                { status: 400 }
            );
        }

        // Fetch payment details from Razorpay
        const paymentDetails = await fetchRazorpayPayment(
            razorpayPaymentId
        );

        // Find the payment record
        const payment = await prisma.payment.findFirst({
            where: {
                razorpayOrderId,
                userId: userId,
            },
            include: {
                subscription: {
                    include: { tier: true },
                },
            },
        });

        if (!payment) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Payment not found' },
                { status: 404 }
            );
        }
        // Update payment record
        const updatedPayment = await prisma.payment.update({
            where: { id: payment.id },
            data: {
                razorpayPaymentId,
                razorpaySignature,
                status: paymentDetails.captured ? 'CAPTURED' : 'AUTHORIZED',
                method: paymentDetails.method,
                notes: {
                    ...(payment.notes as any),
                    paymentDetails: {
                        method: paymentDetails.method,
                        bank: paymentDetails.bank,
                        wallet: paymentDetails.wallet,
                        vpa: paymentDetails.vpa,
                        cardLast4: paymentDetails.card?.last4,
                        cardNetwork: paymentDetails.card?.network,
                        token_id: paymentDetails.token_id,
                        customerId: paymentDetails.customer_id,
                    },
                },
            },
        });
        await prisma.subscription.updateMany({
            where: {
                userId: userId,
                planType: 'free',
                status: 'ACTIVE',
            },
            data: {
                status: 'EXPIRED',
                cancelledAt: new Date(),
            },
        });

        // Calculate expiry date
        const startDate = new Date();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + payment.subscription.tier.validityDays);

        // Update subscription
        const updatedSubscription = await prisma.subscription.update({
            where: { id: payment.subscriptionId },
            data: {
                status: 'ACTIVE',
                startDate,
                expiresAt,
            },
        });

        // Update user's active subscription
        await prisma.user.update({
            where: { id: userId },
            data: {
                activeSubscriptionId: updatedSubscription.id,
            },
        });

        // Save payment method if requested
        let savedPaymentMethod: { id: string; type: string, cardLast4: string, cardTokenId: string } | null = null;
        if (savePaymentMethod && paymentDetails.method === 'card') {
            try {
                savedPaymentMethod = await savePaymentMethodFromPayment(
                    userId,
                    razorpayPaymentId,
                    paymentMethodNickname
                );
            } catch (error) {
                console.error('Failed to save payment method:', error);
                // Don't fail the payment verification if saving payment method fails
            }
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            data: {
                subscription: updatedSubscription,
                payment: {
                    id: payment.id,
                    status: updatedPayment.status,
                    method: paymentDetails.method,
                },
                savedPaymentMethod: savedPaymentMethod
                    ? {
                        id: savedPaymentMethod.id,
                        type: savedPaymentMethod.type,
                        cardLast4: savedPaymentMethod.cardLast4,
                        hasToken: !!savedPaymentMethod.cardTokenId,
                    }
                    : null,
            },
            message: 'Payment verified successfully',
        });
    } catch (error: any) {
        console.error('POST /api/payments/verify error:', error);

        if (error instanceof RazorpayError) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: error.message },
                { status: error.statusCode }
            );
        }

        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Failed to verify payment' },
            { status: 500 }
        );
    }
}