import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/services/payment.service';
import {
    CreatePaymentMethodDTO,
    ApiResponse,
    PaymentMethodError,
} from '@/types/payment';
import { AuthMiddleware } from '@/app/middleware/middleware';

/**
 * GET /api/payment-methods
 * Get all payment methods for the authenticated user
 */
export async function GET(req: NextRequest) {
    try {
        const auth = AuthMiddleware(req);

        if ("error" in auth) {
            return NextResponse.json(auth, { status: auth.status });
        }
        const { userId } = auth;

        const paymentMethods = await PaymentService.getUserPaymentMethods(userId);
        console.log('Payment Methods:', paymentMethods);

        const defaultMethod = await PaymentService.getDefaultPaymentMethod(userId);
        console.log('Default Payment Method:', defaultMethod);

        return NextResponse.json<ApiResponse>({
            success: true,
            data: {
                paymentMethods,
                defaultPaymentMethodId: defaultMethod?.id || null,
            },
        });
    } catch (error: any) {
        console.error('GET /api/payment-methods error:', error);
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: error.message || 'Failed to fetch payment methods',
            },
            { status: error.statusCode || 500 }
        );
    }
}

/**
 * POST /api/payment-methods
 * Create a new payment method
 */
export async function POST(req: NextRequest) {
    try {
        const auth = AuthMiddleware(req);

        if ("error" in auth) {
            return NextResponse.json(auth, { status: auth.status });
        }
        const { userId } = auth;
        
        const body = await req.json();
        const data: CreatePaymentMethodDTO = body;

        const paymentMethod = await PaymentService.createPayment(userId, data);

        return NextResponse.json<ApiResponse>(
            {
                success: true,
                data: paymentMethod,
                message: 'Payment method added successfully',
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('POST /api/payment-methods error:', error);

        if (error instanceof PaymentMethodError) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: error.message },
                { status: error.statusCode }
            );
        }

        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: error.message || 'Failed to create payment method',
            },
            { status: 500 }
        );
    }
}
