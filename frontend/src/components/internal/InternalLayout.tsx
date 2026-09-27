import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Inbox, 
  CalendarCheck, 
  Calendar as CalendarIcon, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ChevronDown, 
  ExternalLink, 
  Bell, 
  CheckCircle2, 
  Sparkles,
  Shield,
  Layers
} from 'lucide-react';
import { useInternalAuth } from '../../context/InternalAuthContext';

export const InternalLayout: React.FC = () => {
  const { internalUser, logout } = useInternalAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/internal/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/internal/dashboard', icon: LayoutDashboard },
    { name: 'Demo Requests', path: '/internal/demos', icon: Inbox },
    { name: 'Scheduled Demos', path: '/internal/scheduled', icon: CalendarCheck },
    { name: 'Calendar', path: '/internal/calendar', icon: CalendarIcon },
    { name: 'Team', path: '/internal/team', icon: Users },
    { name: 'Settings', path: '/internal/settings', icon: Settings },
  ];

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'DEMO_ADMIN':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 uppercase">Admin</span>;
      case 'SALES_TEAM':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 uppercase">Sales</span>;
      case 'DEMO_COORDINATOR':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 uppercase">Coordinator</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">{role || 'Team'}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Mobile hamburger & Brand */}
          <div className="flex items-center space-x-3.5">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link to="/internal/dashboard" className="flex items-center space-x-3 group">
              <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <span className="text-white font-black text-lg tracking-tighter">R</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-slate-900 text-base tracking-tight leading-none">RicozBooks</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Internal</span>
                </div>
                <span className="text-[11px] font-medium text-indigo-600 leading-none mt-1">Demo Management</span>
              </div>
            </Link>
          </div>

          {/* Right: Public Site Link, User info & Dropdown */}
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              target="_blank"
              className="hidden md:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200/70 transition-all"
            >
              <span>Public Website</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors focus:outline-hidden"
              >
                <div className="w-8 h-8 rounded-full bg-linear-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {internalUser?.name ? internalUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 leading-none">{internalUser?.name || 'Internal User'}</span>
                  <span className="text-[10px] text-slate-500 mt-1 leading-none">{internalUser?.email || ''}</span>
                </div>
                {getRoleBadge(internalUser?.role)}
                <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
              </button>

              {isProfileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-200/80 py-2 z-50">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">{internalUser?.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{internalUser?.email}</p>
                      <div className="mt-1.5">{getRoleBadge(internalUser?.role)}</div>
                    </div>
                    <Link
                      to="/internal/team"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>Team Directory</span>
                    </Link>
                    <Link
                      to="/internal/settings"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Preferences</span>
                    </Link>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container with Sidebar + Page Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Demo Operations
            </div>
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/internal/dashboard' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            <div className="pt-4 mt-4 border-t border-slate-100">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <div className="flex items-center space-x-2 text-indigo-700">
                  <Shield className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Security</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                  Role: <span className="font-semibold text-slate-700">{internalUser?.role || 'Staff'}</span>
                </p>
                <div className="mt-2.5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Active Load:</span>
                  <span className="font-mono font-bold text-indigo-600">{internalUser?.assigned_count || 0} demos</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl p-5 flex flex-col justify-between z-50">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-white font-black text-base">R</div>
                    <span className="font-bold text-slate-900 text-sm">Demo Portal</span>
                  </div>
                  <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-4 space-y-1">
                  {navLinks.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path || (item.path !== '/internal/dashboard' && location.pathname.startsWith(item.path));
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-50 text-rose-600 font-semibold text-xs hover:bg-rose-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Route Content */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
