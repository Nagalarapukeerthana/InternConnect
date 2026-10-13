import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { ChromeOtpModal } from '../components/ChromeOtpModal.js';
import {
  Lock,
  Mail,
  Phone,
  User as UserIcon,
  AlertCircle,
  CheckCircle,
  Briefcase,
  Shield,
  Smartphone,
  Info,
} from 'lucide-react';

interface AuthPageProps {
  onNavigate: (page: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onNavigate }) => {
  const { login, register } = useAuth();
  const { t } = useLanguage();

  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login fields
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any | null>(null);

  // Chrome challenge modal state
  const [chromeChallengeId, setChromeChallengeId] = useState<string | null>(null);
  const [chromeMaskedEmail, setChromeMaskedEmail] = useState<string | null>(null);
  const [chromePreviewOtp, setChromePreviewOtp] = useState<string | undefined>(undefined);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrorDetails(null);

    const res = await login(identifier, loginPassword);
    setLoading(false);

    if (res.chromeOtpRequired) {
      setChromeChallengeId(res.challengeId!);
      setChromeMaskedEmail(res.maskedEmail!);
      setChromePreviewOtp(res.previewOtp);
      return;
    }

    if (!res.success) {
      setError(res.error || 'Failed to sign in');
      if (res.code === 'MOBILE_WINDOW_RESTRICTION') {
        setErrorDetails({
          code: res.code,
          message: res.error,
        });
      }
    } else {
      onNavigate('home');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await register(fullName, regEmail, regPhone, regPassword, 'student');
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Failed to register account');
    } else {
      onNavigate('home');
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 sm:px-6">
      {/* Brand Icon & Heading */}
      <div className="text-center space-y-2 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-teal-400 flex items-center justify-center text-white mx-auto shadow-lg shadow-teal-500/20">
          <Briefcase className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {tab === 'login' ? t.auth.loginTitle : t.auth.registerTitle}
        </h2>
        <p className="text-slate-500 text-xs">
          ElevanceSkills Full Stack Internship Platform
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
        <button
          onClick={() => {
            setTab('login');
            setError(null);
          }}
          className={`w-1/2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            tab === 'login'
              ? 'bg-white text-slate-950 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => {
            setTab('register');
            setError(null);
          }}
          className={`w-1/2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            tab === 'register'
              ? 'bg-white text-slate-950 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Student Register
        </button>
      </div>

      {/* Security Policies Info Box */}
      <div className="mb-6 p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 text-[11px] space-y-2">
        <div className="flex items-center gap-2 text-teal-400 font-bold">
          <Shield className="w-3.5 h-3.5" />
          <span>Active Zero-Trust Access Rules</span>
        </div>
        <ul className="text-slate-300 space-y-1 list-disc list-inside">
          <li><strong>Google Chrome:</strong> Requires mandatory Email OTP code.</li>
          <li><strong>Mobile Devices:</strong> Logins allowed strictly 10:00 AM – 1:00 PM IST.</li>
        </ul>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">{error}</span>
            {errorDetails?.code === 'MOBILE_WINDOW_RESTRICTION' && (
              <p className="text-[11px] text-rose-600">
                Current local IST time is outside the allowed mobile window (10:00 AM - 1:00 PM IST). Please use a desktop browser or sign in during the permitted window.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Login Form */}
      {tab === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-4">
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
                placeholder="student@internconnect.com or +91 9876543210"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500 bg-white"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-700 text-xs font-semibold">
                {t.auth.password}
              </label>
              <button
                type="button"
                onClick={() => onNavigate('forgot-password')}
                className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 cursor-pointer"
              >
                {t.auth.forgotPasswordLink}
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
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
            {loading ? t.common.loading : t.auth.signInBtn}
          </button>

          <button
            type="button"
            onClick={() => {
              setIdentifier('student@internconnect.com');
              setLoginPassword('StudentPass123!');
            }}
            className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition border border-slate-200"
          >
            Quick-Fill Demo Student Credentials
          </button>
        </form>
      ) : (
        /* Register Form */
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-slate-700 text-xs font-semibold mb-1.5">
              {t.auth.fullName}
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Aarav Sharma"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500 bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 text-xs font-semibold mb-1.5">
              {t.auth.email}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="aarav@college.edu"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500 bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 text-xs font-semibold mb-1.5">
              {t.auth.phone}
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500 bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 text-xs font-semibold mb-1.5">
              {t.auth.password} (min 8 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••••••"
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
            {loading ? t.common.loading : t.auth.signUpBtn}
          </button>
        </form>
      )}

      {/* Chrome OTP Verification Modal */}
      {chromeChallengeId && chromeMaskedEmail && (
        <ChromeOtpModal
          challengeId={chromeChallengeId}
          maskedEmail={chromeMaskedEmail}
          previewOtp={chromePreviewOtp}
          onSuccess={() => {
            setChromeChallengeId(null);
            onNavigate('home');
          }}
          onCancel={() => setChromeChallengeId(null)}
        />
      )}
    </div>
  );
};
