import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, RazorpayError } from '@/types/payment';
import { fetchRazorpayPayment, savePaymentMethodFromPayment, verifyPaymentSignature } from '@/lib/services/razorpay';
import { verifyToken } from '@/lib/generate-token';
import { prisma } from '@/lib/prisma';

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
        await prisma.payment.update({
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
        let savedPaymentMethod: { id: string; type: string } | null = null;
        if (savePaymentMethod) {
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
                    status: 'CAPTURED',
                    method: paymentDetails.method,
                },
                savedPaymentMethod: savedPaymentMethod
                    ? {
                        id: savedPaymentMethod.id,
                        type: savedPaymentMethod.type,
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