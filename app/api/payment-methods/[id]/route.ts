import { verifyToken } from "@/lib/generate-token";
import { PaymentService } from "@/lib/services/payment.service";
import { ApiResponse, PaymentMethodError } from "@/types/payment";
import { NextRequest, NextResponse } from "next/server";



/**
 * GET /api/payment-methods/:id
 * Get a specific payment method
 */
export async function GET(
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


        const paymentMethod = await PaymentService.getPaymentMethod(params.id, userId);

        return NextResponse.json<ApiResponse>({
            success: true,
            data: paymentMethod,
        });
    } catch (error: any) {
        console.error('GET /api/payment-methods/:id error:', error);

        if (error instanceof PaymentMethodError) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: error.message },
                { status: error.statusCode }
            );
        }

        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Failed to fetch payment method' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/payment-methods/:id
 * Update a payment method
 */
export async function PATCH(
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

        const body = await req.json();

        const paymentMethod = await PaymentService.updatePayment(params.id, userId, body);

        return NextResponse.json<ApiResponse>({
            success: true,
            data: paymentMethod,
            message: 'Payment method updated successfully',
        });
    } catch (error: any) {
        console.error('PATCH /api/payment-methods/:id error:', error);

        if (error instanceof PaymentMethodError) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: error.message },
                { status: error.statusCode }
            );
        }

        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Failed to update payment method' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/payment-methods/:id
 * Delete a payment method
 */
export async function DELETE(
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


        await PaymentService.deletePaymentMethod(params.id, userId);

        return NextResponse.json<ApiResponse>({
            success: true,
            message: 'Payment method deleted successfully',
        });
    } catch (error: any) {
        console.error('DELETE /api/payment-methods/:id error:', error);

        if (error instanceof PaymentMethodError) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: error.message },
                { status: error.statusCode }
            );
        }

        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Failed to delete payment method' },
            { status: 500 }
        );
    }
}