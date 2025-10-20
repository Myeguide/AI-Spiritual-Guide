import { NextRequest, NextResponse } from 'next/server';
import {
    verifyPaymentSignature,
    fetchRazorpayPayment,
    calculateSubscriptionEndDate
} from '@/lib/services/razorpay';
import {
    updatePayment,
    getPaymentByOrderId,
    getSubscriptionById,
    updateSubscription
} from '@/lib/prisma';
import {
    PaymentStatus,
    SubscriptionStatus,
    PaymentError,
    DatabaseError,
    PlanType
} from '@/types/payment';

/**
 * POST /api/payments/verify
 * Verifies payment signature and updates subscription status
 */
export async function POST(req: NextRequest) {
    try {
        // Parse request body
        const body = await req.json();
        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            userId
        } = body;

        // Validate required fields
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required payment verification fields'
                },
                { status: 400 }
            );
        }

        // Verify payment signature
        const isValidSignature = verifyPaymentSignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!isValidSignature) {
            await updatePayment(razorpay_order_id, {
                razorpayPaymentId: razorpay_payment_id,
                status: PaymentStatus.FAILED,
            });

            return NextResponse.json(
                {
                    success: false,
                    error: 'Payment verification failed. Invalid signature.'
                },
                { status: 400 }
            );
        }

        // Fetch payment details from our database
        const payment = await getPaymentByOrderId(razorpay_order_id);
        if (!payment) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Payment record not found'
                },
                { status: 404 }
            );
        }

        // Verify userId matches
        if (payment.userId !== userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Unauthorized payment verification attempt'
                },
                { status: 403 }
            );
        }

        // Fetch payment details from Razorpay to get payment method
        let paymentMethod = 'unknown';
        try {
            const razorpayPayment = await fetchRazorpayPayment(razorpay_payment_id);
            paymentMethod = razorpayPayment.method;
        } catch (error) {
            console.error('Failed to fetch payment details:', error);
            // Continue anyway, payment is verified
        }

        // Update payment record
        await updatePayment(razorpay_order_id, {
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            status: PaymentStatus.CAPTURED,
            method: paymentMethod,
        });

        // Update subscription if exists
        if (payment.subscriptionId) {
            const subscription = await getSubscriptionById(payment.subscriptionId);

            if (subscription) {
                const startDate = new Date();
                const endDate = calculateSubscriptionEndDate(
                    subscription.planType as PlanType,
                    startDate
                );

                // Activate subscription
                await updateSubscription(subscription.id, {
                    status: SubscriptionStatus.ACTIVE,
                    startDate: startDate,
                    endDate: endDate,
                    nextBillingDate: endDate,
                });

                return NextResponse.json({
                    success: true,
                    message: 'Payment verified and subscription activated successfully',
                    data: {
                        paymentId: razorpay_payment_id,
                        subscriptionId: subscription.id,
                        planType: subscription.planType,
                        startDate: startDate.toISOString(),
                        endDate: endDate.toISOString(),
                    },
                });
            }
        }

        // Payment verified but no subscription (shouldn't happen in normal flow)
        return NextResponse.json({
            success: true,
            message: 'Payment verified successfully',
            data: {
                paymentId: razorpay_payment_id,
            },
        });

    } catch (error) {
        console.error('Payment verification error:', error);

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
                    error: 'Database error occurred during verification'
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Payment verification failed. Please contact support.'
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