import { z } from 'zod';

export const verifyPaymentSchema = z.object({
    razorpay_payment_id: z.string().min(1, 'Payment ID is required'),
    razorpay_order_id: z.string().min(1, 'Order ID is required'),
    razorpay_signature: z.string().min(1, 'Signature is required'),
    userId: z.string().min(1, 'User ID is required'),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;