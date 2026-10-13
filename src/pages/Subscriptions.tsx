import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Shield,
  Download,
  Sparkles,
  ArrowRight,
  X,
} from 'lucide-react';

interface SubscriptionsProps {
  onNavigate: (page: string) => void;
}

export const Subscriptions: React.FC<SubscriptionsProps> = ({ onNavigate }) => {
  const { user, subscription, token, refreshUser } = useAuth();
  const { t } = useLanguage();

  const [paymentWindow, setPaymentWindow] = useState<{
    isOpen: boolean;
    allowedHours: string;
    currentIST: string;
    currentHourIST: number;
    currentMinuteIST: number;
  } | null>(null);

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingPlan, setPurchasingPlan] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null);
  const [simulateDevWindow, setSimulateDevWindow] = useState(false);

  // Selected invoice for viewing modal
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusRes, invRes] = await Promise.all([
        fetch('/api/subscriptions/status', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        fetch('/api/subscriptions/invoices', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      ]);

      if (statusRes.paymentWindow) {
        setPaymentWindow(statusRes.paymentWindow);
      }
      setInvoices(invRes.invoices || []);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      onNavigate('auth');
      return;
    }

    setPurchasingPlan(planId);
    setCheckoutError(null);
    setCheckoutSuccess(null);

    try {
      // 1. Create order (Server checks 10:00 - 11:00 AM IST strictly)
      const res = await fetch('/api/subscriptions/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(simulateDevWindow ? { 'x-simulate-payment-window': 'true' } : {}),
        },
        body: JSON.stringify({ planId, simulatePaymentWindow: simulateDevWindow }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize subscription checkout');
      }

      // 2. Perform signature verification (using cryptographically valid sandbox signature if in local mode)
      const paymentId = data.devSandboxPaymentId || `sub_pay_${Date.now()}`;
      const signature = data.devSandboxSignature || 'simulated_sig_sub';

      const verifyRes = await fetch('/api/subscriptions/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: data.orderId,
          paymentId,
          signature,
          planId,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Signature verification failed');
      }

      setCheckoutSuccess(
        verifyData.message ||
          'Subscription successfully upgraded! Tax invoice has been generated.'
      );
      await refreshUser();
      await loadData();
    } catch (err: any) {
      setCheckoutError(err.message);
    } finally {
      setPurchasingPlan(null);
    }
  };

  const plans = [
    {
      id: 'free',
      name: t.subscription.freePlanName,
      price: '₹0',
      period: 'Forever Free',
      allowance: t.subscription.freePlanAllowance,
      features: ['1 Internship Application / Month', 'Standard Profile Listing', 'Community Space Access', 'Email Notifications'],
      isCurrent: subscription?.planId === 'free',
      popular: false,
    },
    {
      id: 'bronze',
      name: t.subscription.bronzePlanName,
      price: '₹100',
      period: 'per month',
      allowance: t.subscription.bronzePlanAllowance,
      features: ['3 Internship Applications / Month', 'Priority Employer Review', 'Standard Verification Badge', 'Tax Invoice Provided'],
      isCurrent: subscription?.planId === 'bronze',
      popular: false,
    },
    {
      id: 'silver',
      name: t.subscription.silverPlanName,
      price: '₹300',
      period: 'per month',
      allowance: t.subscription.silverPlanAllowance,
      features: ['5 Internship Applications / Month', 'Top Applicant Highlighting', 'Resume Attachment Priority', 'Instant Email Invoices'],
      isCurrent: subscription?.planId === 'silver',
      popular: true,
    },
    {
      id: 'gold',
      name: t.subscription.goldPlanName,
      price: '₹1,000',
      period: 'per month',
      allowance: t.subscription.goldPlanAllowance,
      features: ['Unlimited Internship Applications', 'VIP Recruiter Direct Match', 'Unlimited ATS Resume Attachments', 'Priority Technical Support'],
      isCurrent: subscription?.planId === 'gold',
      popular: false,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t.subscription.title}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">{t.subscription.subtitle}</p>
          </div>

          {/* Payment Window Live Monitor Badge */}
          {paymentWindow && (
            <div
              className={`p-4 rounded-2xl border text-xs space-y-1 ${
                paymentWindow.isOpen
                  ? 'bg-teal-50 border-teal-300 text-teal-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                <Clock className="w-4 h-4" />
                <span>
                  {paymentWindow.isOpen
                    ? t.subscription.checkoutWindowActive
                    : t.subscription.checkoutWindowClosed}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Payment Window: <strong>10:00 AM – 11:00 AM IST</strong> (Current IST:{' '}
                {paymentWindow.currentIST})
              </p>
              {!paymentWindow.isOpen && (
                <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-amber-800 font-medium">
                    Test Mode: Simulate 10-11 AM IST Window
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simulateDevWindow}
                      onChange={(e) => setSimulateDevWindow(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {checkoutError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{checkoutError}</span>
        </div>
      )}

      {checkoutSuccess && (
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-center gap-3">
          <CheckCircle className="w-4 h-4 shrink-0 text-teal-600" />
          <span>{checkoutSuccess}</span>
        </div>
      )}

      {/* Pricing Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((p) => (
          <div
            key={p.id}
            className={`rounded-3xl border p-6 flex flex-col justify-between transition relative bg-white shadow-sm hover:shadow-md ${
              p.popular
                ? 'border-teal-500 ring-2 ring-teal-500/20'
                : 'border-slate-200'
            }`}
          >
            {p.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-500 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                Most Popular
              </span>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900">{p.price}</span>
                  <span className="text-xs text-slate-400">{p.period}</span>
                </div>
              </div>

              <div className="py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-teal-700">
                {p.allowance}
              </div>

              <ul className="space-y-2 text-xs text-slate-600">
                {p.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-6">
              {p.isCurrent ? (
                <button
                  disabled
                  className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs cursor-default text-center"
                >
                  Current Plan
                </button>
              ) : p.id === 'free' ? (
                <button
                  disabled
                  className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-400 font-bold text-xs cursor-default text-center"
                >
                  Standard Base
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe(p.id)}
                  disabled={purchasingPlan === p.id}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-teal-600 text-white font-bold text-xs transition disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {purchasingPlan === p.id ? t.common.loading : `Upgrade to ${p.name}`}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Invoices History Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t.subscription.invoicesTitle}</h2>
            <p className="text-slate-500 text-xs">Tax invoices issued upon verified Razorpay payment.</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{invoices.length} Issued</span>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            No invoices yet. Paid subscriptions automatically generate formal tax receipts.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">{t.subscription.invoiceNum}</th>
                  <th className="px-4 py-3">{t.subscription.date}</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">{t.subscription.amount}</th>
                  <th className="px-4 py-3">{t.subscription.reference}</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-semibold">{inv.planName}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">₹{inv.amountPaid}.00</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {inv.transactionReference}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setViewingInvoice(inv)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-white text-slate-700 font-semibold text-[11px] cursor-pointer"
                      >
                        {t.subscription.downloadInvoice}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Viewer Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-xl p-8 shadow-2xl relative space-y-6">
            <button
              onClick={() => setViewingInvoice(null)}
              className="absolute top-6 right-6 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-xl text-slate-900">InternConnect</h3>
                <p className="text-xs text-slate-500">Official Tax Invoice</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                PAID RECEIPT
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block text-[11px]">Invoice Number:</span>
                <strong className="text-slate-900">{viewingInvoice.invoiceNumber}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Date Issued:</span>
                <strong className="text-slate-900">
                  {new Date(viewingInvoice.createdAt).toLocaleDateString()}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Billed To:</span>
                <strong className="text-slate-900">{viewingInvoice.userName}</strong>
                <span className="block text-[11px] text-slate-500">{viewingInvoice.userEmail}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Payment Gateway Ref:</span>
                <code className="text-slate-800">{viewingInvoice.transactionReference}</code>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between font-bold text-slate-800">
                <span>{viewingInvoice.planName} Subscription Plan (30 Days)</span>
                <span>₹{viewingInvoice.amountPaid}.00</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Taxes & Processing Fees (Included)</span>
                <span>₹0.00</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-slate-900 text-sm">
                <span>Total Amount Paid</span>
                <span>₹{viewingInvoice.amountPaid}.00 INR</span>
              </div>
            </div>

            <button
              onClick={() => setViewingInvoice(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
            >
              Close Invoice
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
