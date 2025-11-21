import { AuthMiddleware } from "@/app/middleware/middleware";
import { PaymentService } from "@/lib/services/payment.service";
import { ApiResponse, PaymentMethodError } from "@/types/payment";
import { NextRequest, NextResponse } from "next/server";


/**
 * POST /api/payment-methods/:id/set-default
 * Set a payment method as default
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = AuthMiddleware(req);

        if ("error" in auth) {
            return NextResponse.json(auth, { status: auth.status });
        }
        const { userId } = auth;

        // ✅ ADD THIS LINE - await params first
        const { id } = await params;

        // ✅ CHANGE THIS LINE - use `id` instead of `params.id`
        const paymentMethod = await PaymentService.setDefaultPaymentMethod(id, userId);

        return NextResponse.json<ApiResponse>({
            success: true,
            data: paymentMethod,
            message: 'Default payment method updated',
        });
    } catch (error: any) {
        console.error('POST /api/payment-methods/:id/set-default error:', error);

        if (error instanceof PaymentMethodError) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: error.message },
                { status: error.statusCode }
            );
        }

        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Failed to set default payment method' },
            { status: 500 }
        );
    }
}