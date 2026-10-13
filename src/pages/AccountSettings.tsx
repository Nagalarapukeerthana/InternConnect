import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { Language } from '../i18n/translations.js';
import {
  Settings,
  Lock,
  Globe,
  User,
  CheckCircle,
  AlertCircle,
  Shield,
} from 'lucide-react';

export const AccountSettings: React.FC = () => {
  const { user, profile, changePassword, token, refreshUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  // Password update fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Profile details update
  const [headline, setHeadline] = useState(profile?.headline || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    const res = await changePassword(currentPassword, newPassword);
    setPasswordLoading(false);

    if (res.success) {
      setPasswordSuccess('Password successfully updated!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordError(res.error || 'Failed to update password');
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess(null);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ headline, bio, location }),
      });

      if (res.ok) {
        setProfileSuccess('Profile information saved!');
        await refreshUser();
      }
    } catch {}
    finally {
      setProfileLoading(false);
    }
  };

  const languagesList: Array<{ code: Language; label: string; flag: string }> = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
    { code: 'pt', label: 'Português', flag: '🇧🇷' },
    { code: 'zh', label: '简体中文', flag: '🇨🇳' },
    { code: 'fr', label: 'Français (Requires OTP)', flag: '🇫🇷' },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-teal-400 flex items-center justify-center">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {t.settings.title}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Manage internationalization, security credentials, and public showcase data.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Language Selection Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-600" />
            <span>{t.settings.languageTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Select your preferred interface language. Note: Selecting French mandates single-use OTP verification to adhere to Task 1 security policy.
          </p>

          <div className="space-y-2 pt-2">
            {languagesList.map((item) => (
              <button
                key={item.code}
                onClick={() => setLanguage(item.code)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border text-xs font-semibold transition cursor-pointer ${
                  language === item.code
                    ? 'border-teal-500 bg-teal-50/50 text-teal-900 shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base">{item.flag}</span>
                  <span>{item.label}</span>
                </span>
                {language === item.code && (
                  <CheckCircle className="w-4 h-4 text-teal-600" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-teal-600" />
            <span>{t.settings.changePasswordTitle}</span>
          </h2>

          {passwordSuccess && (
            <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-teal-600" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <label className="block text-slate-700 text-xs font-semibold mb-1">
                {t.settings.currentPassword}
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 text-xs font-semibold mb-1">
                {t.settings.newPassword}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 text-xs font-semibold mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer"
            >
              {passwordLoading ? t.common.loading : t.settings.updatePasswordBtn}
            </button>
          </form>
        </div>
      </div>

      {/* Profile Details Edit Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <User className="w-4 h-4 text-teal-600" />
          <span>Profile Details</span>
        </h2>

        {profileSuccess && (
          <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-teal-600" />
            <span>{profileSuccess}</span>
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 text-xs font-semibold mb-1">
                Professional Headline
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Software Engineer Aspirant | React Developer"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 text-xs font-semibold mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Bengaluru, India"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 text-xs font-semibold mb-1">Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell recruiters about yourself..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={profileLoading}
              className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              {profileLoading ? t.common.loading : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
