import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Building2, 
  Users, 
  KeyRound, 
  Mail, 
  History, 
  ArrowUpRight, 
  LogOut,
  Terminal,
  Activity
} from 'lucide-react';

export const DeveloperLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/developer/login');
  };

  const navItems = [
    {
      to: '/developer/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: 'Active'
    },
    {
      to: '/developer/departments',
      label: 'Departments',
      icon: Building2,
      badge: 'Active'
    },
    {
      to: '/developer/users',
      label: 'Users & Access',
      icon: Users,
      badge: 'Active'
    },
    {
      to: '/developer/roles',
      label: 'Roles & Permissions',
      icon: KeyRound,
      badge: 'Active'
    },
    {
      to: '/developer/invitations',
      label: 'Invitations',
      icon: Mail,
      badge: 'Active'
    },
    {
      to: '/developer/audit-logs',
      label: 'Audit Trail',
      icon: History,
      badge: 'Active'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Platform Top Navigation Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#781019] to-[#3B0006] border border-[#C58B3E]/40 flex items-center justify-center shadow-lg shadow-[#3B0006]/30">
            <Terminal className="w-5 h-5 text-[#E6B676]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">RicozBooks</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-[#E6B676] border border-amber-500/30">
                Developer Console
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Platform RBAC & Central Access Control</p>
          </div>
        </div>

        {/* Super Admin Status & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div className="text-left text-xs">
              <span className="font-medium text-slate-200">
                {user ? `${user.first_name} ${user.last_name}`.trim() || user.email : 'Super Admin'}
              </span>
              <span className="block text-[10px] text-emerald-400 font-semibold tracking-wide">SUPER ADMIN (ENFORCED)</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            title="Open customer accounting workspace"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
          >
            <span>Tenant Workspace</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={handleLogout}
            title="Sign out of Developer Console"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-950/40 hover:bg-red-950/70 text-red-300 hover:text-red-200 transition-colors border border-red-800/50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between hidden md:flex shrink-0">
          <div>
            <div className="px-3 pb-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800/80">
              Platform Administration
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-[#781019] to-[#3B0006] text-white shadow-md shadow-[#3B0006]/40 font-semibold border border-[#C58B3E]/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                        item.badge === 'Active'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Operational Status Footer */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2 mb-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-300">Security Enforced</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Centralized platform RBAC with strict portal isolation and audit trail.
            </p>
          </div>
        </aside>

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
