import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations, Translations } from '../i18n/translations.js';

interface LanguageContextType {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => Promise<boolean>;
  requestFrenchOtp: () => Promise<{ success: boolean; challengeId?: string; maskedEmail?: string; previewOtp?: string; error?: string }>;
  verifyFrenchOtp: (challengeId: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  isFrenchModalOpen: boolean;
  setIsFrenchModalOpen: (open: boolean) => void;
  pendingFrenchChallengeId: string | null;
  frenchMaskedEmail: string | null;
  frenchPreviewOtp: string | null;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('internconnect_lang') as Language;
    return ['en', 'es', 'hi', 'pt', 'zh', 'fr'].includes(saved) ? saved : 'en';
  });

  const [isFrenchModalOpen, setIsFrenchModalOpen] = useState(false);
  const [pendingFrenchChallengeId, setPendingFrenchChallengeId] = useState<string | null>(null);
  const [frenchMaskedEmail, setFrenchMaskedEmail] = useState<string | null>(null);
  const [frenchPreviewOtp, setFrenchPreviewOtp] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('internconnect_lang', language);
    document.documentElement.lang = language;
  }, [language]);

  const requestFrenchOtp = async () => {
    try {
      const token = localStorage.getItem('internconnect_token');
      const res = await fetch('/api/auth/language/request-french-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to request French OTP' };
      }

      setPendingFrenchChallengeId(data.challengeId);
      setFrenchMaskedEmail(data.maskedEmail);
      setFrenchPreviewOtp(data.previewOtp || null);
      setIsFrenchModalOpen(true);
      return {
        success: true,
        challengeId: data.challengeId,
        maskedEmail: data.maskedEmail,
        previewOtp: data.previewOtp,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const verifyFrenchOtp = async (challengeId: string, otp: string) => {
    try {
      const token = localStorage.getItem('internconnect_token');
      const res = await fetch('/api/auth/language/verify-french-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ challengeId, otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid or expired OTP' };
      }

      setLanguageState('fr');
      setIsFrenchModalOpen(false);
      setPendingFrenchChallengeId(null);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const setLanguage = async (newLang: Language): Promise<boolean> => {
    if (newLang === 'fr') {
      // Mandates OTP verification challenge before applying French
      const token = localStorage.getItem('internconnect_token');
      if (!token) {
        alert('Please sign in first to verify your identity before selecting French language.');
        return false;
      }
      await requestFrenchOtp();
      return false; // Will switch upon successful verifyFrenchOtp
    }

    setLanguageState(newLang);
    const token = localStorage.getItem('internconnect_token');
    if (token) {
      fetch('/api/auth/language/set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ language: newLang }),
      }).catch(() => {});
    }
    return true;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        t: translations[language],
        setLanguage,
        requestFrenchOtp,
        verifyFrenchOtp,
        isFrenchModalOpen,
        setIsFrenchModalOpen,
        pendingFrenchChallengeId,
        frenchMaskedEmail,
        frenchPreviewOtp,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
