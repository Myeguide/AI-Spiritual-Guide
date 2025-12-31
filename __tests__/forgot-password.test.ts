/**
 * Forgot Password Feature Tests
 * 
 * These tests verify the forgot password flow:
 * 1. POST /api/auth/forgot-password - Send OTP to registered phone
 * 2. POST /api/auth/reset-password - Verify OTP and reset password
 * 
 * Run: npx jest __tests__/forgot-password.test.ts
 */

/// <reference types="jest" />

// Mock dependencies before importing the routes
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    otpCode: {
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback({
      otpCode: {
        updateMany: jest.fn(),
        create: jest.fn(),
      },
    })),
  },
}));

jest.mock('@/lib/services/sms.service', () => ({
  SMSService: {
    validatePhoneNumber: jest.fn(),
    sendOTP: jest.fn(),
    verifyOTPViaMSG91: jest.fn(),
  },
  SMSError: class SMSError extends Error {
    constructor(message: string, public code: string, public statusCode: number = 400) {
      super(message);
      this.name = 'SMSError';
    }
  },
}));

jest.mock('@/lib/services/otp.service', () => ({
  OTPService: {
    generateOTP: jest.fn(),
  },
  OTPError: class OTPError extends Error {
    constructor(message: string, public code: string, public statusCode: number = 400) {
      super(message);
      this.name = 'OTPError';
    }
  },
}));

jest.mock('bcrypt-ts', () => ({
  hashSync: jest.fn((password: string) => `hashed_${password}`),
}));

import { prisma } from '@/lib/prisma';
import { SMSService } from '@/lib/services/sms.service';
import { OTPService } from '@/lib/services/otp.service';

// Helper to create mock NextRequest
function createMockRequest(body: object): Request {
  return new Request('http://localhost:3000/api/auth/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('Forgot Password API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should return 404 if user does not exist', async () => {
      // Mock user not found
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const { POST } = await import('@/app/api/auth/forgot-password/route');
      const request = createMockRequest({ phoneNumber: '+911234567890' });
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.code).toBe('USER_NOT_FOUND');
    });

    it('should send OTP successfully for registered user', async () => {
      // Mock user found
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        phoneNumber: '+911234567890',
      });

      // Mock phone validation
      (SMSService.validatePhoneNumber as jest.Mock).mockResolvedValue(undefined);

      // Mock OTP generation
      (OTPService.generateOTP as jest.Mock).mockResolvedValue({
        success: true,
        message: 'OTP generated',
        code: '123456',
      });

      // Mock SMS send
      (SMSService.sendOTP as jest.Mock).mockResolvedValue(undefined);

      const { POST } = await import('@/app/api/auth/forgot-password/route');
      const request = createMockRequest({ phoneNumber: '+911234567890' });
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('OTP sent');
      expect(SMSService.sendOTP).toHaveBeenCalledWith('+911234567890', '123456');
    });

    it('should call OTP service with correct phone number', async () => {
      const testPhone = '+919876543210';
      
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-456',
        phoneNumber: testPhone,
      });
      (SMSService.validatePhoneNumber as jest.Mock).mockResolvedValue(undefined);
      (OTPService.generateOTP as jest.Mock).mockResolvedValue({
        success: true,
        code: '654321',
      });
      (SMSService.sendOTP as jest.Mock).mockResolvedValue(undefined);

      const { POST } = await import('@/app/api/auth/forgot-password/route');
      const request = createMockRequest({ phoneNumber: testPhone });
      await POST(request as any);

      expect(OTPService.generateOTP).toHaveBeenCalledWith(testPhone);
      expect(SMSService.sendOTP).toHaveBeenCalledWith(testPhone, '654321');
    });
  });
});

describe('Reset Password API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/reset-password', () => {
    it('should return 400 for invalid OTP', async () => {
      // Mock OTP verification failure
      (SMSService.verifyOTPViaMSG91 as jest.Mock).mockResolvedValue(false);

      const { POST } = await import('@/app/api/auth/reset-password/route');
      const request = createMockRequest({
        phoneNumber: '+911234567890',
        code: '123456',
        newPassword: 'NewPass@123',
      });
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_OTP');
    });

    it('should return 404 if user not found after OTP verification', async () => {
      // Mock OTP verification success
      (SMSService.verifyOTPViaMSG91 as jest.Mock).mockResolvedValue(true);

      // Mock user not found
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const { POST } = await import('@/app/api/auth/reset-password/route');
      const request = createMockRequest({
        phoneNumber: '+911234567890',
        code: '123456',
        newPassword: 'NewPass@123',
      });
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.code).toBe('USER_NOT_FOUND');
    });

    it('should reset password successfully', async () => {
      // Mock OTP verification success
      (SMSService.verifyOTPViaMSG91 as jest.Mock).mockResolvedValue(true);

      // Mock user found
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
      });

      // Mock user update
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-123',
      });

      // Mock OTP cleanup
      (prisma.otpCode.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      const { POST } = await import('@/app/api/auth/reset-password/route');
      const request = createMockRequest({
        phoneNumber: '+911234567890',
        code: '123456',
        newPassword: 'NewPass@123',
      });
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Password reset successfully');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should hash password before saving', async () => {
      const { hashSync } = require('bcrypt-ts');
      
      (SMSService.verifyOTPViaMSG91 as jest.Mock).mockResolvedValue(true);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-123' });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: 'user-123' });
      (prisma.otpCode.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      const { POST } = await import('@/app/api/auth/reset-password/route');
      const request = createMockRequest({
        phoneNumber: '+911234567890',
        code: '123456',
        newPassword: 'SecurePass@123',
      });
      await POST(request as any);

      expect(hashSync).toHaveBeenCalledWith('SecurePass@123', 10);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password: 'hashed_SecurePass@123',
          }),
        })
      );
    });

    it('should cleanup OTP records after successful reset', async () => {
      (SMSService.verifyOTPViaMSG91 as jest.Mock).mockResolvedValue(true);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-123' });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: 'user-123' });
      (prisma.otpCode.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      const { POST } = await import('@/app/api/auth/reset-password/route');
      const request = createMockRequest({
        phoneNumber: '+911234567890',
        code: '123456',
        newPassword: 'NewPass@123',
      });
      await POST(request as any);

      expect(prisma.otpCode.deleteMany).toHaveBeenCalledWith({
        where: {
          phoneNumber: '+911234567890',
          isUsed: false,
        },
      });
    });
  });
});

describe('Password Validation (Valid Passwords)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup successful mocks for all valid password tests
    (SMSService.verifyOTPViaMSG91 as jest.Mock).mockResolvedValue(true);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-123' });
    (prisma.user.update as jest.Mock).mockResolvedValue({ id: 'user-123' });
    (prisma.otpCode.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
  });

  const validPasswords = [
    'Password@1',
    'MySecure#123',
    'Test$Pass1',
    'Hello@World1',
  ];

  it.each(validPasswords)('should accept valid password: %s', async (password) => {
    const { POST } = await import('@/app/api/auth/reset-password/route');
    const request = createMockRequest({
      phoneNumber: '+911234567890',
      code: '123456',
      newPassword: password,
    });
    const response = await POST(request as any);

    expect(response.status).toBe(200);
  });
});

describe('Phone Number Validation (Valid Numbers)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validPhoneNumbers = [
    '+911234567890',
    '+14155552671',
    '+447911123456',
    '911234567890',
  ];

  it.each(validPhoneNumbers)('should accept valid phone number: %s', async (phoneNumber) => {
    // Mock user exists
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-123',
      phoneNumber,
    });
    (SMSService.validatePhoneNumber as jest.Mock).mockResolvedValue(undefined);
    (OTPService.generateOTP as jest.Mock).mockResolvedValue({
      success: true,
      code: '123456',
    });
    (SMSService.sendOTP as jest.Mock).mockResolvedValue(undefined);

    const { POST } = await import('@/app/api/auth/forgot-password/route');
    const request = createMockRequest({ phoneNumber });
    const response = await POST(request as any);

    expect(response.status).toBe(200);
  });
});

describe('Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle SMS service failure gracefully', async () => {
    const { SMSError } = require('@/lib/services/sms.service');
    
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-123',
      phoneNumber: '+911234567890',
    });
    (SMSService.validatePhoneNumber as jest.Mock).mockRejectedValue(
      new SMSError('Phone validation failed', 'VALIDATION_ERROR', 400)
    );

    const { POST } = await import('@/app/api/auth/forgot-password/route');
    const request = createMockRequest({ phoneNumber: '+911234567890' });
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('should handle OTP generation failure gracefully', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-123',
      phoneNumber: '+911234567890',
    });
    (SMSService.validatePhoneNumber as jest.Mock).mockResolvedValue(undefined);
    (OTPService.generateOTP as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Failed to generate OTP',
    });

    const { POST } = await import('@/app/api/auth/forgot-password/route');
    const request = createMockRequest({ phoneNumber: '+911234567890' });
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});
