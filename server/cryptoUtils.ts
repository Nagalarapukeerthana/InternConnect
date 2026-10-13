import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
export function generateSecureOTP(): string {
  const num = crypto.randomInt(100000, 999999);
  return num.toString();
}

/**
 * Hash an OTP using SHA-256 with optional salt
 */
export function hashOTP(otp: string, salt: string = 'internconnect_salt'): string {
  return crypto.createHash('sha256').update(`${otp}:${salt}`).digest('hex');
}

/**
 * Generate a cryptographically secure temporary password
 * Requirement: MUST use uppercase and lowercase letters only, with NO numbers or special characters!
 */
export function generateAlphaOnlyTempPassword(length: number = 12): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  // Use crypto.randomBytes to ensure cryptographic randomness
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    const index = randomBytes[i] % letters.length;
    result += letters[index];
  }
  return result;
}

/**
 * Hash user password using bcrypt
 */
export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

/**
 * Compare plain password with bcrypt hash
 */
export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

/**
 * Verify Razorpay payment signature
 * Razorpay generates signature as: HMAC_SHA256(order_id + "|" + payment_id, secret)
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  if (!orderId || !paymentId || !signature || !secret) {
    return false;
  }
  const text = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(text)
    .digest('hex');

  const bufExpected = Buffer.from(expectedSignature, 'utf-8');
  const bufSignature = Buffer.from(signature, 'utf-8');

  if (bufExpected.length !== bufSignature.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(bufExpected, bufSignature);
  } catch {
    return false;
  }
}

/**
 * Verify Razorpay Webhook signature
 */
export function verifyRazorpayWebhookSignature(
  body: string,
  signature: string,
  webhookSecret: string
): boolean {
  if (!body || !signature || !webhookSecret) return false;
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf-8'),
      Buffer.from(signature, 'utf-8')
    );
  } catch {
    return false;
  }
}
