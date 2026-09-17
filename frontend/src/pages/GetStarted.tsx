import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Lock, 
  UserCheck,
  Scale
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const GetStarted: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleQuickDemoLaunch = async (email: string, pass: string) => {
    try {
      await login(email, pass);
      navigate('/dashboard');
    } catch (err) {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-[#E6B676]/30 selection:text-[#260002]">
      
      {/* Header */}
      <header className="bg-[#260002] border-b border-[#390003] py-4 px-6 text-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <img src="/logo.jpg" alt="RicozBooks" className="w-9 h-9 rounded-xl object-cover" />
            <span className="text-xl font-black text-white">Ricoz<span className="text-[#E6B676]">Books</span></span>
          </Link>
          <Link to="/login" className="text-xs font-bold text-[#EEC68B] hover:text-white transition-colors">
            Already have an account? Sign In →
          </Link>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-8 flex-1">
        
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#260002] text-[#EEC68B] border border-[#C58B3E]/30">
            <Sparkles className="w-3.5 h-3.5 text-[#E6B676]" />
            <span>Enterprise Workspace Setup</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Choose Your Access Mode
          </h1>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            Experience RicozBooks immediately with pre-configured multi-entity accounting environments, or sign in with your enterprise credentials.
          </p>
        </div>

        {/* 3 Interactive Persona Launch Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          
          {/* Card 1: Admin / CFO */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 hover:border-[#781019] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#260002] text-[#E6B676] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Admin / CFO Persona</h3>
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#781019]">
                  Full Enterprise Access
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Full authority over multi-entity configuration, general ledgers, posting journals, and audit compliance.
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5 pt-1">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Post & Reverse Journals</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Manage All 3 Entities</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleQuickDemoLaunch('admin@ricozbooks.com', 'admin123')}
              className="w-full py-2.5 bg-[#260002] hover:bg-[#390003] text-[#E6B676] text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1.5"
            >
              <span>Launch as Admin</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: Accountant */}
          <div className="bg-white rounded-2xl border-2 border-[#781019] p-6 shadow-md flex flex-col justify-between space-y-5 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-[#781019] text-white uppercase tracking-wider shadow-sm">
              Operational Focus
            </div>

            <div className="space-y-3 pt-1">
              <div className="w-10 h-10 rounded-xl bg-[#260002] text-[#E6B676] flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Accountant Persona</h3>
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#781019]">
                  Bookkeeping & Entry
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Create Chart of Accounts, draft multi-line journals, and submit balanced vouchers for review.
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5 pt-1">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Draft & Submit Journals</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Manage Chart of Accounts</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleQuickDemoLaunch('accountant@ricozbooks.com', 'accountant123')}
              className="w-full py-2.5 bg-[#781019] hover:bg-[#8F131E] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1.5"
            >
              <span>Launch as Accountant</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: Reviewer */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 hover:border-[#781019] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#260002] text-[#E6B676] flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reviewer Persona</h3>
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#781019]">
                  Supervisory Approvals
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dedicated maker-checker verification queue to inspect journal lines, approve vouchers, or reject with reason.
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5 pt-1">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Approvals Review Queue</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Supervisory Sign-off</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleQuickDemoLaunch('reviewer@ricozbooks.com', 'reviewer123')}
              className="w-full py-2.5 bg-[#260002] hover:bg-[#390003] text-[#E6B676] text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1.5"
            >
              <span>Launch as Reviewer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* Traditional Login Link */}
        <div className="text-center pt-4">
          <p className="text-xs text-slate-500">
            Have custom corporate login credentials?{' '}
            <Link to="/login" className="font-bold text-[#781019] hover:underline">
              Sign in via corporate authentication
            </Link>
          </p>
        </div>

      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-200">
        © 2026 RicozBooks by ricoz • Accurate Books. Stronger Decisions.
      </footer>

    </div>
  );
};
