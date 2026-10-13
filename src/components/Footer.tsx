import React from 'react';
import { useLanguage } from '../context/LanguageContext.js';
import { Briefcase, Shield, Lock, Award, Heart } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { t } = useLanguage();

  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-xs py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('home')}>
              <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-slate-950 font-bold">
                <Briefcase className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-lg text-white">Intern<span className="text-teal-400">Connect</span></span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Full-Stack Internship Platform engineered for ElevanceSkills Web Development Internship track.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-teal-400 font-semibold bg-teal-950/40 border border-teal-800/40 px-2.5 py-1 rounded-md w-fit">
              <Shield className="w-3.5 h-3.5" /> Zero-Trust Security Architecture
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">Platform Navigation</h4>
            <ul className="space-y-2">
              <li><button onClick={() => onNavigate('home')} className="hover:text-teal-400 transition">{t.nav.home}</button></li>
              <li><button onClick={() => onNavigate('internships')} className="hover:text-teal-400 transition">{t.nav.browseInternships}</button></li>
              <li><button onClick={() => onNavigate('resume')} className="hover:text-teal-400 transition">{t.nav.resumeBuilder} (₹50)</button></li>
              <li><button onClick={() => onNavigate('community')} className="hover:text-teal-400 transition">{t.nav.publicSpace}</button></li>
              <li><button onClick={() => onNavigate('subscriptions')} className="hover:text-teal-400 transition">{t.nav.subscriptions}</button></li>
            </ul>
          </div>

          {/* Security & Access */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">Security & Compliance</h4>
            <ul className="space-y-2">
              <li><button onClick={() => onNavigate('security')} className="hover:text-teal-400 transition">{t.nav.loginHistory}</button></li>
              <li><button onClick={() => onNavigate('forgot-password')} className="hover:text-teal-400 transition">Password Recovery</button></li>
              <li><button onClick={() => onNavigate('settings')} className="hover:text-teal-400 transition">Internationalization Settings</button></li>
              <li><button onClick={() => onNavigate('legal')} className="hover:text-teal-400 transition">{t.legal.privacyTitle}</button></li>
              <li><button onClick={() => onNavigate('legal')} className="hover:text-teal-400 transition">{t.legal.termsTitle}</button></li>
            </ul>
          </div>

          {/* Internship Track Details */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">Project Attributes</h4>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>ElevanceSkills Internship Project</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Lock className="w-3.5 h-3.5 text-teal-400" />
                <span>Asia/Kolkata IST Governance</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Chrome OTP & Razorpay HMAC</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <p>© {new Date().getFullYear()} InternConnect. Built for ElevanceSkills Full Stack Web Development Internship.</p>
          <p className="flex items-center gap-1 text-slate-500">
            Crafted with React, TypeScript, Express, and Cloud Architecture
          </p>
        </div>
      </div>
    </footer>
  );
};
