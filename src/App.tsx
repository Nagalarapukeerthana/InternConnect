import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './context/LanguageContext.js';
import { AuthProvider } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { Footer } from './components/Footer.js';
import { FrenchOtpModal } from './components/FrenchOtpModal.js';
import { MustChangePasswordModal } from './components/MustChangePasswordModal.js';

// 12 Application Pages
import { Home } from './pages/Home.js';
import { BrowseInternships } from './pages/BrowseInternships.js';
import { InternshipDetails } from './pages/InternshipDetails.js';
import { AuthPage } from './pages/AuthPage.js';
import { StudentProfile } from './pages/StudentProfile.js';
import { ResumeBuilder } from './pages/ResumeBuilder.js';
import { PublicSpace } from './pages/PublicSpace.js';
import { LoginHistory } from './pages/LoginHistory.js';
import { Subscriptions } from './pages/Subscriptions.js';
import { ForgotPassword } from './pages/ForgotPassword.js';
import { AccountSettings } from './pages/AccountSettings.js';
import { LegalPage } from './pages/LegalPage.js';
import { Clock, Shield } from 'lucide-react';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home');
  const [navParams, setNavParams] = useState<any>({});
  const [istHeaderTime, setIstHeaderTime] = useState('');

  // Fetch health and current IST time periodically for transparency
  useEffect(() => {
    const updateTime = () => {
      fetch('/api/health')
        .then((res) => res.json())
        .then((data) => {
          if (data.ist?.formatted) {
            setIstHeaderTime(data.ist.formatted);
          }
        })
        .catch(() => {});
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigate = (page: string, params?: any) => {
    setCurrentPage(page);
    if (params) setNavParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigate={handleNavigate} />;
      case 'internships':
        return <BrowseInternships onNavigate={handleNavigate} />;
      case 'internship-details':
        return (
          <InternshipDetails
            internshipId={navParams.id || 'int-1'}
            onNavigate={handleNavigate}
          />
        );
      case 'auth':
        return <AuthPage onNavigate={handleNavigate} />;
      case 'profile':
        return <StudentProfile onNavigate={handleNavigate} />;
      case 'resume':
        return <ResumeBuilder onNavigate={handleNavigate} />;
      case 'community':
        return <PublicSpace onNavigate={handleNavigate} />;
      case 'security':
        return <LoginHistory onNavigate={handleNavigate} />;
      case 'subscriptions':
        return <Subscriptions onNavigate={handleNavigate} />;
      case 'forgot-password':
        return <ForgotPassword onNavigate={handleNavigate} />;
      case 'settings':
        return <AccountSettings />;
      case 'legal':
        return <LegalPage />;
      default:
        return <Home onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-teal-500 selection:text-slate-950 font-sans">
      {/* Top Governance Strip */}
      <div className="bg-slate-950 text-slate-300 py-1.5 px-4 text-[11px] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span className="font-semibold text-white">InternConnect</span>
          <span className="text-slate-400">• ElevanceSkills Full Stack Track</span>
        </div>

        <div className="flex items-center gap-4 text-slate-400 text-[10px]">
          {istHeaderTime && (
            <span className="flex items-center gap-1 font-mono text-teal-300">
              <Clock className="w-3 h-3 text-teal-400" />
              <span>IST: {istHeaderTime}</span>
            </span>
          )}
          <span className="hidden sm:inline-flex items-center gap-1 text-slate-300">
            <Shield className="w-3 h-3 text-teal-400" />
            <span>Zero-Trust ABAC Active</span>
          </span>
        </div>
      </div>

      {/* Top Navigation */}
      <Navbar currentPage={currentPage} onNavigate={handleNavigate} />

      {/* Main Page Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderPage()}
      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Global Security Modals */}
      <FrenchOtpModal />
      <MustChangePasswordModal />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
