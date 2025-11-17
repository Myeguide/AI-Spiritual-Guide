import { verifyToken } from "@/lib/generate-token";
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