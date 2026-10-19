import React from 'react';
import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';

export const DeveloperProtectedRoute: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Verifying Developer Console authorization...</p>
      </div>
    );
  }

  // Not authenticated at all -> redirect to developer login
  if (!user) {
    return <Navigate to="/developer/login" state={{ from: location }} replace />;
  }

  // Authenticated, but not a Super Admin -> Access Denied guard
  if (!user.is_superuser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-red-900/50 rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-950/70 border border-red-800/80 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-red-950/60 text-red-300 border border-red-800/60 mb-3">
            Access Restricted
          </span>

          <h1 className="text-xl font-bold text-white mb-2">
            Super Admin Privileges Required
          </h1>

          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            You are signed in as <span className="font-medium text-slate-200">{user.email}</span>, which does not possess Platform Developer or Super Admin authorization. The Developer Console manages cross-cutting platform access and is restricted to verified administrators.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Tenant Workspace</span>
            </Link>

            <button
              onClick={() => {
                logout();
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-sm font-medium transition-colors border border-amber-500/40"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Super Admin Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

