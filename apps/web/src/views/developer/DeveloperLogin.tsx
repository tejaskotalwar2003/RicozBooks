import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Terminal, Shield, Lock, Mail, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';

export const DeveloperLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your work email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.developerLogin({
        email: email.trim().toLowerCase(),
        password,
      });

      await setSession(res.access_token, res.user, res.refresh_token);

      const target = (location.state as any)?.from?.pathname || '/developer/dashboard';
      navigate(target, { replace: true });
    } catch (err: any) {
      console.error('Developer login failed:', err);
      let msg = err.message || 'Authentication failed. Please verify your credentials.';
      if (msg.includes('403') || msg.toLowerCase().includes('restricted') || msg.toLowerCase().includes('privileges')) {
        msg = 'Access denied: This account is not an authorized Platform Developer or Super Admin.';
      } else if (msg.includes('401') || msg.toLowerCase().includes('incorrect')) {
        msg = 'Invalid credentials. Please verify your email and password.';
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-[#C58B3E]/30">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#781019] to-[#3B0006] border border-[#C58B3E]/40 flex items-center justify-center">
            <Terminal className="w-4 h-4 text-[#E6B676]" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-white">RicozBooks</span>
            <span className="text-[10px] text-slate-400 block -mt-0.5">Developer Platform</span>
          </div>
        </div>

        <Link
          to="/login"
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Tenant Workspace Login</span>
        </Link>
      </header>

      {/* Main Login Card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#781019] to-[#260002] border border-[#C58B3E]/40 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-[#3B0006]/30">
                <Shield className="w-7 h-7 text-[#E6B676]" />
              </div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-[#E6B676] border border-amber-500/30 mb-2">
                Restricted Console
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Developer / Super Admin
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Centralized access management & RBAC administration
              </p>
            </div>

            {/* Error Message Box */}
            {errorMessage && (
              <div className="mb-6 p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 flex items-start gap-3 text-red-300 text-xs leading-relaxed animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Administrator Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@ricozbooks.com"
                    required
                    className="w-full h-10 pl-10 pr-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/60 focus:border-amber-500/60 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full h-10 pl-10 pr-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/60 focus:border-amber-500/60 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 mt-2 bg-gradient-to-r from-[#781019] to-[#3B0006] hover:from-[#8E141F] hover:to-[#4A0008] border border-[#C58B3E]/40 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#3B0006]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Developer Console</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#E6B676]" />
                  </>
                )}
              </button>
            </form>

            {/* Security Notice */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Unauthorized access attempts are monitored and recorded in platform audit logs with timestamp, IP address, and client fingerprinting.
              </p>
            </div>
          </div>

          {/* Portal Switcher Navigation */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-xs text-slate-500">Looking for a different portal?</p>
            <div className="flex items-center justify-center gap-4 text-xs">
              <Link to="/login" className="text-slate-400 hover:text-[#E6B676] transition-colors">
                Tenant Portal
              </Link>
              <span className="text-slate-700">•</span>
              <Link to="/internal/login" className="text-slate-400 hover:text-[#E6B676] transition-colors">
                Demo Management Portal
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-900 text-center text-xs text-slate-500">
        RicozBooks Enterprise Platform &bull; Security & Access Architecture Phase 1
      </footer>
    </div>
  );
};

