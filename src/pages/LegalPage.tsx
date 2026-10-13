import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext.js';
import { Shield, FileCheck, Lock, Globe } from 'lucide-react';

export const LegalPage: React.FC = () => {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'privacy' | 'terms'>('privacy');

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-teal-600 font-bold text-xs uppercase tracking-wider">
          <Shield className="w-4 h-4" />
          <span>Compliance & Legal Architecture</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          {tab === 'privacy' ? t.legal.privacyTitle : t.legal.termsTitle}
        </h1>
        <p className="text-slate-500 text-xs">{t.legal.lastUpdated}</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl max-w-sm">
        <button
          onClick={() => setTab('privacy')}
          className={`w-1/2 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            tab === 'privacy' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          Privacy Policy
        </button>
        <button
          onClick={() => setTab('terms')}
          className={`w-1/2 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            tab === 'terms' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          Terms of Service
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
        {tab === 'privacy' ? (
          <>
            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">1. Zero-Trust Personal Data Isolation</h2>
              <p>
                InternConnect enforces strict role-based and attribute-based access control (ABAC). Student Personally Identifiable Information (PII) including email addresses, phone credentials, and audit logs are isolated strictly to the authenticated record holder. Zero cross-tenant data scraping is permitted.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">2. Security Auditing & Environment Governance</h2>
              <p>
                In accordance with Task 5 standards, user sessions track browser type, operating system, device categories, and server-trusted IP addresses. Google Chrome sessions require email OTP challenge verification. Handheld mobile logins are governed strictly during the Asia/Kolkata 10:00 AM – 1:00 PM IST window.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">3. Cryptographic Token Lifecycle</h2>
              <p>
                All OTP challenges (French language verification, resume payment authorization, and Chrome login challenge) are hashed using SHA-256 before storage, expire within 5 minutes, and are permanently purged after 3 failed attempts. Temporary passwords use pure uppercase and lowercase alphabets with zero special characters, bounded to a single daily rolling attempt.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">4. Payment Gateway Security</h2>
              <p>
                Payment data is handled exclusively via Razorpay server-side signature verification (HMAC-SHA256). Credit card numbers, CVVs, and banking secrets never transit or touch InternConnect application servers.
              </p>
            </section>
          </>
        ) : (
          <>
            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">1. Acceptance of Terms</h2>
              <p>
                By accessing InternConnect (developed for the ElevanceSkills Full Stack Web Development Internship track), you agree to comply with platform access standards, time-window governance, and student community posting rules.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">2. Resume Builder & ₹50 Generation Fee</h2>
              <p>
                Resume generation charges an official fee of ₹50.00 per generated document. Amounts submitted by client browsers are overridden by server-side verification. Resumes are issued only following verified Razorpay webhook or signature validation.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">3. Subscription Application Allowances</h2>
              <p>
                Monthly internship applications adhere to plan allowances (Free: 1, Bronze: 3, Silver: 5, Gold: Unlimited). Payments may be initiated strictly between 10:00 AM and 11:00 AM IST. Application counts are validated server-side and reset on monthly billing cycle renewal.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">4. Public Space Community Standards</h2>
              <p>
                Community posting limits are governed server-side based on authentic accepted bilateral friendships (0 friends: 0 posts/day, 1 friend: 1 post/day, 2 friends: 2 posts/day, 3–10 friends: default 1 post/day, &gt;10 friends: unlimited). Simultaneous or bypassed client requests are rejected atomically.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
};
