import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  ShieldCheck, 
  Mail, 
  CheckCircle2, 
  CalendarCheck, 
  ArrowRight, 
  RefreshCw, 
  UserCheck, 
  AlertCircle,
  Briefcase
} from 'lucide-react';
import { internalDemoApi, InternalUser } from '../../services/internalDemoApi';

export const InternalTeam: React.FC = () => {
  const [team, setTeam] = useState<InternalUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeam = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await internalDemoApi.getTeam();
      setTeam(data);
    } catch (err: any) {
      console.error('Failed to load team:', err);
      setError(err.message || 'Failed to load team members');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'DEMO_ADMIN':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
            Admin
          </span>
        );
      case 'SALES_TEAM':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
            Sales Lead
          </span>
        );
      case 'DEMO_COORDINATOR':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
            Coordinator
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 uppercase">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/70">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
              Directory
            </span>
            <span className="text-xs text-slate-400 font-mono">{team.length} Members</span>
          </div>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Demo Coordination Team
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            Internal representatives authorized to schedule, conduct, and manage customer demos.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={fetchTeam}
            disabled={isLoading}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={fetchTeam} className="font-bold underline ml-3">
            Retry
          </button>
        </div>
      )}

      {/* Team Cards Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
          <span className="text-xs font-medium">Loading team members...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {team.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white font-bold text-lg flex items-center justify-center shadow-xs">
                    {member.name.charAt(0)}
                  </div>
                  {getRoleBadge(member.role)}
                </div>

                <div className="mt-4">
                  <h3 className="text-base font-bold text-slate-900">{member.name}</h3>
                  <div className="text-xs text-slate-500 flex items-center space-x-1.5 mt-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{member.email}</span>
                  </div>
                </div>

                <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Assigned Inquiries:</span>
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {member.assigned_count ?? 0} Active
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="inline-flex items-center space-x-1 text-xs text-emerald-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Available for Demos</span>
                </span>

                <Link
                  to={`/internal/demos`}
                  className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <span>View Demos</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
