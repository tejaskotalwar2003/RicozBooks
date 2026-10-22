import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  HelpCircle,
  KeyRound
} from 'lucide-react';
import { useInternalAuth } from '../../context/InternalAuthContext';

export const InternalLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useInternalAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // If already authenticated, redirect to internal dashboard
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/internal/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your work email.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/internal/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials or inactive account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (fillEmail: string, fillPass: string) => {
    setEmail(fillEmail);
    setPassword(fillPass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center space-x-3 group">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <span className="text-white font-black text-2xl tracking-tighter">R</span>
            </div>
            <div className="text-left">
              <span className="font-extrabold text-slate-950 text-xl tracking-tight block">RicozBooks</span>
              <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block">Internal Portal</span>
            </div>
          </Link>

          <h2 className="mt-6 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Demo Management Portal
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500">
            Restricted access for authorized sales and demo coordination team members.
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-8 bg-white py-8 px-6 sm:px-10 rounded-[20px] shadow-xl border border-slate-200/80">
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Work Email */}
            <div>
              <label htmlFor="internal-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Work Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="internal-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ricozbooks.com"
                  disabled={isLoading}
                  autoComplete="email"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl text-xs sm:text-sm bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 placeholder-slate-400 transition-all outline-hidden"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="internal-password" className="block text-xs font-semibold text-slate-700">
                  Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="internal-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs sm:text-sm bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 placeholder-slate-400 transition-all outline-hidden"
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

            {/* Sign In Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-slate-950 hover:bg-indigo-600 text-white font-semibold text-xs sm:text-sm shadow-md hover:shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in to portal…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick-Fill Demo Credentials Helper */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
              <span>Quick Test Credentials</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@ricozbooks.com', 'admin123')}
                className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200 text-left transition-colors cursor-pointer"
              >
                <span className="block font-bold text-slate-800 text-[11px]">Admin</span>
                <span className="block text-[10px] text-slate-500 truncate">admin@...</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('sales@ricozbooks.com', 'sales123')}
                className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-200 text-left transition-colors cursor-pointer"
              >
                <span className="block font-bold text-slate-800 text-[11px]">Sales Team</span>
                <span className="block text-[10px] text-slate-500 truncate">sales@...</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('coordinator@ricozbooks.com', 'coord123')}
                className="p-2 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200/80 hover:border-amber-200 text-left transition-colors cursor-pointer"
              >
                <span className="block font-bold text-slate-800 text-[11px]">Coordinator</span>
                <span className="block text-[10px] text-slate-500 truncate">coord@...</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer Notice */}
        <div className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Secured by RicozBooks Institutional Role-Based Access Control</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-[20px] max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Internal Credential Recovery</h3>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Internal demo management accounts are provisioned and managed by your organization's System Administrator (<code className="text-indigo-600">admin@ricozbooks.com</code>).
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
