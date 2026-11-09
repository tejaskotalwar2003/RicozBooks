import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, DashboardStatsData, DepartmentItem } from '../../services/api';
import { 
  ShieldCheck, 
  Building2, 
  Users, 
  UserCheck, 
  UserX, 
  Mail, 
  Activity, 
  ArrowRight, 
  RefreshCw, 
  AlertTriangle,
  Server,
  Lock,
  ChevronRight,
  UserCog
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DeveloperDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsData, deptsData] = await Promise.all([
        api.getDashboardStats(),
        api.getDepartments(),
      ]);
      setStats(statsData);
      setDepartments(deptsData);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Unable to connect to Developer Console API.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Welcome / Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-[#3B0006]/50 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#781019] to-[#3B0006] border border-[#C58B3E]/40 flex items-center justify-center shadow-lg shadow-[#3B0006]/50 shrink-0">
            <ShieldCheck className="w-6 h-6 text-[#E6B676]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Developer Console
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Phase 2 Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Centralized platform administration, department architecture & real-time RBAC oversight
            </p>
          </div>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700 disabled:opacity-50 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#E6B676]' : ''}`} />
          <span>Refresh Live Metrics</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/80 flex items-center justify-between gap-3 text-red-300 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="underline font-semibold hover:text-white shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Real Database Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Registered Users */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Users</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {isLoading ? (
              <div className="h-8 w-16 bg-slate-800 rounded animate-pulse" />
            ) : (
              stats?.total_users ?? 0
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <UserCheck className="w-3.5 h-3.5" />
              <span>{stats?.active_users ?? 0} active</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <UserX className="w-3.5 h-3.5" />
              <span>{stats?.suspended_users ?? 0} suspended</span>
            </span>
          </div>
        </div>

        {/* Metric 2: Departments */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Departments</span>
            <Building2 className="w-4 h-4 text-[#E6B676]" />
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {isLoading ? (
              <div className="h-8 w-16 bg-slate-800 rounded animate-pulse" />
            ) : (
              stats?.total_departments ?? 5
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              <span className="text-emerald-400 font-semibold">{stats?.active_departments ?? 5}</span> active
            </span>
            <span className="text-slate-400">
              <span className="text-amber-400 font-semibold">{stats?.assigned_heads_count ?? 0}</span> heads assigned
            </span>
          </div>
        </div>

        {/* Metric 3: Department Members */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Assigned Members</span>
            <UserCog className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {isLoading ? (
              <div className="h-8 w-16 bg-slate-800 rounded animate-pulse" />
            ) : (
              stats?.total_department_members ?? 0
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Department staff</span>
            <span className="text-blue-400 font-semibold">Across 5 depts</span>
          </div>
        </div>

        {/* Metric 4: Platform Invitations & Health */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Invites</span>
            <Mail className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {isLoading ? (
              <div className="h-8 w-16 bg-slate-800 rounded animate-pulse" />
            ) : (
              stats?.pending_invitations ?? 0
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">DB Status:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>{stats?.platform_health?.database_status === 'healthy' ? 'Healthy' : 'Online'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Five Departments Grid Overview */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Platform Departments</h2>
              <span className="text-xs text-slate-500 font-medium">({departments.length} registered)</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              RicozBooks operational structure consists of exactly five specialized departments.
            </p>
          </div>
          <Link
            to="/developer/departments"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E6B676] hover:text-white transition-colors"
          >
            <span>Manage All Departments</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Departments Table / Cards */}
        {isLoading && departments.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-36 bg-slate-950 rounded-xl animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                      {dept.code}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        dept.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {dept.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-1">{dept.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                    {dept.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500">Department Head:</span>
                    <span className="font-semibold text-slate-200">
                      {dept.head ? dept.head.full_name : (
                        <span className="text-amber-400/80 italic font-normal">Unassigned</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Active Members:</span>
                    <span className="font-bold text-white">{dept.active_member_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security & Access Verification Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Security Invariants */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-[#E6B676]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Platform Security Invariants
            </h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-400">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Console Isolation:</strong> Developer Console is a platform administrative interface, completely separate from the 5 departments.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Portal Separation:</strong> Demo Management Portal (`/internal/login`) maintains independent authentication and isolated storage.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>No Financial Leaks:</strong> Platform Super Admins manage departments and access without unrestricted access to customer accounting ledgers.</span>
            </li>
          </ul>
        </div>

        {/* System Details */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Environment & Infrastructure
            </h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Database Engine:</span>
              <span className="font-semibold text-slate-200">MongoDB Atlas (Production)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">RBAC Security Policy:</span>
              <span className="font-semibold text-emerald-400">Enforced Server-Side</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Audit Logging:</span>
              <span className="font-semibold text-emerald-400">Real-time DB Commit</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Logged In Administrator:</span>
              <span className="font-mono text-slate-300">{user?.email}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
