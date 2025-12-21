/**
 * Subscription Service Tests
 * Tests for subscription utility methods (static methods that don't require DB)
 */

import { SubscriptionService } from '@/lib/services/subscription.service';

describe('SubscriptionService', () => {
  describe('isSubscriptionExpired', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      // Set current date to June 15, 2024
      jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('Request-based expiration', () => {
      it('should return true when requests are exhausted', () => {
        const subscription = {
          expiresAt: new Date('2024-12-31'), // Future date
          requestsUsed: 100,
          totalRequests: 100,
        };
        expect(SubscriptionService.isSubscriptionExpired(subscription)).toBe(true);
      });

      it('should return true when requests exceed limit', () => {
        const subscription = {
          expiresAt: new Date('2024-12-31'), // Future date
          requestsUsed: 150,
          totalRequests: 100,
        };
        expect(SubscriptionService.isSubscriptionExpired(subscription)).toBe(true);
      });

      it('should return false when requests are still available', () => {
        const subscription = {
          expiresAt: new Date('2024-12-31'), // Future date
          requestsUsed: 50,
          totalRequests: 100,
        };
        expect(SubscriptionService.isSubscriptionExpired(subscription)).toBe(false);
      });

      it('should return false when no requests used', () => {
        const subscription = {
          expiresAt: new Date('2024-12-31'), // Future date
          requestsUsed: 0,
          totalRequests: 100,
        };
        expect(SubscriptionService.isSubscriptionExpired(subscription)).toBe(false);
      });
    });

    describe('Date-based expiration', () => {
      it('should return true when date has passed', () => {
        const subscription = {
          expiresAt: new Date('2024-01-01'), // Past date
          requestsUsed: 0,
          totalRequests: 100,
        };
        expect(SubscriptionService.isSubscriptionExpired(subscription)).toBe(true);
      });

      it('should return false when date is in future', () => {
        const subscription = {
          expiresAt: new Date('2024-12-31'), // Future date
          requestsUsed: 0,
          totalRequests: 100,
        };
        expect(SubscriptionService.isSubscriptionExpired(subscription)).toBe(false);
      });

      it('should return false for null expiresAt (lifetime/free plan)', () => {
        const subscription = {
          expiresAt: null,
          requestsUsed: 0,
          totalRequests: 100,
        };
        expect(SubscriptionService.isSubscriptionExpired(subscription)).toBe(false);
      });
    });

    describe('Combined expiration logic', () => {
      it('should return true if either date expired OR requests exhausted', () => {
        // Expired by date but has requests
        expect(
          SubscriptionService.isSubscriptionExpired({
            expiresAt: new Date('2024-01-01'),
            requestsUsed: 0,
            totalRequests: 100,
          })
        ).toBe(true);

        // Not expired by date but no requests
        expect(
          SubscriptionService.isSubscriptionExpired({
            expiresAt: new Date('2024-12-31'),
            requestsUsed: 100,
            totalRequests: 100,
          })
        ).toBe(true);

        // Both expired
        expect(
          SubscriptionService.isSubscriptionExpired({
            expiresAt: new Date('2024-01-01'),
            requestsUsed: 100,
            totalRequests: 100,
          })
        ).toBe(true);
      });

      it('should return false only if both conditions are not expired', () => {
        expect(
          SubscriptionService.isSubscriptionExpired({
            expiresAt: new Date('2024-12-31'),
            requestsUsed: 50,
            totalRequests: 100,
          })
        ).toBe(false);
      });
    });
  });

  describe('isSubscriptionExpiredByDate', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return true when date has passed', () => {
      const subscription = { expiresAt: new Date('2024-01-01') };
      expect(SubscriptionService.isSubscriptionExpiredByDate(subscription)).toBe(true);
    });

    it('should return false when date is in future', () => {
      const subscription = { expiresAt: new Date('2024-12-31') };
      expect(SubscriptionService.isSubscriptionExpiredByDate(subscription)).toBe(false);
    });

    it('should return false for null expiresAt (lifetime plan)', () => {
      const subscription = { expiresAt: null };
      expect(SubscriptionService.isSubscriptionExpiredByDate(subscription)).toBe(false);
    });

    it('should return true when exactly at expiry time', () => {
      // Subscription expired at midnight, current time is noon
      const subscription = { expiresAt: new Date('2024-06-15T00:00:00.000Z') };
      expect(SubscriptionService.isSubscriptionExpiredByDate(subscription)).toBe(true);
    });

    it('should return false when expiry is later today', () => {
      const subscription = { expiresAt: new Date('2024-06-15T18:00:00.000Z') };
      expect(SubscriptionService.isSubscriptionExpiredByDate(subscription)).toBe(false);
    });
  });

  describe('isRequestsExhausted', () => {
    it('should return true when requests equal total', () => {
      expect(
        SubscriptionService.isRequestsExhausted({
          requestsUsed: 100,
          totalRequests: 100,
        })
      ).toBe(true);
    });

    it('should return true when requests exceed total', () => {
      expect(
        SubscriptionService.isRequestsExhausted({
          requestsUsed: 150,
          totalRequests: 100,
        })
      ).toBe(true);
    });

    it('should return false when requests are below total', () => {
      expect(
        SubscriptionService.isRequestsExhausted({
          requestsUsed: 50,
          totalRequests: 100,
        })
      ).toBe(false);
    });

    it('should return false when no requests used', () => {
      expect(
        SubscriptionService.isRequestsExhausted({
          requestsUsed: 0,
          totalRequests: 100,
        })
      ).toBe(false);
    });

    it('should return true when total is 0 and 0 used', () => {
      expect(
        SubscriptionService.isRequestsExhausted({
          requestsUsed: 0,
          totalRequests: 0,
        })
      ).toBe(true);
    });

    it('should handle large numbers', () => {
      expect(
        SubscriptionService.isRequestsExhausted({
          requestsUsed: 999999,
          totalRequests: 1000000,
        })
      ).toBe(false);

      expect(
        SubscriptionService.isRequestsExhausted({
          requestsUsed: 1000000,
          totalRequests: 1000000,
        })
      ).toBe(true);
    });
  });
});
