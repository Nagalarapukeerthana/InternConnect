import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import {
  Lock,
  Mail,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  KeyRound,
  Shield,
  Info,
} from 'lucide-react';

interface ForgotPasswordProps {
  onNavigate: (page: string) => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onNavigate }) => {
  const { forgotPassword } = useAuth();
  const { t } = useLanguage();

  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewTempPassword, setPreviewTempPassword] = useState<string | null>(null);
  const [credentialsNotice, setCredentialsNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setLoading(true);
    setError(null);
    setMessage(null);
    setPreviewTempPassword(null);
    setCredentialsNotice(null);

    const res = await forgotPassword(identifier.trim());
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Failed to process request');
    } else {
      setMessage(
        res.message ||
          'If an account is associated with this email or phone number, temporary password instructions have been dispatched.'
      );
      if (res.previewTempPassword) {
        setPreviewTempPassword(res.previewTempPassword);
      }
      if (res.credentialsRequiredNotice) {
        setCredentialsNotice(res.credentialsRequiredNotice);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 sm:px-6 space-y-6">
      <button
        onClick={() => onNavigate('auth')}
        className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Sign In</span>
      </button>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-teal-400 flex items-center justify-center mx-auto shadow-sm">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t.auth.forgotPasswordTitle}
          </h1>
          <p className="text-xs text-slate-500">
            Request an automated single-use temporary password for your student profile.
          </p>
        </div>

        {/* Task 3 Rolling 24-Hour Governance Notice Banner */}
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-bold block">Security Rate-Limit Rule</span>
            <p className="text-[11px] text-amber-700 mt-0.5">
              {t.auth.resetNotice} Requests generate an uppercase/lowercase alpha token and require an instant password update upon subsequent login.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">{error}</span>
              {error.includes('only once per day') && (
                <p className="text-[11px] text-rose-600">
                  An automated temporary password has already been dispatched within the past 24 hours. Check your inbox or spam folder.
                </p>
              )}
            </div>
          </div>
        )}

        {message && (
          <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 shrink-0 text-teal-600 mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        {previewTempPassword && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-teal-400">Dev Preview: Generated Temp Password</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Alpha-Only Token</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 font-mono text-center text-teal-300 font-bold text-sm tracking-widest border border-slate-800">
              {previewTempPassword}
            </div>
            {credentialsNotice && (
              <p className="text-[10px] text-slate-400">
                Notice: {credentialsNotice}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-700 text-xs font-semibold mb-1.5">
              {t.auth.emailOrPhone}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="registered.email@example.com or +91 987..."
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500 bg-white"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition disabled:opacity-50 shadow-lg shadow-teal-500/20 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? t.common.loading : t.auth.requestResetBtn}
          </button>
        </form>
      </div>
    </div>
  );
};
