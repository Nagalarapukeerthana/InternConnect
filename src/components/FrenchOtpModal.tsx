import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext.js';
import { Lock, AlertCircle, CheckCircle2, X } from 'lucide-react';

export const FrenchOtpModal: React.FC = () => {
  const {
    isFrenchModalOpen,
    setIsFrenchModalOpen,
    pendingFrenchChallengeId,
    frenchMaskedEmail,
    frenchPreviewOtp,
    verifyFrenchOtp,
    requestFrenchOtp,
    t,
  } = useLanguage();

  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  if (!isFrenchModalOpen || !pendingFrenchChallengeId) {
    return null;
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await verifyFrenchOtp(pendingFrenchChallengeId, otp);
    setSubmitting(false);

    if (!res.success) {
      setError(res.error || 'Invalid or expired OTP code.');
    } else {
      setOtp('');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError(null);
    const res = await requestFrenchOtp();
    if (res.success) {
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setError(res.error || 'Failed to resend code');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={() => setIsFrenchModalOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">{t.settings.frenchOtpTitle}</h3>
            <p className="text-slate-400 text-xs">Policy Requirement: Cryptographic Verification</p>
          </div>
        </div>

        <p className="text-slate-300 text-xs leading-relaxed mb-4">
          {t.settings.frenchOtpPrompt} A 6-digit verification code was dispatched to{' '}
          <strong className="text-teal-400 font-mono">{frenchMaskedEmail}</strong>. Code expires in 5 minutes.
        </p>

        {frenchPreviewOtp && (
          <div className="mb-4 p-3 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-teal-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
              <span>Local Development Mode</span>
            </span>
            <p className="text-[11px] text-slate-300">
              Real email requires SMTP in .env. Test OTP code:{' '}
              <span className="font-mono font-bold text-teal-200 text-sm tracking-widest">{frenchPreviewOtp}</span>
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-1.5">
              Enter 6-Digit Verification Code
            </label>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-full text-center tracking-[0.5em] font-mono text-xl py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0}
              className={`font-medium ${
                cooldown > 0
                  ? 'text-slate-500 cursor-not-allowed'
                  : 'text-teal-400 hover:text-teal-300'
              }`}
            >
              {cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend Code'}
            </button>
            <span className="text-slate-500 text-[11px]">Max 3 attempts</span>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setIsFrenchModalOpen(false)}
              className="w-1/2 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={submitting || otp.length !== 6}
              className="w-1/2 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-lg shadow-teal-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? t.common.loading : t.settings.verifyFrenchBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
