import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext.js';
import {
  Briefcase,
  FileText,
  Users,
  ShieldCheck,
  TrendingUp,
  Award,
  CheckCircle,
  ArrowRight,
  Building,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';

interface HomeProps {
  onNavigate: (page: string, params?: any) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const [featured, setFeatured] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/internships')
      .then((res) => res.json())
      .then((data) => {
        if (data.internships) {
          setFeatured(data.internships.slice(0, 3));
        }
      })
      .catch(() => {});
  }, []);

  const categories = [
    { title: 'Software Engineering', icon: '💻', count: '140+ Openings' },
    { title: 'Data Science & AI', icon: '📊', count: '85+ Openings' },
    { title: 'UI/UX & Product Design', icon: '🎨', count: '60+ Openings' },
    { title: 'Backend Systems', icon: '⚙️', count: '75+ Openings' },
    { title: 'Cybersecurity', icon: '🛡️', count: '30+ Openings' },
    { title: 'Growth & Marketing', icon: '🚀', count: '50+ Openings' },
  ];

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 border border-slate-800 p-8 sm:p-12 lg:p-16 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ElevanceSkills Full Stack Web Development Internship Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            {t.home.heroTitle}
          </h1>

          <p className="text-slate-300 text-sm sm:text-base lg:text-lg leading-relaxed">
            {t.home.heroSubtitle}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={() => onNavigate('internships')}
              className="px-6 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-teal-500/25 flex items-center gap-2 group cursor-pointer"
            >
              <span>{t.home.exploreBtn}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onNavigate('resume')}
              className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white font-semibold text-sm transition flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-teal-400" />
              <span>{t.home.buildResumeBtn}</span>
            </button>
          </div>

          {/* Key Metrics Strip */}
          <div className="pt-8 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-teal-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">12,500+</div>
                <div className="text-xs text-slate-400">Applications Handled</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">450+</div>
                <div className="text-xs text-slate-400">Verified Companies</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">₹35,000</div>
                <div className="text-xs text-slate-400">Top Monthly Stipend</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Internships */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {t.home.featuredHeading}
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              Hand-picked verified opportunities offering competitive stipends and career growth.
            </p>
          </div>
          <button
            onClick={() => onNavigate('internships')}
            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featured.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
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

                <div className="flex flex-wrap gap-2 text-xs text-slate-600 pt-1">
                  <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {job.isRemote ? 'Remote' : job.location.split(',')[0]}
                  </span>
                  <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {job.duration}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Stipend</span>
                  <div className="text-sm font-extrabold text-slate-900">
                    ₹{job.stipend.toLocaleString('en-IN')}{' '}
                    <span className="text-[10px] font-normal text-slate-500">/ mo</span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('internship-details', { id: job.id })}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-teal-600 text-white text-xs font-bold transition cursor-pointer"
                >
                  {t.internships.viewDetails}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories Grid */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t.home.categoriesHeading}
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Choose from trending specialized technical and business disciplines.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.title}
              onClick={() => onNavigate('internships')}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-teal-400 hover:shadow-sm cursor-pointer transition text-center space-y-2 group"
            >
              <div className="text-3xl group-hover:scale-110 transition-transform">
                {cat.icon}
              </div>
              <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{cat.title}</h4>
              <p className="text-[10px] text-teal-600 font-semibold">{cat.count}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Zero Trust Architecture & Why Trust Section */}
      <section className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-white border border-slate-800 space-y-8 shadow-xl">
        <div className="max-w-2xl">
          <span className="text-teal-400 text-xs font-bold uppercase tracking-wider">
            Verified Engineering Standard
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
            {t.home.whyTitle}
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed">
            Engineered with defense-in-depth principles: zero-trust authentication, atomic database rate limiting, and server-side payment verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-850 p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">{t.home.why1Title}</h3>
            <p className="text-slate-400 text-xs leading-relaxed">{t.home.why1Desc}</p>
          </div>

          <div className="bg-slate-850 p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">{t.home.why2Title}</h3>
            <p className="text-slate-400 text-xs leading-relaxed">{t.home.why2Desc}</p>
          </div>

          <div className="bg-slate-850 p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">{t.home.why3Title}</h3>
            <p className="text-slate-400 text-xs leading-relaxed">{t.home.why3Desc}</p>
          </div>
        </div>
      </section>
    </div>
  );
};
