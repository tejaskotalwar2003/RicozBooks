import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useInternalAuth } from '../../context/InternalAuthContext';
import { Loader2 } from 'lucide-react';

export const InternalProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useInternalAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verifying Internal Session…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/internal/login" replace />;
  }

  return <Outlet />;
};
