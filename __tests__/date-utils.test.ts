/**
 * Date Utils Tests
 * Tests for calculateAge function
 */

import { calculateAge } from '@/utils/date-utils';

describe('calculateAge', () => {
  // Store original Date to restore after tests
  const RealDate = Date;

  beforeEach(() => {
    // Mock current date to 2024-06-15 for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Valid date inputs', () => {
    it('should calculate age correctly for a Date object', () => {
      const dob = new Date('1990-01-15');
      expect(calculateAge(dob)).toBe(34);
    });

    it('should calculate age correctly for a string date (YYYY-MM-DD)', () => {
      expect(calculateAge('1990-01-15')).toBe(34);
    });

    it('should calculate age correctly for an ISO string', () => {
      expect(calculateAge('1990-01-15T00:00:00.000Z')).toBe(34);
    });

    it('should handle birthday that has already occurred this year', () => {
      // Birthday on March 15, current date is June 15
      expect(calculateAge('2000-03-15')).toBe(24);
    });

    it('should handle birthday that has not occurred yet this year', () => {
      // Birthday on December 15, current date is June 15
      expect(calculateAge('2000-12-15')).toBe(23);
    });

    it('should handle birthday on the current day', () => {
      // Birthday on June 15, current date is June 15
      expect(calculateAge('2000-06-15')).toBe(24);
    });

    it('should return 0 for newborn (born today)', () => {
      expect(calculateAge('2024-06-15')).toBe(0);
    });

    it('should calculate age for someone born in different century', () => {
      expect(calculateAge('1950-06-15')).toBe(74);
    });

    it('should handle leap year birthdays', () => {
      // Someone born on Feb 29
      expect(calculateAge('2000-02-29')).toBe(24);
    });
  });

  describe('Edge cases and invalid inputs', () => {
    it('should return 0 for undefined input', () => {
      expect(calculateAge(undefined as any)).toBe(0);
    });

    it('should return 0 for null input', () => {
      expect(calculateAge(null as any)).toBe(0);
    });

    it('should return 0 for empty string', () => {
      expect(calculateAge('')).toBe(0);
    });

    it('should return 0 for invalid date string', () => {
      expect(calculateAge('not-a-date')).toBe(0);
    });

    it('should return 0 for future date (birth date in future)', () => {
      expect(calculateAge('2025-01-01')).toBe(0);
    });

    it('should return 0 for invalid Date object', () => {
      expect(calculateAge(new Date('invalid'))).toBe(0);
    });

    it('should return 0 for extremely old dates (age > 150)', () => {
      expect(calculateAge('1800-01-01')).toBe(0);
    });
  });

  describe('Month boundary cases', () => {
    it('should correctly calculate when birthday is in same month but not yet', () => {
      // Current: June 15, Birthday: June 20
      expect(calculateAge('2000-06-20')).toBe(23);
    });

    it('should correctly calculate when birthday is in same month but passed', () => {
      // Current: June 15, Birthday: June 10
      expect(calculateAge('2000-06-10')).toBe(24);
    });
  });
});
