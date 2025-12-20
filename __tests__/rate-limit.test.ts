/**
 * Rate Limit Integration Tests
 * 
 * These tests verify that nginx rate limiting is working correctly.
 * Run against the live server: npx jest __tests__/rate-limit.test.ts
 * 
 * Note: These are integration tests that hit the actual server.
 * Run them sparingly to avoid triggering your own rate limits for too long.
 */

/// <reference types="jest" />

const BASE_URL = process.env.TEST_BASE_URL || 'https://chat.myeternalguide.com';

// Helper to make requests and get status code
async function makeRequest(endpoint: string): Promise<number> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.status;
  } catch (error) {
    console.error('Request failed:', error);
    return 0;
  }
}

// Helper to make multiple rapid requests
async function makeRapidRequests(
  endpoint: string,
  count: number
): Promise<{ passed: number; blocked: number; statuses: number[] }> {
  const statuses: number[] = [];
  
  // Make requests in rapid succession
  for (let i = 0; i < count; i++) {
    const status = await makeRequest(endpoint);
    statuses.push(status);
  }
  
  const blocked = statuses.filter(s => s === 429).length;
  const passed = statuses.filter(s => s !== 429).length;
  
  return { passed, blocked, statuses };
}

// Wait helper
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Rate Limiting', () => {
  // Increase timeout for integration tests
  jest.setTimeout(60000);

  describe('Chat API (/api/chat)', () => {
    it('should allow first few requests then block with 429', async () => {
      // Chat API: 10r/m with burst=3 (should allow ~4 requests)
      const result = await makeRapidRequests('/api/chat', 10);
      
      console.log('Chat API Results:', result);
      
      // Should have some blocked requests
      expect(result.blocked).toBeGreaterThan(0);
      
      // Should allow approximately 4 requests (1 + burst of 3)
      expect(result.passed).toBeLessThanOrEqual(5);
      expect(result.passed).toBeGreaterThanOrEqual(1);
      
      // Verify 429 status codes exist
      expect(result.statuses).toContain(429);
    });
  });

  describe('General API (/api/subscription-tier)', () => {
    beforeAll(async () => {
      // Wait for rate limit to partially reset from previous test
      await wait(15000);
    });

    it('should allow more requests than chat API before blocking', async () => {
      // General API: 30r/m with burst=10 (should allow ~11 requests)
      const result = await makeRapidRequests('/api/subscription-tier', 20);
      
      console.log('General API Results:', result);
      
      // Should have some blocked requests
      expect(result.blocked).toBeGreaterThan(0);
      
      // Should allow more than chat API
      expect(result.passed).toBeGreaterThan(4);
      expect(result.passed).toBeLessThanOrEqual(12);
      
      // Verify 429 status codes exist
      expect(result.statuses).toContain(429);
    });
  });

  describe('Rate Limit Headers', () => {
    beforeAll(async () => {
      // Wait for rate limit to reset
      await wait(15000);
    });

    it('should return 429 status when rate limited', async () => {
      // Exhaust the rate limit
      for (let i = 0; i < 15; i++) {
        await makeRequest('/api/subscription-tier');
      }
      
      // This request should definitely be rate limited
      const status = await makeRequest('/api/subscription-tier');
      
      expect(status).toBe(429);
    });
  });
});

describe('Rate Limit Recovery', () => {
  jest.setTimeout(120000);

  it('should recover after waiting', async () => {
    // First, exhaust the rate limit
    const exhaustResult = await makeRapidRequests('/api/subscription-tier', 20);
    expect(exhaustResult.blocked).toBeGreaterThan(0);
    
    console.log('Waiting 65 seconds for rate limit to reset...');
    await wait(65000);
    
    // After waiting, should be able to make requests again
    const status = await makeRequest('/api/subscription-tier');
    
    // Should not be 429 anymore
    expect(status).not.toBe(429);
  });
});

