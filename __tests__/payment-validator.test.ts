/**
 * Payment Validator Tests
 * Tests for payment verification Zod schema
 */

import { verifyPaymentSchema } from '@/lib/validators/payment.validator';

describe('verifyPaymentSchema', () => {
  const validData = {
    razorpay_payment_id: 'pay_123456789012345',
    razorpay_order_id: 'order_123456789012345',
    razorpay_signature: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    userId: 'user_abc123xyz',
  };

  describe('Valid payment data', () => {
    it('should accept all valid fields', () => {
      const result = verifyPaymentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept various payment ID formats', () => {
      const result = verifyPaymentSchema.safeParse({
        ...validData,
        razorpay_payment_id: 'pay_ABC123def456',
      });
      expect(result.success).toBe(true);
    });

    it('should accept various order ID formats', () => {
      const result = verifyPaymentSchema.safeParse({
        ...validData,
        razorpay_order_id: 'order_ABC123def456GHI',
      });
      expect(result.success).toBe(true);
    });

    it('should accept various user ID formats (UUID)', () => {
      const result = verifyPaymentSchema.safeParse({
        ...validData,
        userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      });
      expect(result.success).toBe(true);
    });

    it('should accept various signature formats', () => {
      const result = verifyPaymentSchema.safeParse({
        ...validData,
        razorpay_signature: 'a'.repeat(64), // SHA256 produces 64 character hex
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid razorpay_payment_id', () => {
    it('should reject empty payment ID', () => {
      const result = verifyPaymentSchema.safeParse({
        ...validData,
        razorpay_payment_id: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Payment ID is required');
      }
    });

    it('should reject missing payment ID', () => {
      const { razorpay_payment_id, ...dataWithoutPaymentId } = validData;
      const result = verifyPaymentSchema.safeParse(dataWithoutPaymentId);
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid razorpay_order_id', () => {
    it('should reject empty order ID', () => {
      const result = verifyPaymentSchema.safeParse({
        ...validData,
        razorpay_order_id: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Order ID is required');
      }
    });

    it('should reject missing order ID', () => {
      const { razorpay_order_id, ...dataWithoutOrderId } = validData;
      const result = verifyPaymentSchema.safeParse(dataWithoutOrderId);
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid razorpay_signature', () => {
    it('should reject empty signature', () => {
      const result = verifyPaymentSchema.safeParse({
        ...validData,
        razorpay_signature: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Signature is required');
      }
    });

    it('should reject missing signature', () => {
      const { razorpay_signature, ...dataWithoutSignature } = validData;
      const result = verifyPaymentSchema.safeParse(dataWithoutSignature);
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid userId', () => {
    it('should reject empty user ID', () => {
      const result = verifyPaymentSchema.safeParse({
        ...validData,
        userId: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('User ID is required');
      }
    });

    it('should reject missing user ID', () => {
      const { userId, ...dataWithoutUserId } = validData;
      const result = verifyPaymentSchema.safeParse(dataWithoutUserId);
      expect(result.success).toBe(false);
    });
  });

  describe('Multiple validation errors', () => {
    it('should return multiple errors when multiple fields are invalid', () => {
      const result = verifyPaymentSchema.safeParse({
        razorpay_payment_id: '',
        razorpay_order_id: '',
        razorpay_signature: '',
        userId: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBe(4);
      }
    });

    it('should return errors for completely empty object', () => {
      const result = verifyPaymentSchema.safeParse({});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(4);
      }
    });
  });

  describe('Type coercion', () => {
    it('should reject non-string payment ID', () => {
      const result = verifyPaymentSchema.safeParse({
        ...validData,
        razorpay_payment_id: 12345,
      });
      expect(result.success).toBe(false);
    });

    it('should reject null values', () => {
      const result = verifyPaymentSchema.safeParse({
        ...validData,
        razorpay_payment_id: null,
      });
      expect(result.success).toBe(false);
    });

    it('should reject undefined values', () => {
      const result = verifyPaymentSchema.safeParse({
        ...validData,
        razorpay_payment_id: undefined,
      });
      expect(result.success).toBe(false);
    });
  });
});
