import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { RAZORPAY_CONFIG } from '@/lib/config/payment.config';
import {
    PaymentError,
    RazorpayOrder,
    PlanType,
    RazorpayOrderOptions,
    RazorpayPaymentDetails,
    RazorpayOrderResponse,
    CreateRazorpayOrderDTO,
    CreatePaymentMethodDTO,
    RazorpayError,
    PaymentMethodError,
} from '@/types/payment';
import { PaymentMethodType } from '@/lib/generated/prisma';

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
    data: CreateRazorpayOrderDTO,
    customerId?: string,
): Promise<RazorpayOrderResponse & { customer_id?: string }> {
    try {
        const razorpay = getRazorpayInstance();
        const numeric = Number(String(data.amount).replace(/[^0-9.-]+/g, ''));
        if (Number.isNaN(numeric)) {
            throw new PaymentError('Invalid amount format', 'INVALID_AMOUNT', 400);
        }
        const amountInPaise = Math.round(numeric * 100); // integer paise

        const orderOptions: RazorpayOrderOptions = {
            amount: amountInPaise,
            currency: data.currency,
            receipt: `order_${Date.now()}`,
            notes: {
                subscriptionId: data.subscriptionId,
                userId: data.userId,
                ...data.notes,
            },
        };

        if (customerId) {
            orderOptions.customer_id = customerId;
        }

        const order = await razorpay.orders.create(orderOptions);

        return {
            ...(order as RazorpayOrderResponse),
            customer_id: customerId,
        };
    }

    catch (error: any) {
        console.error('Failed to create Razorpay order:', error);
        throw new RazorpayError(
            error.message || 'failed to create Razorpay order',
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
): Promise<RazorpayPaymentDetails> {
    try {
        const razorpay = getRazorpayInstance();
        const payment = await razorpay.payments.fetch(paymentId);
        return payment as RazorpayPaymentDetails;
    }
    catch (error: any) {
        throw new RazorpayError(
            error.message || 'Failed to fetch payment details',
            'PAYMENT_FETCH_FAILED',
            500
        );
    }
}

/**
 * Extract payment method details from Razorpay payment
 */
export function extractPaymentMethodDetails(
    payment: RazorpayPaymentDetails,
    nickname?: string
): CreatePaymentMethodDTO | null {
    const method = payment.method;

    switch (method) {
        case 'card':
            if (!payment.card) return null;

            return {
                type: PaymentMethodType.CARD,
                cardType: payment.card.type,
                cardNetwork: payment.card.network,
                cardLast4: payment.card.last4,
                cardIssuer: payment.card.issuer || undefined,
                cardName: payment.card.name || undefined,
                cardTokenId: payment.token_id || undefined,
                cardFingerPrint: payment.card.id || undefined,
                nickname: nickname || `${payment.card.network} •••• ${payment.card.last4}`,
            };

        case 'upi':
            if (!payment.vpa) return null;

            return {
                type: PaymentMethodType.UPI,
                upiVpa: payment.vpa,
                nickname: nickname || payment.vpa,
            };

        case 'netbanking':
            if (!payment.bank) return null;

            return {
                type: PaymentMethodType.NETBANKING,
                bankName: payment.bank,
                nickname: nickname || payment.bank,
            };

        case 'wallet':
            if (!payment.wallet) return null;

            return {
                type: PaymentMethodType.WALLET,
                walletName: payment.wallet,
                nickname: nickname || payment.wallet,
            };

        default:
            return null;
    }
}

/**
 * Save payment method from Razorpay payment
 */
export async function savePaymentMethodFromPayment(
    userId: string,
    paymentId: string,
    nickname?: string
): Promise<any> {
    try {
        // Fetch payment details from Razorpay
        const payment = await fetchRazorpayPayment(paymentId);

        // Extract payment method details
        const paymentMethodData = extractPaymentMethodDetails(
            payment, nickname
        );

        if (!paymentMethodData) {
            throw new PaymentMethodError(
                'Unable to extract payment method from payment',
                'INVALID_PAYMENT_METHOD',
                400
            );
        }

        // Check for duplicate payment method
        const existingMethod = await findDuplicatePaymentMethod(
            userId,
            paymentMethodData
        );

        if (existingMethod) {
            if (paymentMethodData.cardTokenId && payment.token_id) {
                return await prisma.paymentMethod.update({
                    where: { id: existingMethod.id },
                    data: {
                        cardTokenId: payment.token_id,
                        updatedAt: new Date(),
                    },
                });
            }
            return existingMethod;
        }

        // Check if this should be the default (first payment method)
        const existingMethods = await prisma.paymentMethod.count({
            where: { userId, isActive: true },
        });

        const isDefault = existingMethods === 0;

        // If setting as default, unset other defaults
        if (isDefault) {
            await prisma.paymentMethod.updateMany({
                where: { userId, isDefault: true },
                data: { isDefault: false },
            });
        }

        // Create new payment method
        const paymentMethod = await prisma.paymentMethod.create({
            data: {
                userId,
                ...paymentMethodData,
                isDefault,
                isActive: true,
            },
        });

        return paymentMethod;
    } catch (error: any) {
        if (error instanceof PaymentMethodError || error instanceof RazorpayError) {
            throw error;
        }
        throw new PaymentMethodError(
            error.message || 'Failed to save payment method',
            'SAVE_FAILED',
            500
        );
    }
}

/**
 * Find duplicate payment method 
 */
export async function findDuplicatePaymentMethod(
    userId: string,
    paymentMethodData: CreatePaymentMethodDTO
) {
    const where: any = { userId, isActive: true, type: paymentMethodData.type };

    switch (paymentMethodData.type) {
        case PaymentMethodType.CARD:
            if (paymentMethodData.cardFingerPrint) {
                where.cardFingerPrint = paymentMethodData.cardFingerPrint;
            } else if (paymentMethodData.cardLast4) {
                where.cardLast4 = paymentMethodData.cardLast4;
                where.cardNetwork = paymentMethodData.cardNetwork;
            }
            break;

        case PaymentMethodType.UPI:
            where.upiVpa = paymentMethodData.upiVpa;
            break;

        case PaymentMethodType.NETBANKING:
            where.bankName = paymentMethodData.bankName;
            break;

        case PaymentMethodType.WALLET:
            where.walletName = paymentMethodData.walletName;
            break;
    }

    return await prisma.paymentMethod.findFirst({ where });
}

/**
 * Capture a payment (if not auto-captured)
 */
export async function capturePayment(
    paymentId: string,
    amount: number,
    currency: string = 'INR'
) {
    try {
        const razorpay = getRazorpayInstance();
        const capture = await razorpay.payments.capture(paymentId, amount, currency);
        return capture;
    }
    catch (error: any) {
        throw new RazorpayError(
            error.message || 'Failed to capture payment',
            'CAPTURE_FAILED',
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
) {
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
        throw new RazorpayError(
            error.message || 'Failed to refund payment',
            'REFUND_FAILED',
            500
        );
    }
}

/**
   * Get card token for prefilling in Razorpay
   */
export async function getCardToken(userId: string, paymentMethodId: string): Promise<string | null> {
    try {
        const paymentMethod = await prisma.paymentMethod.findFirst({
            where: {
                id: paymentMethodId,
                userId,
                isActive: true,
                type: PaymentMethodType.CARD,
            },
            select: {
                cardTokenId: true,
                cardLast4: true,
                cardNetwork: true,
            },
        });

        if (!paymentMethod || !paymentMethod.cardTokenId) {
            return null;
        }

        return paymentMethod.cardTokenId;
    } catch (error: any) {
        console.error('Error getting card token:', error);
        return null;
    }
}

/**
   * Create or fetch customer for token payments
   */
export async function createOrGetCustomer(user: any): Promise<any> {
    try {
        const existingCustomer = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
            }
        });
        if (!existingCustomer) {
            throw new Error('User not found');
        }

        let customerId = (user as any).razorpayCustomerId;
        if (!customerId) {

            // Create customer in Razorpay
            const razorpay = getRazorpayInstance();
            const customer = await razorpay.customers.create({
                email: existingCustomer.email,
                contact: user.phoneNumber || '',
                name: `${existingCustomer.firstName} ${existingCustomer.lastName}`,
                notes: {
                    userId: user.id,
                },
            });

            customerId = customer.id;

            // Save customer ID to database if your schema supports it
            // For now, we'll store it in a separate table
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    // If you add razorpayCustomerId field to User model, use it
                    // razorpayCustomerId: customerId,
                },
            });

            // Alternative: Store in a custom table
            // await prisma.razorpayCustomer.upsert({...})
        } else {
            console.log('✅ Using existing Razorpay customer:', customerId);
        }

        return { customerId, email: existingCustomer.email };
    } catch (error: any) {
        console.error('❌ Error creating/getting customer:', error);
        throw new RazorpayError(
            error.message || 'Failed to create customer',
            'CUSTOMER_CREATION_FAILED',
            500
        );
    }
}

/**
   * Create a payment with saved card token
   */
export async function createPaymentWithToken(
    customerId: string,
    tokenId: string,
    orderId: string,
    amount: number,
    currency: string = 'INR'
) {
    try {
        const options = {
            customer_id: customerId,
            token: tokenId,
            recurring: 'initial',
            amount,
            currency,
            order_id: orderId,
            email: 'customer@example.com', // This should come from user
            contact: 'customer_phone', // This should come from user
        };
        const razorpay = getRazorpayInstance();
        // Cast to any to satisfy TypeScript signature for createPaymentJson when using token-based S2S params
        const payment = await razorpay.payments.createPaymentJson(options as any);
        return payment;
    } catch (error: any) {
        throw new RazorpayError(
            error.message || 'Failed to create payment with token',
            'PAYMENT_CREATION_FAILED',
            500
        );
    }
}


/**
   * Extract and save payment token from payment response
   */
export async function saveCardToken(
    userId: string,
    paymentId: string,
    nickname?: string
): Promise<any> {
    try {
        const payment = await fetchRazorpayPayment(paymentId);

        if (!payment.card) {
            throw new PaymentMethodError(
                'No card details found in payment',
                'NO_CARD_DETAILS',
                400
            );
        }

        // Razorpay returns token_id for saved cards
        const tokenId = payment.token_id;
        if (!tokenId) {
            throw new PaymentMethodError(
                'No token ID in payment response',
                'NO_TOKEN_ID',
                400
            );
        }

        const [expMonth, expYear] = payment.card.id.split('_').slice(-2) || [
            '',
            '',
        ];

        const paymentMethodData: CreatePaymentMethodDTO = {
            type: PaymentMethodType.CARD,
            cardType: payment.card.type,
            cardNetwork: payment.card.network,
            cardLast4: payment.card.last4,
            cardIssuer: payment.card.issuer || undefined,
            cardName: payment.card.name || undefined,
            cardTokenId: tokenId, // Store the token for future payments
            cardFingerPrint: payment.card.id || undefined,
            cardExpMonth: expMonth || undefined,
            cardExpYear: expYear || undefined,
            nickname: nickname || `${payment.card.network} •••• ${payment.card.last4}`,
        };

        // Check for duplicate
        const existingMethod = await findDuplicatePaymentMethod(
            userId,
            paymentMethodData
        );

        if (existingMethod) {
            // Update existing token if needed
            return await prisma.paymentMethod.update({
                where: { id: existingMethod.id },
                data: {
                    cardTokenId: tokenId,
                    updatedAt: new Date(),
                },
            });
        }

        // Check if this should be default
        const existingMethods = await prisma.paymentMethod.count({
            where: { userId, isActive: true },
        });

        const isDefault = existingMethods === 0;

        if (isDefault) {
            await prisma.paymentMethod.updateMany({
                where: { userId, isDefault: true },
                data: { isDefault: false },
            });
        }

        return await prisma.paymentMethod.create({
            data: {
                userId,
                ...paymentMethodData,
                isDefault,
                isActive: true,
            },
        });
    } catch (error: any) {
        if (error instanceof PaymentMethodError || error instanceof RazorpayError) {
            throw error;
        }
        throw new PaymentMethodError(
            error.message || 'Failed to save card token',
            'SAVE_TOKEN_FAILED',
            500
        );
    }
}

/**
   * Get customer ID for user (create if doesn't exist)
   */
export async function getOrCreateCustomerId(userId: string): Promise<string> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
            },
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Check if we have stored customer ID somewhere
        // For now, we'll create a new one each time (Razorpay allows multiple)
        const result = await createOrGetCustomer(user);
        return result.customerId;
    } catch (error: any) {
        console.error('Error getting/creating customer:', error);
        throw error;
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

/**
 * Create token for saved card
 */
export function createToken(customerId: string, data: any) {
    try {
        // This would require Razorpay customer creation and token API
        // Implement based on your specific requirements
        throw new Error("Token creation not implemented")
    } catch (error: any) {
        throw new RazorpayError(
            error.message || 'Failed to create token',
            'TOKEN_CREATION_FAILED',
            500
        );
    }
}