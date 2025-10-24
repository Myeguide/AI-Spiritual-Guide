import { NextRequest, NextResponse } from 'next/server';

import { PaymentService } from '@/lib/services/payment.service';
import { SubscriptionService } from '@/lib/services/subscription.service';
import { z } from 'zod';
import { PaymentError, DatabaseError, PaymentStatus } from '@/types/payment';
import { verifyPaymentSchema } from '@/lib/validators/payment.validator';
import { fetchRazorpayPayment, verifyPaymentSignature } from '@/lib/services/razorpay';

export async function POST(req: NextRequest) {
    try {
        // Parse and validate request body
        const body = await req.json();
        const validatedData = verifyPaymentSchema.parse(body);

        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            userId
        } = validatedData;

        // 🔐 Verify payment signature
        const isValidSignature = verifyPaymentSignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!isValidSignature) {
            // Update payment as failed
            await PaymentService.updatePayment(razorpay_order_id, {
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

        // 📦 Fetch payment details from database
        const payment = await PaymentService.getPaymentByOrderId(razorpay_order_id);

        if (!payment) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Payment record not found'
                },
                { status: 404 }
            );
        }

        // 🔒 Verify userId matches (security check)
        if (payment.userId !== userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Unauthorized payment verification attempt'
                },
                { status: 403 }
            );
        }

        // 💳 Fetch payment method from Razorpay
        let paymentMethod = 'unknown';
        try {
            const razorpayPayment = await fetchRazorpayPayment(razorpay_payment_id);
            paymentMethod = razorpayPayment.method;
        } catch (error) {
            console.error('⚠️ Failed to fetch payment details from Razorpay:', error);
            // Continue anyway, payment signature is verified
        }

        // ✅ Update payment record as captured
        await PaymentService.updatePayment(razorpay_order_id, {
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            status: PaymentStatus.CAPTURED,
            method: paymentMethod,
        });

        // 📋 Activate subscription if exists
        if (!payment.subscriptionId) {
            // Payment verified but no subscription (edge case)
            return NextResponse.json({
                success: true,
                message: 'Payment verified successfully',
                data: {
                    paymentId: razorpay_payment_id,
                },
            });
        }

        // ✅ Activate the subscription using your existing method
        const activatedSubscription = await SubscriptionService.activateSubscription(
            payment.subscriptionId
        );

        return NextResponse.json({
            success: true,
            message: 'Payment verified and subscription activated successfully',
            data: {
                paymentId: razorpay_payment_id,
                subscriptionId: activatedSubscription.id,
                planType: activatedSubscription.planType,
                startDate: activatedSubscription.startDate?.toISOString(),
                expiresAt: activatedSubscription.expiresAt?.toISOString(),
                totalRequests: activatedSubscription.totalRequests,
                requestsUsed: activatedSubscription.requestsUsed,
            },
        });

    } catch (error) {
        console.error('❌ Payment verification error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    error: error.errors[0].message
                },
                { status: 400 }
            );
        }

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