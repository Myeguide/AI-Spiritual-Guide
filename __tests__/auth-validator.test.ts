/**
 * Auth Validator Tests
 * Tests for Zod validation schemas
 */

import { sendOTPSchema, verifyOTPSchema, registerSchema } from '@/lib/validators/auth.validator';

describe('sendOTPSchema', () => {
  describe('Valid phone numbers', () => {
    it('should accept Indian phone number with country code', () => {
      const result = sendOTPSchema.safeParse({ phoneNumber: '+919876543210' });
      expect(result.success).toBe(true);
    });

    it('should accept US phone number with country code', () => {
      const result = sendOTPSchema.safeParse({ phoneNumber: '+14155551234' });
      expect(result.success).toBe(true);
    });

    it('should accept phone number without + prefix', () => {
      const result = sendOTPSchema.safeParse({ phoneNumber: '919876543210' });
      expect(result.success).toBe(true);
    });

    it('should accept phone number with minimum digits (8)', () => {
      const result = sendOTPSchema.safeParse({ phoneNumber: '+12345678' });
      expect(result.success).toBe(true);
    });

    it('should accept phone number with maximum digits (15)', () => {
      const result = sendOTPSchema.safeParse({ phoneNumber: '+123456789012345' });
      expect(result.success).toBe(true);
    });

    it('should trim whitespace from phone number', () => {
      const result = sendOTPSchema.safeParse({ phoneNumber: '  +919876543210  ' });
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid phone numbers', () => {
    it('should reject phone number starting with 0', () => {
      const result = sendOTPSchema.safeParse({ phoneNumber: '+0123456789' });
      expect(result.success).toBe(false);
    });

    it('should reject phone number with less than 8 digits', () => {
      const result = sendOTPSchema.safeParse({ phoneNumber: '+1234567' });
      expect(result.success).toBe(false);
    });

    it('should reject phone number with more than 15 digits', () => {
      const result = sendOTPSchema.safeParse({ phoneNumber: '+1234567890123456' });
      expect(result.success).toBe(false);
    });

    it('should reject phone number with letters', () => {
      const result = sendOTPSchema.safeParse({ phoneNumber: '+91abc7654321' });
      expect(result.success).toBe(false);
    });

    it('should reject phone number with special characters', () => {
      const result = sendOTPSchema.safeParse({ phoneNumber: '+91-987-654-3210' });
      expect(result.success).toBe(false);
    });

    it('should reject empty phone number', () => {
      const result = sendOTPSchema.safeParse({ phoneNumber: '' });
      expect(result.success).toBe(false);
    });

    it('should reject missing phone number', () => {
      const result = sendOTPSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Phone number is required');
      }
    });
  });
});

describe('verifyOTPSchema', () => {
  const validData = {
    phoneNumber: '+919876543210',
    code: '123456',
  };

  describe('Valid inputs', () => {
    it('should accept valid phone number and 6-digit OTP', () => {
      const result = verifyOTPSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept OTP with leading zeros', () => {
      const result = verifyOTPSchema.safeParse({
        ...validData,
        code: '012345',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid OTP', () => {
    it('should reject OTP with less than 6 digits', () => {
      const result = verifyOTPSchema.safeParse({
        ...validData,
        code: '12345',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('OTP must be 6 digits');
      }
    });

    it('should reject OTP with more than 6 digits', () => {
      const result = verifyOTPSchema.safeParse({
        ...validData,
        code: '1234567',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty OTP', () => {
      const result = verifyOTPSchema.safeParse({
        ...validData,
        code: '',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('registerSchema', () => {
  const validData = {
    phoneNumber: '+919876543210',
    code: '123456',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'SecurePass123!',
    dob: '1990-01-15',
  };

  describe('Valid registration data', () => {
    it('should accept all valid fields', () => {
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept Date object for dob', () => {
      const result = registerSchema.safeParse({
        ...validData,
        dob: new Date('1990-01-15'),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid first name', () => {
    it('should reject empty first name', () => {
      const result = registerSchema.safeParse({
        ...validData,
        firstName: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('First name is required');
      }
    });
  });

  describe('Invalid last name', () => {
    it('should reject empty last name', () => {
      const result = registerSchema.safeParse({
        ...validData,
        lastName: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Last name is required');
      }
    });
  });

  describe('Invalid email', () => {
    it('should reject invalid email format', () => {
      const result = registerSchema.safeParse({
        ...validData,
        email: 'not-an-email',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email');
      }
    });

    it('should reject email without domain', () => {
      const result = registerSchema.safeParse({
        ...validData,
        email: 'john@',
      });
      expect(result.success).toBe(false);
    });

    it('should reject email without @', () => {
      const result = registerSchema.safeParse({
        ...validData,
        email: 'johndoe.com',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid password', () => {
    it('should reject password with less than 8 characters', () => {
      const result = registerSchema.safeParse({
        ...validData,
        password: 'short',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password must be at least 8 characters');
      }
    });

    it('should accept password with exactly 8 characters', () => {
      const result = registerSchema.safeParse({
        ...validData,
        password: '12345678',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid date of birth', () => {
    it('should reject invalid date string', () => {
      const result = registerSchema.safeParse({
        ...validData,
        dob: 'not-a-date',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing dob', () => {
      const { dob, ...dataWithoutDob } = validData;
      const result = registerSchema.safeParse(dataWithoutDob);
      expect(result.success).toBe(false);
    });
  });
});
