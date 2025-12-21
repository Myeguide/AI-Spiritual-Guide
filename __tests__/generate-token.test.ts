/**
 * Token Generation Tests
 * Tests for JWT token generation and verification
 */

import jwt from 'jsonwebtoken';

// Mock environment variable BEFORE importing the module
const mockJwtSecret = 'test-jwt-secret-key-for-testing-12345';
process.env.JWT_SECRET = mockJwtSecret;

// Import AFTER setting env variable
import { generateToken, verifyToken } from '@/lib/generate-token';

describe('Token Generation', () => {

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken('user123', 25, '+919876543210');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should include userId in token payload', () => {
      const token = generateToken('user123', 25, '+919876543210');
      const decoded = jwt.verify(token, mockJwtSecret) as any;

      expect(decoded.userId).toBe('user123');
    });

    it('should include age in token payload', () => {
      const token = generateToken('user123', 25, '+919876543210');
      const decoded = jwt.verify(token, mockJwtSecret) as any;

      expect(decoded.age).toBe(25);
    });

    it('should include phoneNumber in token payload', () => {
      const token = generateToken('user123', 25, '+919876543210');
      const decoded = jwt.verify(token, mockJwtSecret) as any;

      expect(decoded.phoneNumber).toBe('+919876543210');
    });

    it('should handle null age', () => {
      const token = generateToken('user123', null, '+919876543210');
      const decoded = jwt.verify(token, mockJwtSecret) as any;

      expect(decoded.age).toBeNull();
    });

    it('should set token expiration to 30 days', () => {
      const token = generateToken('user123', 25, '+919876543210');
      const decoded = jwt.verify(token, mockJwtSecret) as any;

      // Check that exp is approximately 30 days from now
      const now = Math.floor(Date.now() / 1000);
      const thirtyDaysInSeconds = 30 * 24 * 60 * 60;

      expect(decoded.exp).toBeDefined();
      expect(decoded.exp - now).toBeCloseTo(thirtyDaysInSeconds, -2); // Allow some variance
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateToken('user1', 25, '+911111111111');
      const token2 = generateToken('user2', 30, '+912222222222');

      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens even for same user (due to iat)', async () => {
      const token1 = generateToken('user123', 25, '+919876543210');

      // Wait a small amount to ensure different iat
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const token2 = generateToken('user123', 25, '+919876543210');

      // Tokens should be different due to different iat (issued at time)
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const token = generateToken('user123', 25, '+919876543210');
      const result = verifyToken(token);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user123');
      expect(result?.age).toBe(25);
    });

    it('should return null for invalid token', () => {
      const result = verifyToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null for malformed token', () => {
      const result = verifyToken('not.a.valid.jwt.token');

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = verifyToken('');

      expect(result).toBeNull();
    });

    it('should return null for token signed with different secret', () => {
      // Create a token with a different secret
      const differentToken = jwt.sign(
        { userId: 'user123', age: 25, phoneNumber: '+919876543210' },
        'different-secret',
        { expiresIn: '30d' }
      );

      const result = verifyToken(differentToken);

      expect(result).toBeNull();
    });

    it('should return null for expired token', () => {
      // Create an already expired token
      const expiredToken = jwt.sign(
        { userId: 'user123', age: 25, phoneNumber: '+919876543210' },
        mockJwtSecret,
        { expiresIn: '-1s' } // Already expired
      );

      const result = verifyToken(expiredToken);

      expect(result).toBeNull();
    });

    it('should handle null age in token', () => {
      const token = generateToken('user123', null, '+919876543210');
      const result = verifyToken(token);

      expect(result).not.toBeNull();
      expect(result?.age).toBeNull();
    });
  });
});
