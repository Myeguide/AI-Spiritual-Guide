import { AuthMiddleware } from "@/app/middleware/middleware";
import { PaymentService } from "@/lib/services/payment.service";
import { ApiResponse, PaymentMethodError } from "@/types/payment";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/payment-methods/:id
 * Get a specific payment method
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = AuthMiddleware(req);

    if ("error" in auth) {
      return NextResponse.json(auth, { status: auth.status });
    }
    const { userId } = auth;
    const { id } = await params;
    const paymentMethod = await PaymentService.getPaymentMethod(id, userId);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: paymentMethod,
    });
  } catch (error: any) {
    console.error("GET /api/payment-methods/:id error:", error);

    if (error instanceof PaymentMethodError) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to fetch payment method" },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = AuthMiddleware(req);

    if ("error" in auth) {
      return NextResponse.json(auth, { status: auth.status });
    }
    const { userId } = auth;

    const body = await req.json();
    const { id } = await params;

    const paymentMethod = await PaymentService.updatePayment(id, userId, body);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: paymentMethod,
      message: "Payment method updated successfully",
    });
  } catch (error: any) {
    console.error("PATCH /api/payment-methods/:id error:", error);

    if (error instanceof PaymentMethodError) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to update payment method" },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = AuthMiddleware(req);

    if ("error" in auth) {
      return NextResponse.json(auth, { status: auth.status });
    }
    const { userId } = auth;
    const { id } = await params;
    await PaymentService.deletePaymentMethod(id, userId);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Payment method deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE /api/payment-methods/:id error:", error);

    if (error instanceof PaymentMethodError) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to delete payment method" },
      { status: 500 }
    );
  }
}
