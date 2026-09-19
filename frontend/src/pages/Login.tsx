import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Shield, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      
      {/* LEFT COLUMN: BRAND HERO (IMPERIAL BURGUNDY) */}
      <div className="w-full md:w-5/12 bg-[#0B0F17] text-white p-8 md:p-12 flex flex-col justify-between border-r border-slate-800 relative overflow-hidden">
        
        {/* Subtle background glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#E6B676]/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#781019]/20 blur-3xl pointer-events-none"></div>

        {/* Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center space-x-3">
            <img 
              src="/logo.jpg" 
              alt="RicozBooks Logo" 
              className="w-16 h-16 rounded-xl object-cover shadow-lg border border-slate-700/60" 
            />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                Ricoz<span className="text-[#E6B676]">Books</span>
              </h1>
              <div className="text-[11px] uppercase tracking-widest text-[#EEC68B] font-semibold">
                by ricoz
              </div>
            </div>
          </div>

          <div className="mt-12 space-y-4">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-900/90 text-[#EEC68B] border border-[#C58B3E]/30">
              Enterprise Finance & Accounting SaaS
            </div>
            
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Accurate Books.<br />
              <span className="text-[#E6B676]">Stronger Decisions.</span>
            </h2>

            <p className="text-slate-300 text-sm leading-relaxed max-w-md pt-2">
              Next-generation double-entry accounting platform designed for high-growth enterprises. Seamlessly manage multi-entity general ledgers, journal approvals, statutory GST compliance, and automated period-end close.
            </p>
          </div>

          {/* Feature List */}
          <div className="mt-8 space-y-3 text-xs text-slate-200">
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#E6B676]" />
              <span>Multi-Entity Consolidation (INR, USD, GBP)</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#E6B676]" />
              <span>Strict Double-Entry Enforcement (Debit = Credit)</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#E6B676]" />
              <span>Maker-Checker Journal Approval Workflow</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#E6B676]" />
              <span>Tamper-Evident Immutable Audit Trail</span>
            </div>
          </div>
        </div>

        {/* Left Footer: Trust & Security Badges */}
        <div className="relative z-10 pt-8 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-[#E6B676]" />
            <span>Bank-Grade 256-bit Encryption</span>
          </div>
          <span>v1.0.0 Enterprise</span>
        </div>

      </div>

      {/* RIGHT COLUMN: ENTERPRISE LOGIN FORM */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-slate-200 shadow-xl space-y-6">
          
          <div>
            <h3 className="text-xl font-bold text-slate-900">Sign in to your account</h3>
            <p className="text-xs text-slate-500 mt-1">
              Enter your enterprise credentials to access your financial workspace.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center space-x-2">
              <span className="font-bold">Error:</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Corporate Email Address
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#781019] focus:border-[#781019] text-slate-900 bg-white"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert("Contact your system administrator to reset password."); }} className="text-[11px] font-semibold text-[#781019] hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#781019] focus:border-[#781019] text-slate-900 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-[#781019] focus:ring-[#781019]"
                />
                <span>Remember this device for 30 days</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-[#781019] hover:bg-[#600C13] text-white text-xs font-bold rounded-lg shadow-md border border-[#781019] flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to RicozBooks</span>
                  <ArrowRight className="w-4 h-4 text-[#E6B676]" />
                </>
              )}
            </button>
          </form>

          {/* QUICK DEMO CREDENTIALS SELECTOR */}
          <div className="pt-4 border-t border-slate-200">
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
              1-Click Demo Login Roles:
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@ricozbooks.com', 'admin123')}
                className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-[#781019]/40 cursor-pointer rounded-lg text-left transition-all"
              >
                <div className="text-[11px] font-bold text-[#781019]">Admin (CFO)</div>
                <div className="text-[9px] text-slate-500">Full Access</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('accountant@ricozbooks.com', 'accountant123')}
                className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-[#781019]/40 cursor-pointer rounded-lg text-left transition-all"
              >
                <div className="text-[11px] font-bold text-[#781019]">Accountant</div>
                <div className="text-[9px] text-slate-500">Create & Submit</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('reviewer@ricozbooks.com', 'reviewer123')}
                className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-[#781019]/40 cursor-pointer rounded-lg text-left transition-all"
              >
                <div className="text-[11px] font-bold text-[#781019]">Reviewer</div>
                <div className="text-[9px] text-slate-500">Approve & Post</div>
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

