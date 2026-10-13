import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Briefcase,
  Search,
  MapPin,
  Clock,
  Building,
  CheckCircle,
  AlertCircle,
  FileText,
  X,
  CreditCard,
  Send,
} from 'lucide-react';

interface BrowseInternshipsProps {
  onNavigate: (page: string, params?: any) => void;
}

export const BrowseInternships: React.FC<BrowseInternshipsProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { user, subscription, token, refreshUser } = useAuth();

  const [internships, setInternships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minStipend, setMinStipend] = useState(0);

  // Apply Modal state
  const [applyingJob, setApplyingJob] = useState<any | null>(null);
  const [userResumes, setUserResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [applyingLoading, setApplyingLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchInternships();
  }, [selectedCategory, remoteOnly, minStipend]);

  const fetchInternships = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'All') params.append('category', selectedCategory);
      if (remoteOnly) params.append('remote', 'true');
      if (minStipend > 0) params.append('minStipend', minStipend.toString());
      if (search) params.append('search', search);

      const res = await fetch(`/api/internships?${params.toString()}`);
      const data = await res.json();
      setInternships(data.internships || []);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInternships();
  };

  const openApplyModal = async (job: any) => {
    if (!user) {
      onNavigate('auth');
      return;
    }

    setApplyingJob(job);
    setApplyError(null);
    setApplySuccess(null);
    setCoverLetter('');

    // Fetch student's verified resumes
    try {
      const res = await fetch('/api/resumes/my-resumes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = data.resumes || [];
      setUserResumes(list);
      if (list.length > 0) {
        setSelectedResumeId(list[0].id);
      }
    } catch {
      setUserResumes([]);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingJob || !selectedResumeId) return;

    setApplyingLoading(true);
    setApplyError(null);

    try {
      const res = await fetch(`/api/internships/${applyingJob.id}/apply`, {
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
        setApplySuccess('Application submitted successfully!');
        await refreshUser();
        setTimeout(() => {
          setApplyingJob(null);
        }, 1800);
      }
    } catch (err: any) {
      setApplyError(err.message || 'An error occurred during submission.');
    } finally {
      setApplyingLoading(false);
    }
  };

  const categories = [
    'All',
    'Software Engineering',
    'UI/UX Design',
    'Data Science',
    'Backend Development',
    'Cybersecurity',
    'Marketing',
  ];

  return (
    <div className="space-y-8 py-6">
      {/* Title & Quota Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {t.internships.title}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">{t.internships.subtitle}</p>
        </div>

        {user && subscription && (
          <div className="flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl border border-slate-800 text-xs shadow-sm">
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                Current Plan: <span className="text-teal-400 uppercase">{subscription.planId}</span>
              </div>
              <div className="font-semibold text-white mt-0.5">
                {subscription.monthlyAllowance === -1
                  ? 'Unlimited Applications'
                  : `${subscription.applicationsUsed} / ${subscription.monthlyAllowance} Applications Used`}
              </div>
            </div>
            {subscription.monthlyAllowance !== -1 && (
              <button
                onClick={() => onNavigate('subscriptions')}
                className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-[11px] transition cursor-pointer"
              >
                Upgrade Plan
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.internships.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-teal-600 text-white font-bold text-xs transition cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs">
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'All' ? t.internships.allCategories : cat}
              </button>
            ))}
          </div>

          {/* Remote toggle & min stipend */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 select-none">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
                className="w-4 h-4 accent-teal-600 rounded"
              />
              <span className="font-medium">{t.internships.remoteOnly}</span>
            </label>

            <div className="flex items-center gap-2 text-slate-600">
              <span>{t.internships.minStipend}:</span>
              <select
                value={minStipend}
                onChange={(e) => setMinStipend(parseInt(e.target.value, 10))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value={0}>Any</option>
                <option value={15000}>₹15,000+</option>
                <option value={20000}>₹20,000+</option>
                <option value={25000}>₹25,000+</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Internships List */}
      {loading ? (
        <div className="text-center py-20 text-slate-500 text-sm">{t.common.loading}</div>
      ) : internships.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-base">{t.internships.noResults}</h3>
          <p className="text-xs text-slate-500">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {internships.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <img
                    src={job.companyLogo}
                    alt={job.companyName}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-100"
                  />
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                    {job.category}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-1">
                    {job.title}
                  </h3>
                  <p className="text-slate-500 text-xs font-medium flex items-center gap-1 mt-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    {job.companyName}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {job.isRemote ? 'Remote' : job.location.split(',')[0]}
                  </span>
                  <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {job.duration}
                  </span>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {job.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Monthly Stipend</span>
                  <div className="text-base font-extrabold text-slate-900">
                    ₹{job.stipend.toLocaleString('en-IN')}{' '}
                    <span className="text-[10px] font-normal text-slate-500">/ mo</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigate('internship-details', { id: job.id })}
                    className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => openApplyModal(job)}
                    className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    {t.internships.applyNow}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Application Submission Modal */}
      {applyingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setApplyingJob(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <img
                src={applyingJob.companyLogo}
                alt={applyingJob.companyName}
                className="w-12 h-12 rounded-xl object-cover border border-slate-100"
              />
              <div>
                <h3 className="font-bold text-slate-900 text-base">{applyingJob.title}</h3>
                <p className="text-slate-500 text-xs font-medium">
                  {applyingJob.companyName} • ₹{applyingJob.stipend.toLocaleString('en-IN')} / mo
                </p>
              </div>
            </div>

            {applyError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{applyError}</span>
              </div>
            )}

            {applySuccess ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle className="w-12 h-12 text-teal-500 mx-auto" />
                <h4 className="font-bold text-slate-900 text-base">{applySuccess}</h4>
                <p className="text-xs text-slate-500">
                  Your application has been received by {applyingJob.companyName}.
                </p>
              </div>
            ) : userResumes.length === 0 ? (
              <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3 text-center my-4">
                <FileText className="w-10 h-10 text-amber-600 mx-auto" />
                <h4 className="font-bold text-sm">{t.internships.noResumeAlert}</h4>
                <p className="text-xs text-amber-700 leading-relaxed">
                  InternConnect requires a verified, ATS-compliant resume to protect hiring quality. Generate one with Resume Builder (gated by ₹50 payment).
                </p>
                <button
                  onClick={() => {
                    setApplyingJob(null);
                    onNavigate('resume');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shadow-sm cursor-pointer"
                >
                  {t.internships.createResumeNow}
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplySubmit} className="space-y-4">
                <div>
                  <label className="block text-slate-700 text-xs font-semibold mb-1.5">
                    {t.internships.selectResume}
                  </label>
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-teal-500 cursor-pointer"
                  >
                    {userResumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} (Created {new Date(r.createdAt).toLocaleDateString()}) - Verified ₹50
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 text-xs font-semibold mb-1.5">
                    {t.internships.coverLetterLabel}
                  </label>
                  <textarea
                    rows={4}
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Describe why you are a great match for this role and your key skills..."
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] flex items-center justify-between">
                  <span>Subscription Allowance:</span>
                  <span className="font-bold text-slate-900">
                    {subscription?.monthlyAllowance === -1
                      ? 'Unlimited'
                      : `${subscription?.applicationsUsed} of ${subscription?.monthlyAllowance} used`}
                  </span>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setApplyingJob(null)}
                    className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={applyingLoading}
                    className="w-1/2 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    {applyingLoading ? t.common.loading : t.internships.submitApplication}
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
