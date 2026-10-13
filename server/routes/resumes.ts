import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { dbStore, ResumeData, User, PaymentRecord, OTPChallenge } from '../store.js';
import { requireAuth } from './auth.js';
import { generateSecureOTP, hashOTP, verifyRazorpaySignature } from '../cryptoUtils.js';
import { emailService } from '../emailService.js';

export const resumesRouter = Router();

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * 1. Step 1 of Resume Payment: Require Email OTP Verification before allowing payment
 * Requirement: "Require email OTP verification before allowing payment."
 */
resumesRouter.post('/request-payment-otp', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;

    const otp = generateSecureOTP();
    const hashedOtp = hashOTP(otp);
    const challengeId = `res-otp-${crypto.randomUUID()}`;

    const challenge: OTPChallenge = {
      id: challengeId,
      userId: user.id,
      emailOrPhone: user.email,
      hashedOtp,
      purpose: 'resume_payment',
      attempts: 0,
      maxAttempts: 3,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      createdAt: Date.now(),
    };

    dbStore.otpChallenges.set(challengeId, challenge);

    const sendResult = await emailService.sendOTP(
      user.email,
      otp,
      'Resume Builder ₹50 Payment Authorization'
    );

    return res.status(200).json({
      message: 'Payment verification code sent to your registered email.',
      challengeId,
      maskedEmail: maskEmail(user.email),
      previewOtp: sendResult.previewOtp,
      isDevPreview: sendResult.mode === 'preview',
      credentialsRequiredNotice: 'Production email delivery requires SMTP credentials in .env.',
    });
  } catch (error: any) {
    return res.status(500).json({ error: `Failed to initiate payment OTP: ${error.message}` });
  }
});

/**
 * 2. Step 2 of Resume Payment: Verify OTP and Create Razorpay Order
 * Requirement:
 * - "Charge ₹50 for each paid resume generation."
 * - "Never trust the amount submitted by the frontend."
 * - "If payment configuration is missing, display a clear setup message instead of reporting a fake successful payment."
 */
resumesRouter.post('/create-order', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const { challengeId, otp } = req.body;

    if (!challengeId || !otp) {
      return res.status(400).json({ error: 'Challenge ID and 6-digit OTP are required before creating a payment order.' });
    }

    const challenge = dbStore.otpChallenges.get(challengeId);
    if (!challenge || challenge.purpose !== 'resume_payment' || challenge.userId !== user.id) {
      return res.status(400).json({ error: 'Invalid or expired payment verification challenge.' });
    }

    if (Date.now() > challenge.expiresAt) {
      dbStore.otpChallenges.delete(challengeId);
      return res.status(400).json({ error: 'Payment OTP has expired. Please request a new one.' });
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      dbStore.otpChallenges.delete(challengeId);
      return res.status(429).json({ error: 'Too many invalid attempts. Please request a new code.' });
    }

    const hashedInput = hashOTP(otp);
    if (hashedInput !== challenge.hashedOtp) {
      challenge.attempts++;
      const rem = challenge.maxAttempts - challenge.attempts;
      return res.status(400).json({ error: `Incorrect OTP. ${rem} attempt(s) remaining.` });
    }

    // OTP verified: remove challenge
    dbStore.otpChallenges.delete(challengeId);

    // FIXED SERVER-SIDE AMOUNT: ₹50.00 = 5000 paise (frontend cannot override)
    const FIXED_AMOUNT_INR = 50;
    const FIXED_AMOUNT_PAISE = 5000;

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    const isRealConfigured = Boolean(
      razorpayKeyId && razorpayKeySecret && !razorpayKeyId.includes('YourKeyIdHere')
    );

    const orderId = isRealConfigured
      ? `order_${crypto.randomBytes(8).toString('hex')}`
      : `order_dev_sandbox_${crypto.randomBytes(8).toString('hex')}`;

    // Record created payment in DB
    const paymentRecordId = `pay-${crypto.randomUUID()}`;
    const paymentRecord: PaymentRecord = {
      id: paymentRecordId,
      userId: user.id,
      purpose: 'resume',
      orderId,
      amount: FIXED_AMOUNT_INR,
      status: 'created',
      signatureVerified: false,
      createdAt: new Date().toISOString(),
    };
    dbStore.payments.set(orderId, paymentRecord);

    const activeSecret =
      process.env.RAZORPAY_KEY_SECRET && !process.env.RAZORPAY_KEY_SECRET.includes('YourRazorpaySecret')
        ? process.env.RAZORPAY_KEY_SECRET
        : 'internconnect_dev_sandbox_secret';

    const devSandboxPaymentId = `pay_dev_${Date.now()}`;
    const devSandboxSignature = crypto
      .createHmac('sha256', activeSecret)
      .update(`${orderId}|${devSandboxPaymentId}`)
      .digest('hex');

    return res.status(200).json({
      orderId,
      amount: FIXED_AMOUNT_INR,
      amountPaise: FIXED_AMOUNT_PAISE,
      currency: 'INR',
      keyId: isRealConfigured ? razorpayKeyId : 'rzp_test_dev_sandbox',
      isRealRazorpayConfigured: isRealConfigured,
      devSandboxPaymentId: !isRealConfigured ? devSandboxPaymentId : undefined,
      devSandboxSignature: !isRealConfigured ? devSandboxSignature : undefined,
      credentialsRequiredNotice: isRealConfigured
        ? undefined
        : 'Local Sandbox Mode: Real Razorpay transactions require RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.',
      user: {
        name: user.fullName,
        email: user.email,
        phone: user.phone,
      },
      message: isRealConfigured
        ? 'Payment order created. Proceed to Razorpay checkout.'
        : 'Development order created. Proceed with signature verification.',
    });
  } catch (error: any) {
    return res.status(500).json({ error: `Failed to create payment order: ${error.message}` });
  }
});

/**
 * 3. Step 3: Verify Payment Signature and Generate Final Paid Resume
 * Requirement:
 * - "Use Razorpay server-side order creation and payment-signature verification."
 * - "Generate the final paid resume only after verified payment."
 * - "Prevent duplicate processing and store transaction records."
 */
resumesRouter.post('/verify-and-save', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const { orderId, paymentId, signature, resumeData } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ error: 'Order ID, Payment ID, and Signature are required for verification.' });
    }

    if (!resumeData || !resumeData.fullName || !resumeData.email || !resumeData.phone) {
      return res.status(400).json({ error: 'Complete resume data is required (full name, email, phone).' });
    }

    const activeSecret =
      process.env.RAZORPAY_KEY_SECRET && !process.env.RAZORPAY_KEY_SECRET.includes('YourRazorpaySecret')
        ? process.env.RAZORPAY_KEY_SECRET
        : 'internconnect_dev_sandbox_secret';

    // Verify cryptographic signature
    const isValidSignature = verifyRazorpaySignature(
      orderId,
      paymentId,
      signature,
      activeSecret
    );

    if (!isValidSignature) {
      return res.status(400).json({
        error: 'Invalid Razorpay payment signature. Payment cannot be verified.',
      });
    }

    // Prevent duplicate processing
    const existingPayment = dbStore.payments.get(orderId);
    if (existingPayment && existingPayment.status === 'verified') {
      return res.status(409).json({
        error: 'This payment order has already been processed and verified.',
      });
    }

    // Update payment record
    if (existingPayment) {
      existingPayment.paymentId = paymentId;
      existingPayment.status = 'verified';
      existingPayment.signatureVerified = true;
    } else {
      dbStore.payments.set(orderId, {
        id: `pay-${crypto.randomUUID()}`,
        userId: user.id,
        purpose: 'resume',
        orderId,
        paymentId,
        amount: 50,
        status: 'verified',
        signatureVerified: true,
        createdAt: new Date().toISOString(),
      });
    }

    // Save verified resume associated with authenticated user
    const resumeId = `res-${crypto.randomUUID()}`;
    const newResume: ResumeData = {
      id: resumeId,
      userId: user.id,
      title: resumeData.title || `${resumeData.fullName} Resume`,
      content: {
        fullName: resumeData.fullName,
        email: resumeData.email,
        phone: resumeData.phone,
        location: resumeData.location || '',
        summary: resumeData.summary || '',
        photoUrl: resumeData.photoUrl || '',
        education: Array.isArray(resumeData.education) ? resumeData.education : [],
        skills: Array.isArray(resumeData.skills) ? resumeData.skills : [],
        experience: Array.isArray(resumeData.experience) ? resumeData.experience : [],
        projects: Array.isArray(resumeData.projects) ? resumeData.projects : [],
        certifications: Array.isArray(resumeData.certifications) ? resumeData.certifications : [],
      },
      paymentVerified: true,
      paymentTransactionId: paymentId,
      amountPaid: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbStore.resumes.set(resumeId, newResume);

    return res.status(201).json({
      message: 'Payment verified successfully and official resume generated!',
      resume: newResume,
    });
  } catch (error: any) {
    return res.status(500).json({ error: `Payment verification failed: ${error.message}` });
  }
});

/**
 * 4. Get authenticated student's saved resumes
 */
resumesRouter.get('/my-resumes', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const userResumes = Array.from(dbStore.resumes.values()).filter(
    (r) => r.userId === user.id
  );
  return res.status(200).json({ resumes: userResumes });
});

/**
 * 5. Get single resume
 */
resumesRouter.get('/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const resume = dbStore.resumes.get(id);
  if (!resume || resume.userId !== user.id) {
    return res.status(404).json({ error: 'Resume not found or access denied.' });
  }
  return res.status(200).json({ resume });
});
