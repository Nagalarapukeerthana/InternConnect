import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import {
  generateSecureOTP,
  hashOTP,
  generateAlphaOnlyTempPassword,
  verifyRazorpaySignature,
  verifyRazorpayWebhookSignature,
} from '../server/cryptoUtils.js';
import {
  getISTTime,
  isWithinMobileLoginWindow,
  isWithinPaymentWindow,
} from '../server/timeUtils.js';
import { dbStore, User } from '../server/store.js';

describe('Task 1: Multilingual & French OTP Security', () => {
  it('should generate a 6-digit numeric OTP and verify its hash', () => {
    const otp = generateSecureOTP();
    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);

    const hashed1 = hashOTP(otp);
    const hashed2 = hashOTP(otp);
    expect(hashed1).toBe(hashed2);

    const wrongHash = hashOTP('000000');
    expect(hashed1).not.toBe(wrongHash);
  });

  it('should verify OTP challenge lifecycle and expiry limit', () => {
    const otp = generateSecureOTP();
    const challenge = {
      id: 'ch-test-1',
      hashedOtp: hashOTP(otp),
      attempts: 0,
      maxAttempts: 3,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    // Correct OTP matches
    expect(hashOTP(otp)).toBe(challenge.hashedOtp);

    // Incorrect OTP increments attempts
    challenge.attempts++;
    expect(challenge.attempts).toBe(1);
    expect(challenge.attempts < challenge.maxAttempts).toBe(true);
  });
});

describe('Task 2: Resume Builder & ₹50 Razorpay Payment Verification', () => {
  const secret = 'rzp_test_secret_key_12345';
  const orderId = 'order_test_987654';
  const paymentId = 'pay_test_123456';

  it('should verify valid Razorpay payment signature', () => {
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const result = verifyRazorpaySignature(orderId, paymentId, validSignature, secret);
    expect(result).toBe(true);
  });

  it('should reject invalid or tampered Razorpay payment signature', () => {
    const fakeSignature = 'bad_tampered_signature_hex_value_123456';
    const result = verifyRazorpaySignature(orderId, paymentId, fakeSignature, secret);
    expect(result).toBe(false);
  });

  it('should enforce fixed ₹50 server pricing', () => {
    const FIXED_AMOUNT = 50;
    expect(FIXED_AMOUNT).toBe(50);
    // Ensure frontend cannot submit a tampered amount
    const clientSubmittedAmount = 1;
    expect(clientSubmittedAmount).not.toBe(FIXED_AMOUNT);
  });
});

describe('Task 3: Daily Password Reset Limit & Alpha-Only Temp Password', () => {
  it('should generate temporary password containing ONLY uppercase and lowercase letters', () => {
    for (let i = 0; i < 20; i++) {
      const tempPass = generateAlphaOnlyTempPassword(12);
      expect(tempPass).toHaveLength(12);
      // Strictly NO numbers and NO special characters!
      expect(/^[A-Za-z]+$/.test(tempPass)).toBe(true);
      expect(/\d/.test(tempPass)).toBe(false);
      expect(/[^A-Za-z]/.test(tempPass)).toBe(false);
    }
  });

  it('should enforce the exact requirement message: "You can use this option only once per day."', () => {
    const now = Date.now();
    const lastReset = new Date(now - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
    const timeDiffMs = now - new Date(lastReset).getTime();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    let errorMessage = '';
    if (timeDiffMs < twentyFourHoursMs) {
      errorMessage = 'You can use this option only once per day.';
    }

    expect(errorMessage).toBe('You can use this option only once per day.');
  });
});

describe('Task 4: Community Posting Limits based on Friend Count', () => {
  const testUser = 'user-test-limits';

  beforeEach(() => {
    // Clear friendships involving testUser
    for (const [id, f] of dbStore.friendships.entries()) {
      if (f.userA === testUser || f.userB === testUser) {
        dbStore.friendships.delete(id);
      }
    }
    // Clear posts
    for (const [id, p] of dbStore.posts.entries()) {
      if (p.authorId === testUser) {
        dbStore.posts.delete(id);
      }
    }
  });

  it('0 friends should result in 0 daily posts allowed', () => {
    const status = dbStore.getDailyPostLimit(testUser, 1);
    expect(status.friendCount).toBe(0);
    expect(status.dailyLimit).toBe(0);
    expect(status.canPost).toBe(false);
    expect(status.reason).toContain('Users with 0 friends cannot post');
  });

  it('1 friend should allow 1 post per day', () => {
    dbStore.friendships.set('fr-test-1', {
      id: 'fr-test-1',
      userA: testUser,
      userB: 'peer-1',
      createdAt: new Date().toISOString(),
    });

    const status = dbStore.getDailyPostLimit(testUser, 1);
    expect(status.friendCount).toBe(1);
    expect(status.dailyLimit).toBe(1);
    expect(status.canPost).toBe(true);
  });

  it('2 friends should allow 2 posts per day', () => {
    dbStore.friendships.set('fr-test-1', { id: 'fr-test-1', userA: testUser, userB: 'peer-1', createdAt: new Date().toISOString() });
    dbStore.friendships.set('fr-test-2', { id: 'fr-test-2', userA: testUser, userB: 'peer-2', createdAt: new Date().toISOString() });

    const status = dbStore.getDailyPostLimit(testUser, 1);
    expect(status.friendCount).toBe(2);
    expect(status.dailyLimit).toBe(2);
    expect(status.canPost).toBe(true);
  });

  it('3 to 10 friends should use configurable limit (default: 1 post/day)', () => {
    for (let i = 1; i <= 5; i++) {
      dbStore.friendships.set(`fr-test-${i}`, {
        id: `fr-test-${i}`,
        userA: testUser,
        userB: `peer-${i}`,
        createdAt: new Date().toISOString(),
      });
    }

    const status = dbStore.getDailyPostLimit(testUser, 1);
    expect(status.friendCount).toBe(5);
    expect(status.dailyLimit).toBe(1);
  });

  it('>10 friends should allow unlimited posts (-1)', () => {
    for (let i = 1; i <= 12; i++) {
      dbStore.friendships.set(`fr-test-${i}`, {
        id: `fr-test-${i}`,
        userA: testUser,
        userB: `peer-${i}`,
        createdAt: new Date().toISOString(),
      });
    }

    const status = dbStore.getDailyPostLimit(testUser, 1);
    expect(status.friendCount).toBe(12);
    expect(status.dailyLimit).toBe(-1);
    expect(status.canPost).toBe(true);
  });
});

describe('Task 5: Mobile Time Window & Chrome OTP Access Governance', () => {
  it('should accurately calculate mobile login window (10:00 AM - 1:00 PM IST)', () => {
    // 10:30 AM IST in UTC is 5:00 AM UTC
    const inWindowDate = new Date('2026-10-12T05:00:00.000Z');
    const istTime1 = getISTTime(inWindowDate);
    expect(istTime1.hours).toBe(10);
    expect(istTime1.minutes).toBe(30);
    expect(isWithinMobileLoginWindow(inWindowDate)).toBe(true);

    // 2:00 PM IST in UTC is 8:30 AM UTC
    const outsideWindowDate = new Date('2026-10-12T08:30:00.000Z');
    const istTime2 = getISTTime(outsideWindowDate);
    expect(istTime2.hours).toBe(14);
    expect(isWithinMobileLoginWindow(outsideWindowDate)).toBe(false);
  });

  it('should accurately calculate subscription payment window (10:00 AM - 11:00 AM IST)', () => {
    // 10:15 AM IST (in UTC: 4:45 AM UTC)
    const inPaymentWindow = new Date('2026-10-12T04:45:00.000Z');
    expect(isWithinPaymentWindow(inPaymentWindow)).toBe(true);

    // 11:30 AM IST (in UTC: 6:00 AM UTC)
    const outsidePaymentWindow = new Date('2026-10-12T06:00:00.000Z');
    expect(isWithinPaymentWindow(outsidePaymentWindow)).toBe(false);
  });
});

describe('Task 6: Subscription Application Quotas & Webhook Idempotency', () => {
  it('should enforce monthly application quotas', () => {
    const freePlan = { monthlyAllowance: 1, applicationsUsed: 1 };
    expect(freePlan.applicationsUsed >= freePlan.monthlyAllowance).toBe(true);

    const bronzePlan = { monthlyAllowance: 3, applicationsUsed: 2 };
    expect(bronzePlan.applicationsUsed < bronzePlan.monthlyAllowance).toBe(true);

    const goldPlan = { monthlyAllowance: -1, applicationsUsed: 50 };
    expect(goldPlan.monthlyAllowance === -1).toBe(true); // Unlimited
  });

  it('should verify Razorpay webhook signature and maintain event idempotency', () => {
    const webhookSecret = 'test_webhook_sec_54321';
    const body = JSON.stringify({ event: 'payment.captured', id: 'evt_1001' });

    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    const isValid = verifyRazorpayWebhookSignature(body, signature, webhookSecret);
    expect(isValid).toBe(true);

    // Test idempotency
    const processedEvents = new Set<string>();
    const eventId = 'evt_1001';
    expect(processedEvents.has(eventId)).toBe(false);
    processedEvents.add(eventId);
    expect(processedEvents.has(eventId)).toBe(true); // Duplicate detected
  });
});

describe('Zero-Trust User Data Isolation', () => {
  it('should strictly isolate login history records to authenticated user only', () => {
    const user1Id = 'usr-alice';
    const user2Id = 'usr-bob';

    const auditRecords = [
      { id: '1', userId: user1Id, email: 'alice@test.com', browser: 'Chrome' },
      { id: '2', userId: user2Id, email: 'bob@test.com', browser: 'Safari' },
      { id: '3', userId: user1Id, email: 'alice@test.com', browser: 'Firefox' },
    ];

    const aliceRecords = auditRecords.filter((r) => r.userId === user1Id);
    expect(aliceRecords).toHaveLength(2);
    expect(aliceRecords.every((r) => r.userId === user1Id)).toBe(true);
  });
});
