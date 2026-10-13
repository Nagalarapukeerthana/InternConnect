import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: 'student' | 'employer' | 'admin';
  preferredLanguage: string;
  mustChangePassword?: boolean;
}

export interface UserProfile {
  userId: string;
  headline: string;
  bio: string;
  avatarUrl: string;
  location: string;
  education: any[];
  skills: string[];
  experience: any[];
  certifications: any[];
}

export interface Subscription {
  userId: string;
  planId: 'free' | 'bronze' | 'silver' | 'gold';
  monthlyPrice: number;
  monthlyAllowance: number;
  applicationsUsed: number;
  cycleStartDate: string;
  cycleEndDate: string;
  status: 'active' | 'cancelled' | 'expired';
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  subscription: Subscription | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{
    success: boolean;
    chromeOtpRequired?: boolean;
    challengeId?: string;
    maskedEmail?: string;
    previewOtp?: string;
    error?: string;
    code?: string;
  }>;
  verifyChromeOtp: (challengeId: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  register: (fullName: string, email: string, phone: string, password: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (identifier: string) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
    previewTempPassword?: string;
    credentialsRequiredNotice?: string;
  }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('internconnect_token'));
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setProfile(data.profile);
        setSubscription(data.subscription);
      } else {
        // Expired
        localStorage.removeItem('internconnect_token');
        setToken(null);
        setUser(null);
      }
    } catch {
      // Offline / error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (identifier: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Failed to sign in',
          code: data.code,
        };
      }

      if (data.chromeOtpRequired) {
        return {
          success: false,
          chromeOtpRequired: true,
          challengeId: data.challengeId,
          maskedEmail: data.maskedEmail,
          previewOtp: data.previewOtp,
        };
      }

      localStorage.setItem('internconnect_token', data.token);
      setToken(data.token);
      setUser(data.user);
      await fetchCurrentUser(data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const verifyChromeOtp = async (challengeId: string, otp: string) => {
    try {
      const res = await fetch('/api/auth/verify-chrome-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'OTP verification failed' };
      }

      localStorage.setItem('internconnect_token', data.token);
      setToken(data.token);
      setUser(data.user);
      await fetchCurrentUser(data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const register = async (fullName: string, email: string, phone: string, password: string, role: string = 'student') => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone, password, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      localStorage.setItem('internconnect_token', data.token);
      setToken(data.token);
      setUser(data.user);
      await fetchCurrentUser(data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const forgotPassword = async (identifier: string) => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Reset request failed' };
      }

      return {
        success: true,
        message: data.message,
        previewTempPassword: data.previewTempPassword,
        credentialsRequiredNotice: data.credentialsRequiredNotice,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update password' };
      }

      if (user) {
        setUser({ ...user, mustChangePassword: false });
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('internconnect_token');
    setToken(null);
    setUser(null);
    setProfile(null);
    setSubscription(null);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchCurrentUser(token);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        subscription,
        token,
        loading,
        login,
        verifyChromeOtp,
        register,
        forgotPassword,
        changePassword,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
