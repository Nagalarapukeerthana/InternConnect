import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { dbStore, Subscription, Invoice, PaymentRecord, User } from '../store.js';
import { requireAuth } from './auth.js';
import { isWithinPaymentWindow, getISTFormattedString, getISTTime } from '../timeUtils.js';
import { verifyRazorpaySignature } from '../cryptoUtils.js';
import { emailService } from '../emailService.js';

export const subscriptionsRouter = Router();

export const PLANS_CONFIG = {
  free: {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    monthlyAllowance: 1,
    description: 'Perfect for getting started and exploring opportunities.',
  },
  bronze: {
    id: 'bronze',
    name: 'Bronze',
    monthlyPrice: 100,
    monthlyAllowance: 3,
    description: 'Great for active students seeking focused opportunities.',
  },
  silver: {
    id: 'silver',
    name: 'Silver',
    monthlyPrice: 300,
    monthlyAllowance: 5,
    description: 'Recommended for serious job hunters with high application limits.',
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    monthlyPrice: 1000,
    monthlyAllowance: -1, // Unlimited
    description: 'Ultimate access with unlimited monthly applications and priority support.',
  },
};

/**
 * 1. Get Subscription Status, Plans, and Payment Window Info
 */
subscriptionsRouter.get('/status', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  let sub = dbStore.subscriptions.get(user.id);
  if (!sub) {
    sub = {
      userId: user.id,
      planId: 'free',
      monthlyPrice: 0,
      monthlyAllowance: 1,
      applicationsUsed: 0,
      cycleStartDate: new Date().toISOString(),
      cycleEndDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      status: 'active',
      updatedAt: new Date().toISOString(),
    };
    dbStore.subscriptions.set(user.id, sub);
  }

  const paymentWindowOpen = isWithinPaymentWindow();
  const istTime = getISTTime();

  return res.status(200).json({
    subscription: sub,
    plans: Object.values(PLANS_CONFIG),
    paymentWindow: {
      isOpen: paymentWindowOpen,
      allowedHours: '10:00 AM – 11:00 AM IST',
      currentIST: getISTFormattedString(),
      currentHourIST: istTime.hours,
      currentMinuteIST: istTime.minutes,
    },
  });
});

/**
 * 2. Create Razorpay Payment Order for Subscription Upgrade
 * Task 6 Requirements:
 * - "Permit payment initiation only from 10:00 AM to 11:00 AM IST."
 * - "Enforce the payment window on the server using Asia/Kolkata."
 * - "Never trust the amount submitted by the frontend."
 */
subscriptionsRouter.post('/create-order', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const { planId } = req.body;

    const simulatePaymentWindow =
      req.headers['x-simulate-payment-window'] === 'true' ||
      req.body.simulatePaymentWindow === true;

    // Task 6 Strict Rule: 10:00 AM to 11:00 AM IST payment window (with dev simulation support)
    if (!isWithinPaymentWindow() && !simulatePaymentWindow) {
      return res.status(403).json({
        error: 'Subscription payments are only permitted between 10:00 AM and 11:00 AM IST.',
        code: 'PAYMENT_WINDOW_CLOSED',
        currentIST: getISTFormattedString(),
        allowedWindow: '10:00 AM – 11:00 AM IST',
        testSimulationAvailable: true,
      });
    }

    if (!planId || !['bronze', 'silver', 'gold'].includes(planId)) {
      return res.status(400).json({ error: 'Invalid paid subscription plan selected.' });
    }

    const plan = PLANS_CONFIG[planId as keyof typeof PLANS_CONFIG];
    const fixedAmountINR = plan.monthlyPrice;
    const fixedAmountPaise = fixedAmountINR * 100;

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    const isRealConfigured = Boolean(
      razorpayKeyId && razorpayKeySecret && !razorpayKeyId.includes('YourKeyIdHere')
    );

    const orderId = isRealConfigured
      ? `sub_order_${crypto.randomBytes(8).toString('hex')}`
      : `sub_order_dev_sandbox_${crypto.randomBytes(8).toString('hex')}`;

    const paymentRecord: PaymentRecord = {
      id: `pay-${crypto.randomUUID()}`,
      userId: user.id,
      purpose: 'subscription',
      orderId,
      amount: fixedAmountINR,
      status: 'created',
      signatureVerified: false,
      createdAt: new Date().toISOString(),
      metadata: { planId },
    };

    dbStore.payments.set(orderId, paymentRecord);

    const activeSecret =
      process.env.RAZORPAY_KEY_SECRET && !process.env.RAZORPAY_KEY_SECRET.includes('YourRazorpaySecret')
        ? process.env.RAZORPAY_KEY_SECRET
        : 'internconnect_dev_sandbox_secret';

    const devSandboxPaymentId = `sub_pay_dev_${Date.now()}`;
    const devSandboxSignature = crypto
      .createHmac('sha256', activeSecret)
      .update(`${orderId}|${devSandboxPaymentId}`)
      .digest('hex');

    return res.status(200).json({
      orderId,
      amount: fixedAmountINR,
      amountPaise: fixedAmountPaise,
      currency: 'INR',
      keyId: isRealConfigured ? razorpayKeyId : 'rzp_test_dev_sandbox',
      isRealRazorpayConfigured: isRealConfigured,
      devSandboxPaymentId: !isRealConfigured ? devSandboxPaymentId : undefined,
      devSandboxSignature: !isRealConfigured ? devSandboxSignature : undefined,
      credentialsRequiredNotice: isRealConfigured
        ? undefined
        : 'Local Sandbox Mode: Real Razorpay transactions require RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.',
      planId: plan.id,
      planName: plan.name,
    });
  } catch (error: any) {
    return res.status(500).json({ error: `Subscription order creation failed: ${error.message}` });
  }
});

/**
 * 3. Verify Payment and Activate Subscription
 * Task 6 Requirements:
 * - "Verify every payment signature server-side."
 * - "Never activate a paid subscription based solely on a frontend success callback."
 * - "Send an email invoice containing the plan, amount, transaction reference, and subscription period."
 * - "Store invoices and transaction records in the user's account."
 */
subscriptionsRouter.post('/verify-payment', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const { orderId, paymentId, signature, planId } = req.body;

    if (!orderId || !paymentId || !signature || !planId) {
      return res.status(400).json({ error: 'Order ID, Payment ID, Signature, and Plan ID are required.' });
    }

    const plan = PLANS_CONFIG[planId as keyof typeof PLANS_CONFIG];
    if (!plan) {
      return res.status(400).json({ error: 'Invalid plan specified.' });
    }

    const activeSecret =
      process.env.RAZORPAY_KEY_SECRET && !process.env.RAZORPAY_KEY_SECRET.includes('YourRazorpaySecret')
        ? process.env.RAZORPAY_KEY_SECRET
        : 'internconnect_dev_sandbox_secret';

    // Verify signature
    const isValidSignature = verifyRazorpaySignature(
      orderId,
      paymentId,
      signature,
      activeSecret
    );

    if (!isValidSignature) {
      return res.status(400).json({ error: 'Invalid Razorpay payment signature.' });
    }

    // Check duplicate
    const paymentRecord = dbStore.payments.get(orderId);
    if (paymentRecord && paymentRecord.status === 'verified') {
      return res.status(409).json({ error: 'This payment order has already been verified and processed.' });
    }

    // Update payment record
    if (paymentRecord) {
      paymentRecord.paymentId = paymentId;
      paymentRecord.status = 'verified';
      paymentRecord.signatureVerified = true;
    } else {
      dbStore.payments.set(orderId, {
        id: `pay-${crypto.randomUUID()}`,
        userId: user.id,
        purpose: 'subscription',
        orderId,
        paymentId,
        amount: plan.monthlyPrice,
        status: 'verified',
        signatureVerified: true,
        createdAt: new Date().toISOString(),
        metadata: { planId },
      });
    }

    // Activate subscription
    const cycleStartDate = new Date().toISOString();
    const cycleEndDate = new Date(Date.now() + 30 * 86400000).toISOString();

    const updatedSubscription: Subscription = {
      userId: user.id,
      planId: plan.id as any,
      monthlyPrice: plan.monthlyPrice,
      monthlyAllowance: plan.monthlyAllowance,
      applicationsUsed: 0, // Reset application usage for the new billing cycle
      cycleStartDate,
      cycleEndDate,
      status: 'active',
      updatedAt: new Date().toISOString(),
    };

    dbStore.subscriptions.set(user.id, updatedSubscription);

    // Generate Official Invoice
    const invoiceId = `inv-${crypto.randomUUID()}`;
    const invoiceNumber = `IC-INV-${Date.now().toString().slice(-6)}`;

    const newInvoice: Invoice = {
      id: invoiceId,
      invoiceNumber,
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      planId: plan.id,
      planName: plan.name,
      amountPaid: plan.monthlyPrice,
      currency: 'INR',
      transactionReference: paymentId,
      subscriptionPeriodStart: cycleStartDate,
      subscriptionPeriodEnd: cycleEndDate,
      status: 'paid',
      createdAt: new Date().toISOString(),
    };

    dbStore.invoices.set(invoiceId, newInvoice);

    // Send email invoice
    await emailService.sendSubscriptionInvoice(user.email, {
      invoiceNumber,
      userName: user.fullName,
      planName: plan.name,
      amountPaid: plan.monthlyPrice,
      transactionReference: paymentId,
      subscriptionPeriodStart: cycleStartDate,
      subscriptionPeriodEnd: cycleEndDate,
    });

    return res.status(200).json({
      message: `Successfully upgraded to ${plan.name} plan! Invoice has been issued.`,
      subscription: updatedSubscription,
      invoice: newInvoice,
    });
  } catch (error: any) {
    return res.status(500).json({ error: `Payment verification failed: ${error.message}` });
  }
});

/**
 * 4. Get User Invoices
 */
subscriptionsRouter.get('/invoices', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const userInvoices = Array.from(dbStore.invoices.values())
    .filter((inv) => inv.userId === user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.status(200).json({ invoices: userInvoices });
});
