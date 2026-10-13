import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Download,
  ExternalLink,
} from 'lucide-react';

interface StudentProfileProps {
  onNavigate: (page: string, params?: any) => void;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ onNavigate }) => {
  const { user, profile, subscription, token } = useAuth();
  const { t } = useLanguage();

  const [resumes, setResumes] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [recentLogins, setRecentLogins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      Promise.all([
        fetch('/api/resumes/my-resumes', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        fetch('/api/internships/student/my-applications', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        fetch('/api/auth/login-history', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      ])
        .then(([resData, appData, histData]) => {
          setResumes(resData.resumes || []);
          setApplications(appData.applications || []);
          setRecentLogins((histData.history || []).slice(0, 5));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [token]);

  if (!user) {
    return (
      <div className="text-center py-24 space-y-4">
        <p className="text-slate-600 text-sm">Please sign in to view your profile.</p>
        <button
          onClick={() => onNavigate('auth')}
          className="px-6 py-2.5 rounded-xl bg-teal-500 font-bold text-xs"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-8">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <img
              src={profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.fullName)}`}
              alt={user.fullName}
              className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900">{user.fullName}</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 uppercase">
                  {user.role}
                </span>
              </div>
              <p className="text-slate-600 text-xs font-medium mt-1">
                {profile?.headline || 'Undergraduate Student at InternConnect'}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {user.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {user.phone}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {profile?.location || 'India'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-2">
            <button
              onClick={() => onNavigate('settings')}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Edit Profile
            </button>
            <button
              onClick={() => onNavigate('security')}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Full Audit Logs</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Education, Skills, Resumes */}
        <div className="lg:col-span-2 space-y-8">
          {/* Saved Verified Resumes */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Verified Resumes</h2>
                <p className="text-slate-500 text-xs">Official resumes ready for internship attachment.</p>
              </div>
              <button
                onClick={() => onNavigate('resume')}
                className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition shadow-sm cursor-pointer"
              >
                + New Resume (₹50)
              </button>
            </div>

            {resumes.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200/80 p-6 space-y-3">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-600">No verified resume yet. Build one to start applying!</p>
                <button
                  onClick={() => onNavigate('resume')}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
                >
                  Create ATS Resume (₹50)
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {resumes.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-teal-400 transition bg-slate-50/50 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{r.title}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="text-teal-600 font-semibold flex items-center gap-0.5">
                            <CheckCircle className="w-3 h-3" /> Paid ₹{r.amountPaid}
                          </span>
                          <span>•</span>
                          <span>Ref: {r.paymentTransactionId || 'Razorpay Verified'}</span>
                          <span>•</span>
                          <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigate('resume', { resumeId: r.id })}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submitted Applications */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Application History</h2>
            {applications.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No applications submitted yet.</p>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                        {app.internshipTitle}
                      </h4>
                      <p className="text-slate-500 text-xs">
                        {app.companyName} • Applied on {new Date(app.submittedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 capitalize">
                      {app.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quota Summary & Recent Security Logins */}
        <div className="space-y-8">
          {/* Subscription Quota Widget */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl border border-slate-800 p-6 text-white space-y-4 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-teal-400 text-xs font-bold uppercase tracking-wider">
                Monthly Allowance
              </span>
              <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold uppercase">
                {subscription?.planId} Plan
              </span>
            </div>

            <div className="text-2xl font-extrabold">
              {subscription?.monthlyAllowance === -1
                ? 'Unlimited Applications'
                : `${subscription?.applicationsUsed || 0} / ${subscription?.monthlyAllowance || 1}`}
            </div>

            <p className="text-slate-400 text-xs leading-relaxed">
              Quota renews monthly. Reset occurs automatically upon subscription upgrade.
            </p>

            <button
              onClick={() => onNavigate('subscriptions')}
              className="w-full py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition cursor-pointer"
            >
              Upgrade Subscription
            </button>
          </div>

          {/* Recent Security Attempts (Isolated to user) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>Recent Logins</span>
              </h3>
              <button
                onClick={() => onNavigate('security')}
                className="text-[11px] font-bold text-teal-600 hover:text-teal-700 cursor-pointer"
              >
                View All
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              Isolated audit trail of access attempts recorded for this account.
            </p>

            <div className="space-y-2.5">
              {recentLogins.map((rec) => (
                <div
                  key={rec.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-800">
                      {rec.browser} ({rec.os})
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(rec.timestamp).toLocaleString()}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      rec.success
                        ? 'bg-teal-50 text-teal-700 border border-teal-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {rec.success ? 'Success' : 'Blocked'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
