import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext.js';
import { useAuth } from '../context/AuthContext.js';
import { Language } from '../i18n/translations.js';
import {
  Briefcase,
  FileText,
  Users,
  CreditCard,
  ShieldCheck,
  User as UserIcon,
  Globe,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Lock,
} from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const { language, setLanguage, t } = useLanguage();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const languagesList: Array<{ code: Language; label: string; flag: string }> = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
    { code: 'pt', label: 'Português', flag: '🇧🇷' },
    { code: 'zh', label: '简体中文', flag: '🇨🇳' },
    { code: 'fr', label: 'Français (OTP Protected)', flag: '🇫🇷' },
  ];

  const handleLangSelect = (code: Language) => {
    setLanguage(code);
    setLangDropdownOpen(false);
  };

  const navLinks = [
    { id: 'home', label: t.nav.home },
    { id: 'internships', label: t.nav.browseInternships, icon: Briefcase },
    { id: 'resume', label: t.nav.resumeBuilder, icon: FileText },
    { id: 'community', label: t.nav.publicSpace, icon: Users },
    { id: 'subscriptions', label: t.nav.subscriptions, icon: CreditCard },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onNavigate('home')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1">
                Intern<span className="text-teal-400">Connect</span>
              </div>
              <p className="text-[10px] text-slate-400 -mt-1 font-medium tracking-wider uppercase">
                ElevanceSkills Edition
              </p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  currentPage === item.id
                    ? 'bg-teal-500/15 text-teal-400 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Action Icons: Language, Profile/Auth */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium hover:bg-slate-750 hover:border-slate-600 transition"
                title="Select language"
              >
                <Globe className="w-3.5 h-3.5 text-teal-400" />
                <span className="uppercase font-semibold tracking-wider">{language}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {langDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-850 border border-slate-700 bg-slate-900 shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {t.nav.language}
                  </div>
                  {languagesList.map((item) => (
                    <button
                      key={item.code}
                      onClick={() => handleLangSelect(item.code)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition ${
                        language === item.code
                          ? 'bg-teal-500/10 text-teal-300 font-semibold'
                          : 'text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{item.flag}</span>
                        <span>{item.label}</span>
                      </span>
                      {item.code === 'fr' && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> OTP
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Account Controls */}
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('security')}
                  className={`p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition ${
                    currentPage === 'security' ? 'text-teal-400 bg-teal-500/10' : ''
                  }`}
                  title={t.nav.loginHistory}
                >
                  <ShieldCheck className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onNavigate('profile')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                    currentPage === 'profile'
                      ? 'border-teal-500 bg-teal-500/10 text-teal-300'
                      : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5 text-teal-400" />
                  <span className="max-w-[100px] truncate">{user.fullName.split(' ')[0]}</span>
                </button>

                <button
                  onClick={() => onNavigate('settings')}
                  className={`p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition ${
                    currentPage === 'settings' ? 'text-teal-400 bg-teal-500/10' : ''
                  }`}
                  title={t.nav.settings}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                  title={t.nav.logout}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('auth')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition"
                >
                  {t.nav.login}
                </button>
                <button
                  onClick={() => onNavigate('auth')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition shadow-sm font-bold"
                >
                  {t.nav.register}
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-6 space-y-3">
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-800">
            {navLinks.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left ${
                  currentPage === item.id
                    ? 'bg-teal-500/15 text-teal-400'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Mobile Language Switcher */}
          <div className="pt-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {t.nav.language}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {languagesList.map((item) => (
                <button
                  key={item.code}
                  onClick={() => {
                    handleLangSelect(item.code);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-2 py-1.5 rounded-md text-[11px] flex items-center justify-center gap-1 border ${
                    language === item.code
                      ? 'border-teal-500 bg-teal-500/20 text-teal-300 font-bold'
                      : 'border-slate-800 bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <span>{item.flag}</span>
                  <span className="uppercase">{item.code}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Auth */}
          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
            {user ? (
              <>
                <button
                  onClick={() => {
                    onNavigate('profile');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-lg flex items-center gap-2"
                >
                  <UserIcon className="w-4 h-4 text-teal-400" />
                  {user.fullName} ({t.nav.profile})
                </button>
                <button
                  onClick={() => {
                    onNavigate('security');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-lg flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-teal-400" />
                  {t.nav.loginHistory}
                </button>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-rose-400 hover:bg-slate-800 rounded-lg flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  {t.nav.logout}
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  onNavigate('auth');
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2 bg-teal-500 text-slate-950 font-bold text-xs rounded-lg text-center"
              >
                {t.nav.login} / {t.nav.register}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
