import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Briefcase,
  MapPin,
  Clock,
  Calendar,
  Building,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  FileText,
  Send,
  X,
  Share2,
} from 'lucide-react';

interface InternshipDetailsProps {
  internshipId: string;
  onNavigate: (page: string, params?: any) => void;
}

export const InternshipDetails: React.FC<InternshipDetailsProps> = ({ internshipId, onNavigate }) => {
  const { t } = useLanguage();
  const { user, subscription, token, refreshUser } = useAuth();

  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Apply modal
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [userResumes, setUserResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState(false);

  useEffect(() => {
    fetchInternship();
  }, [internshipId]);

  const fetchInternship = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/internships/${internshipId}`);
      if (!res.ok) throw new Error('Internship not found');
      const data = await res.json();
      setJob(data.internship);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openApply = async () => {
    if (!user) {
      onNavigate('auth');
      return;
    }
    setApplyModalOpen(true);
    setApplyError(null);
    setApplySuccess(false);

    try {
      const res = await fetch('/api/resumes/my-resumes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = data.resumes || [];
      setUserResumes(list);
      if (list.length > 0) setSelectedResumeId(list[0].id);
    } catch {
      setUserResumes([]);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResumeId) return;

    setApplyLoading(true);
    setApplyError(null);

    try {
      const res = await fetch(`/api/internships/${internshipId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resumeId: selectedResumeId,
          coverLetter,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setApplyError(data.error || 'Failed to submit application');
      } else {
        setApplySuccess(true);
        await refreshUser();
      }
    } catch (err: any) {
      setApplyError(err.message || 'Submission error');
    } finally {
      setApplyLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-24 text-slate-500">{t.common.loading}</div>;
  }

  if (error || !job) {
    return (
      <div className="py-16 text-center space-y-4">
        <h3 className="text-lg font-bold text-slate-800">Internship Not Found</h3>
        <button
          onClick={() => onNavigate('internships')}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
        >
          Back to Internships
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8">
      {/* Back Button */}
      <button
        onClick={() => onNavigate('internships')}
        className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Internships</span>
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <img
              src={job.companyLogo}
              alt={job.companyName}
              className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-sm"
            />
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold text-[11px] mb-2 border border-teal-200">
                {job.category}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                {job.title}
              </h1>
              <p className="text-slate-600 text-sm font-semibold flex items-center gap-1.5 mt-1">
                <Building className="w-4 h-4 text-slate-400" />
                {job.companyName}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end justify-between gap-3">
            <div>
              <span className="text-xs text-slate-400">Monthly Stipend</span>
              <div className="text-2xl font-extrabold text-slate-900">
                ₹{job.stipend.toLocaleString('en-IN')}{' '}
                <span className="text-xs font-normal text-slate-500">/ mo</span>
              </div>
            </div>

            <button
              onClick={openApply}
              className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-teal-500/20 cursor-pointer flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{t.internships.applyNow}</span>
            </button>
          </div>
        </div>

        {/* Quick Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-slate-400 flex items-center gap-1 text-[11px]">
              <MapPin className="w-3.5 h-3.5" /> Location
            </div>
            <div className="font-bold text-slate-800 mt-1">
              {job.isRemote ? 'Remote (Work from Home)' : job.location}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-slate-400 flex items-center gap-1 text-[11px]">
              <Clock className="w-3.5 h-3.5" /> Duration
            </div>
            <div className="font-bold text-slate-800 mt-1">{job.duration}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-slate-400 flex items-center gap-1 text-[11px]">
              <Briefcase className="w-3.5 h-3.5" /> Openings
            </div>
            <div className="font-bold text-slate-800 mt-1">{job.openings} Positions</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-slate-400 flex items-center gap-1 text-[11px]">
              <Calendar className="w-3.5 h-3.5" /> Apply By
            </div>
            <div className="font-bold text-slate-800 mt-1">
              {new Date(job.deadline).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Role Details & Requirements */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">About the Internship</h2>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
              {job.description}
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">{t.internships.requirements}</h2>
            <ul className="space-y-2.5">
              {job.requirements?.map((req: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sidebar Perks & Organization */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm">{t.internships.perks}</h3>
            <ul className="space-y-2 text-xs text-slate-600">
              {job.perks?.map((perk: string, idx: number) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl border border-slate-800 p-6 text-white space-y-4 shadow-md">
            <h3 className="font-bold text-sm">Application Allowance Note</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every internship application requires an ATS-optimized resume (available via Resume Builder for ₹50) and adheres to your subscription application quota.
            </p>
            <button
              onClick={() => onNavigate('subscriptions')}
              className="w-full py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition cursor-pointer"
            >
              View Quotas & Pricing
            </button>
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setApplyModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base mb-1">{job.title}</h3>
            <p className="text-slate-500 text-xs mb-4">{job.companyName}</p>

            {applyError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{applyError}</span>
              </div>
            )}

            {applySuccess ? (
              <div className="text-center py-6 space-y-3">
                <CheckCircle className="w-12 h-12 text-teal-500 mx-auto" />
                <h4 className="font-bold text-slate-900 text-base">Application Submitted!</h4>
                <p className="text-xs text-slate-500">
                  Your profile and verified resume have been transmitted to {job.companyName}.
                </p>
                <button
                  onClick={() => setApplyModalOpen(false)}
                  className="px-6 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
                >
                  Close
                </button>
              </div>
            ) : userResumes.length === 0 ? (
              <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3 text-center my-4">
                <FileText className="w-10 h-10 text-amber-600 mx-auto" />
                <h4 className="font-bold text-sm">Verified Resume Required</h4>
                <p className="text-xs text-amber-700 leading-relaxed">
                  You must have a verified resume generated through our Resume Builder before applying.
                </p>
                <button
                  onClick={() => {
                    setApplyModalOpen(false);
                    onNavigate('resume');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition cursor-pointer"
                >
                  Build Resume First (₹50)
                </button>
              </div>
            ) : (
              <form onSubmit={handleApply} className="space-y-4">
                <div>
                  <label className="block text-slate-700 text-xs font-semibold mb-1.5">
                    Select Verified Resume
                  </label>
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-teal-500"
                  >
                    {userResumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} ({new Date(r.createdAt).toLocaleDateString()}) - Verified ₹50
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 text-xs font-semibold mb-1.5">
                    Cover Letter / Statement
                  </label>
                  <textarea
                    rows={4}
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Briefly state your qualifications and relevant projects..."
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setApplyModalOpen(false)}
                    className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={applyLoading}
                    className="w-1/2 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    {applyLoading ? t.common.loading : 'Confirm Application'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
