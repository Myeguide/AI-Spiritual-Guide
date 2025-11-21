import { AuthMiddleware } from "@/app/middleware/middleware";
import { PaymentService } from "@/lib/services/payment.service";
import { savePaymentMethodFromPayment } from "@/lib/services/razorpay";
import { ApiResponse, PaymentMethodError } from "@/types/payment";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/payment-methods/save-from-payment
 * Save payment method from a successful Razorpay payment
 */
export async function POST(req: NextRequest) {
    try {
        const auth = AuthMiddleware(req);

        if ("error" in auth) {
            return NextResponse.json(auth, { status: auth.status });
        }
        const { userId } = auth;

        const body = await req.json();
        const { razorpayPaymentId, nickname } = body;

        if (!razorpayPaymentId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Payment ID is required' },
                { status: 400 }
            );
        }

        const paymentMethod = await savePaymentMethodFromPayment(userId, razorpayPaymentId, nickname);

        return NextResponse.json<ApiResponse>(
            {
                success: true,
                data: PaymentService['formatPaymentMethodResponse'](paymentMethod),
                message: 'Payment method saved successfully',
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('POST /api/payment-methods/save-from-payment error:', error);

        if (error instanceof PaymentMethodError) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: error.message },
                { status: error.statusCode }
            );
        }

        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Failed to save payment method' },
            { status: 500 }
        );
    }
}