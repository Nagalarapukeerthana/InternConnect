import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import {
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Laptop,
  Monitor,
  Globe,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
} from 'lucide-react';

interface LoginHistoryProps {
  onNavigate: (page: string) => void;
}

export const LoginHistory: React.FC<LoginHistoryProps> = ({ onNavigate }) => {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch('/api/auth/login-history', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setHistory(data.history || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [token]);

  if (!user) {
    return (
      <div className="text-center py-24 space-y-4">
        <p className="text-slate-600 text-sm">Please sign in to view your security logs.</p>
        <button
          onClick={() => onNavigate('auth')}
          className="px-6 py-2.5 rounded-xl bg-teal-500 font-bold text-xs"
        >
          Sign In
        </button>
      </div>
    );
  }

  const getDeviceIcon = (device: string) => {
    if (device === 'mobile') return <Smartphone className="w-4 h-4 text-amber-500" />;
    if (device === 'tablet') return <Smartphone className="w-4 h-4 text-indigo-500" />;
    return <Monitor className="w-4 h-4 text-teal-600" />;
  };

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-teal-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {t.loginHistory.title}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">{t.loginHistory.subtitle}</p>
          </div>
        </div>

        {/* Security Isolation Guarantee Banner */}
        <div className="mt-4 p-4 rounded-2xl bg-teal-50/70 border border-teal-200 text-teal-900 text-xs flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-teal-600 shrink-0" />
          <span className="font-medium">{t.loginHistory.isolationNotice}</span>
        </div>
      </div>

      {/* Technical Limitations & Governance Disclosure Card */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 sm:p-8 text-white space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-teal-400 font-bold text-xs">
          <Globe className="w-4 h-4" />
          <span>Technical Architecture & Audit Metadata Specification</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-1.5">
            <h4 className="font-bold text-white text-sm">Laptop vs. Desktop Distinction Limitation</h4>
            <p className="leading-relaxed text-slate-400 text-[11px]">
              Standard HTTP User-Agent headers, Client Hints, and navigator interfaces share identical platform architectures for traditional desktop systems (e.g., Windows NT, macOS x86/ARM, Linux). Browser metadata cannot distinguish a laptop hardware chassis from a desktop tower without specialized battery status API heuristics. Therefore, personal computer sessions are categorized under desktop/laptop.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-1.5">
            <h4 className="font-bold text-white text-sm">Active Perimeter Restrictions</h4>
            <ul className="space-y-1 text-slate-400 text-[11px] list-disc list-inside">
              <li><strong>Chrome OTP Gate:</strong> Google Chrome engines trigger cryptographic 6-digit email challenges.</li>
              <li><strong>Mobile Time Gate:</strong> Handheld devices are restricted to 10:00 AM – 1:00 PM IST (Asia/Kolkata).</li>
              <li><strong>Proxy Isolation:</strong> IP resolution strictly logs client IP while masking from external peers.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Authenticated User Audit Stream</h3>
          <span className="text-xs font-semibold text-slate-500">
            {history.length} Event(s) Recorded
          </span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-xs">{t.common.loading}</div>
        ) : history.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-xs">No login events recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">{t.loginHistory.timestamp}</th>
                  <th className="px-6 py-3.5">{t.loginHistory.browser}</th>
                  <th className="px-6 py-3.5">{t.loginHistory.os}</th>
                  <th className="px-6 py-3.5">{t.loginHistory.device}</th>
                  <th className="px-6 py-3.5">{t.loginHistory.ipAddress}</th>
                  <th className="px-6 py-3.5">{t.loginHistory.status}</th>
                  <th className="px-6 py-3.5">{t.loginHistory.reason}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {history.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-600">
                      {new Date(rec.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{rec.browser}</td>
                    <td className="px-6 py-4">{rec.os}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 capitalize font-medium">
                        {getDeviceIcon(rec.deviceCategory)}
                        <span>{rec.deviceCategory}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-500">{rec.ip}</td>
                    <td className="px-6 py-4">
                      {rec.success ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                          <CheckCircle className="w-3 h-3" />
                          <span>{t.loginHistory.successBadge}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3" />
                          <span>{t.loginHistory.blockedBadge}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[11px] text-slate-500">
                      {rec.blockedReason || 'Normal authorized session issuance'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
