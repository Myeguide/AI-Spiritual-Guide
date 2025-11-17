import { verifyToken } from "@/lib/generate-token";
import { PaymentService } from "@/lib/services/payment.service";
import { ApiResponse, PaymentMethodError } from "@/types/payment";
import { NextRequest, NextResponse } from "next/server";


/**
 * POST /api/payment-methods/:id/set-default
 * Set a payment method as default
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
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

        const paymentMethod = await PaymentService.setDefaultPaymentMethod(params.id, userId);

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