import Razorpay from 'razorpay';
import crypto from 'crypto';
import { RAZORPAY_CONFIG } from '@/lib/config/payment.config';
import {
    PaymentError,
    RazorpayOrder,
    RazorpayPayment,
    PlanType
} from '@/types/payment';

// Initialize Razorpay instance
let razorpayInstance: Razorpay | null = null;

function getRazorpayInstance(): Razorpay {
    if (!razorpayInstance) {
        razorpayInstance = new Razorpay({
            key_id: RAZORPAY_CONFIG.key_id,
            key_secret: RAZORPAY_CONFIG.key_secret,
        });
    }
    return razorpayInstance;
}

// ============================================
// ORDER OPERATIONS
// ============================================

/**
 * Create a Razorpay order for payment
 */
export async function createRazorpayOrder(
    amount: string,
    currency: string,
    receipt: string,

    notes?: Record<string, any>
): Promise<RazorpayOrder> {
    try {
        const razorpay = getRazorpayInstance();
        const numeric = Number(String(amount).replace(/[^0-9.-]+/g, ''));
        if (Number.isNaN(numeric)) {
            throw new PaymentError('Invalid amount format', 'INVALID_AMOUNT', 400);
        }
        const amountInPaise = Math.round(numeric * 100); // integer paise

        const orderOptions = {
            amount: amountInPaise,
            currency: currency,
            receipt: receipt,
            notes: notes || {},
            payment_capture: 1, // Auto capture payment
        };

        const order = await razorpay.orders.create(orderOptions);
        return order as RazorpayOrder;
    }

    catch (error: any) {
        console.error('Razorpay order creation failed:', error);
        throw new PaymentError(
            error.error?.description || 'Failed to create payment order',
            'ORDER_CREATION_FAILED',
            500
        );
    }
}

/**
 * Fetch order details from Razorpay
 */
export async function fetchRazorpayOrder(orderId: string): Promise<RazorpayOrder> {
    try {
        const razorpay = getRazorpayInstance();
        const order = await razorpay.orders.fetch(orderId);
        return order as RazorpayOrder;
    }

    catch (error: any) {
        console.error('Failed to fetch order:', error);
        throw new PaymentError(
            'Failed to fetch order details',
            'ORDER_FETCH_FAILED',
            500
        );
    }
}

// ============================================
// PAYMENT VERIFICATION
// ============================================

/**
 * Verify payment signature from Razorpay
 * This is critical for security - ensures payment came from Razorpay
 */
export function verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
): boolean {
    try {
        const text = `${orderId}|${paymentId}`;
        const generatedSignature = crypto
            .createHmac('sha256', RAZORPAY_CONFIG.key_secret)
            .update(text)
            .digest('hex');

        return generatedSignature === signature;
    } catch (error) {
        console.error('Signature verification failed:', error);
        return false;
    }
}

// ============================================
// PAYMENT OPERATIONS
// ============================================

/**
 * Fetch payment details from Razorpay
 */
export async function fetchRazorpayPayment(
    paymentId: string
): Promise<RazorpayPayment> {
    try {
        const razorpay = getRazorpayInstance();
        const payment = await razorpay.payments.fetch(paymentId);
        return payment as RazorpayPayment;
    }

    catch (error: any) {
        console.error('Failed to fetch payment:', error);
        throw new PaymentError(
            'Failed to fetch payment details',
            'PAYMENT_FETCH_FAILED',
            500
        );
    }
}

/**
 * Capture a payment (if not auto-captured)
 */
export async function capturePayment(
    paymentId: string,
    amount: number,
    currency: string = 'INR'
): Promise<RazorpayPayment> {
    try {
        const razorpay = getRazorpayInstance();
        const payment = await razorpay.payments.capture(paymentId, amount, currency);
        return payment as RazorpayPayment;
    }

    catch (error: any) {
        console.error('Payment capture failed:', error);
        throw new PaymentError(
            error.error?.description || 'Failed to capture payment',
            'PAYMENT_CAPTURE_FAILED',
            500
        );
    }
}

/**
 * Refund a payment
 */
export async function refundPayment(
    paymentId: string,
    amount?: number,

    notes?: Record<string, any>

): Promise<any> {
    try {
        const razorpay = getRazorpayInstance();

        const refundOptions: any = {
            notes: notes || {},
        };

        if (amount) {
            refundOptions.amount = amount;
        }

        const refund = await razorpay.payments.refund(paymentId, refundOptions);
        return refund;

    } catch (error: any) {
        console.error('Refund failed:', error);
        throw new PaymentError(
            error.error?.description || 'Failed to process refund',
            'REFUND_FAILED',
            500
        );
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a unique receipt ID
 */
export function generateReceiptId(userId: string, planType: PlanType): string {
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
    const shortUserId = userId.substring(0, 6); // First 6 chars of userId

    // Map plan types to shorter codes

    // Format: rcpt_XXXXXX_XX_XXXXXXXX 
    // Example: rcpt_abc123_PM_12345678 (26 chars max)
    return `rcpt_${shortUserId}_${planType}_${timestamp}`;
}


/**
 * Format amount from paise to rupees for display
 */
export function formatAmount(amountInPaise: number): string {
    const rupees = amountInPaise / 100;
    return `₹${rupees.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

/**
 * Parse Razorpay error for user-friendly messages
 */

export function parseRazorpayError(error: any): string {
    if (error.error?.description) {
        return error.error.description;
    }

    if (error.error?.code) {
        const errorMessages: Record<string, string> = {
            'BAD_REQUEST_ERROR': 'Invalid payment request. Please try again.',
            'GATEWAY_ERROR': 'Payment gateway error. Please try again later.',
            'SERVER_ERROR': 'Server error occurred. Please try again.',
            'VALIDATION_ERROR': 'Invalid payment details provided.',
        };

        return errorMessages[error.error.code] || 'Payment failed. Please try again.';
    }

    return 'An unexpected error occurred. Please try again.';
}