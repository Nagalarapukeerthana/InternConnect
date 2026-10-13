import { Router, Request, Response } from 'express';
import { dbStore, Subscription, Invoice } from '../store.js';
import { verifyRazorpayWebhookSignature } from '../cryptoUtils.js';
import { PLANS_CONFIG } from './subscriptions.js';
import { emailService } from '../emailService.js';

export const webhooksRouter = Router();

/**
 * Razorpay Webhook Handler
 * Validates HMAC signature, checks event idempotency, updates subscriptions/invoices
 */
webhooksRouter.post('/razorpay', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!webhookSecret) {
      console.warn('[WEBHOOK] Secret not configured, ignoring webhook safely.');
      return res.status(200).json({ status: 'ignored_unconfigured' });
    }

    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const isValid = verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret);

    if (!isValid) {
      console.error('[WEBHOOK ERROR] Invalid signature received on Razorpay webhook');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body;
    const eventId = event.event_id || event.id || `${event.event}_${Date.now()}`;

    // Idempotency check: prevent duplicate event processing
    if (dbStore.processedWebhookEvents.has(eventId)) {
      console.log(`[WEBHOOK] Event ${eventId} already processed (idempotent skipped)`);
      return res.status(200).json({ status: 'already_processed' });
    }

    dbStore.processedWebhookEvents.add(eventId);

    const eventType = event.event;
    console.log(`[WEBHOOK RECEIVED] Event: ${eventType} | ID: ${eventId}`);

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const notes = paymentEntity?.notes || {};
      const userId = notes.userId;
      const planId = notes.planId;

      if (userId && planId && PLANS_CONFIG[planId as keyof typeof PLANS_CONFIG]) {
        const plan = PLANS_CONFIG[planId as keyof typeof PLANS_CONFIG];
        const user = dbStore.users.get(userId);

        if (user) {
          const cycleStartDate = new Date().toISOString();
          const cycleEndDate = new Date(Date.now() + 30 * 86400000).toISOString();

          const updatedSub: Subscription = {
            userId,
            planId: plan.id as any,
            monthlyPrice: plan.monthlyPrice,
            monthlyAllowance: plan.monthlyAllowance,
            applicationsUsed: 0,
            cycleStartDate,
            cycleEndDate,
            status: 'active',
            updatedAt: new Date().toISOString(),
          };
          dbStore.subscriptions.set(userId, updatedSub);

          const invoiceId = `inv-${Date.now()}`;
          const newInvoice: Invoice = {
            id: invoiceId,
            invoiceNumber: `IC-WH-${Date.now().toString().slice(-6)}`,
            userId,
            userEmail: user.email,
            userName: user.fullName,
            planId: plan.id,
            planName: plan.name,
            amountPaid: plan.monthlyPrice,
            currency: 'INR',
            transactionReference: paymentEntity.id || `wh-${eventId}`,
            subscriptionPeriodStart: cycleStartDate,
            subscriptionPeriodEnd: cycleEndDate,
            status: 'paid',
            createdAt: new Date().toISOString(),
          };
          dbStore.invoices.set(invoiceId, newInvoice);

          await emailService.sendSubscriptionInvoice(user.email, {
            invoiceNumber: newInvoice.invoiceNumber,
            userName: user.fullName,
            planName: plan.name,
            amountPaid: plan.monthlyPrice,
            transactionReference: newInvoice.transactionReference,
            subscriptionPeriodStart: cycleStartDate,
            subscriptionPeriodEnd: cycleEndDate,
          });
        }
      }
    }

    return res.status(200).json({ status: 'ok', eventId });
  } catch (error: any) {
    console.error('[WEBHOOK ERROR]:', error.message);
    return res.status(500).json({ error: error.message });
  }
});
