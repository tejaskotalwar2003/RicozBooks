import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Inbox, 
  CalendarCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  Calendar as CalendarIcon, 
  ArrowRight, 
  ExternalLink, 
  RefreshCw, 
  Search, 
  Filter, 
  Video,
  ChevronRight,
  ShieldCheck,
  Building2,
  Sparkles
} from 'lucide-react';
import { 
  internalDemoApi, 
  DashboardStats, 
  DemoRequestItem 
} from '../../services/internalDemoApi';
import { InternalDemoDetailModal } from './InternalDemoDetailModal';

export const InternalDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDemos, setRecentDemos] = useState<DemoRequestItem[]>([]);
  const [upcomingDemos, setUpcomingDemos] = useState<DemoRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal state
  const [selectedDemoId, setSelectedDemoId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsData, recentData, upcomingData] = await Promise.all([
        internalDemoApi.getStats(),
        internalDemoApi.getRecentDemos(),
        internalDemoApi.getUpcomingDemos()
      ]);
      setStats(statsData);
      setRecentDemos(recentData);
      setUpcomingDemos(upcomingData);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const openDemoModal = (id: number) => {
    setSelectedDemoId(id);
    setIsDetailModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1.5 animate-pulse" />
            NEW
          </span>
        );
      case 'UNDER REVIEW':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            UNDER REVIEW
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            SCHEDULED
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            CONFIRMED
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            COMPLETED
          </span>
        );
      case 'RESCHEDULED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            RESCHEDULED
          </span>
        );
      case 'CANCELLED':
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/70">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
              Internal Portal
            </span>
            <span className="text-xs text-slate-400 font-mono">Live MongoDB Atlas Store</span>
          </div>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Demo Management Dashboard
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            Real-time pipeline of incoming enterprise and SME demo bookings.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={isLoading}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/internal/demos"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all"
          >
            <span>View All Requests</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadDashboardData}
            className="font-bold underline ml-3 hover:text-rose-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* 6 Key Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: New Requests */}
        <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-2xs hover:shadow-xs transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">New Requests</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {stats?.new_requests ?? (isLoading ? '…' : 0)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-blue-600 font-medium">Awaiting initial review</p>
        </div>

        {/* Card 2: Pending Requests */}
        <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-2xs hover:shadow-xs transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Review</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {stats?.pending_requests ?? (isLoading ? '…' : 0)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-amber-600 font-medium">Under active review</p>
        </div>

        {/* Card 3: Scheduled Demos */}
        <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-2xs hover:shadow-xs transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Scheduled</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {stats?.scheduled_demos ?? (isLoading ? '…' : 0)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-indigo-600 font-medium">Confirmed slots</p>
        </div>

        {/* Card 4: Today's Demos */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs hover:shadow-xs transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Today's Demos</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {stats?.today_demos ?? (isLoading ? '…' : 0)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-600 font-medium">Happening today</p>
        </div>

        {/* Card 5: Completed Demos */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-700" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Completed</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {stats?.completed_demos ?? (isLoading ? '…' : 0)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Successfully conducted</p>
        </div>

        {/* Card 6: Cancelled Demos */}
        <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-2xs hover:shadow-xs transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-400" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Cancelled</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {stats?.cancelled_demos ?? (isLoading ? '…' : 0)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-rose-500 font-medium">Cancelled / Rejected</p>
        </div>
      </div>

      {/* Analytics & Pipeline Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend: Demo requests over time */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Demo Inquiries (Last 7 Days)</h3>
                  <p className="text-[11px] text-slate-500">Daily inflow of high-intent enterprise prospects</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                Total: {stats?.total_requests || 0}
              </span>
            </div>

            {/* Visual Bar representation */}
            <div className="mt-6">
              <div className="h-40 flex items-end justify-between gap-2 sm:gap-4 pt-4 px-2">
                {stats?.requests_over_time?.map((item, idx) => {
                  const maxVal = Math.max(...(stats.requests_over_time.map(x => x.count) || [1]), 1);
                  const heightPercent = Math.max((item.count / maxVal) * 100, 10);
                  const isToday = idx === stats.requests_over_time.length - 1;

                  return (
                    <div key={item.date} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="text-[11px] font-mono font-bold text-slate-700 opacity-80 group-hover:opacity-100 group-hover:text-indigo-600 transition-colors">
                        {item.count}
                      </div>
                      <div className="w-full max-w-[40px] bg-slate-100 rounded-t-lg h-28 flex items-end p-0.5">
                        <div 
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-md transition-all duration-500 ${
                            isToday 
                              ? 'bg-linear-to-t from-indigo-600 to-indigo-500 shadow-xs' 
                              : 'bg-linear-to-t from-slate-400 to-slate-300 group-hover:from-indigo-400 group-hover:to-indigo-300'
                          }`}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap">
                        {item.date.split('-').slice(1).join('/')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />
              <span>Current Inflow</span>
            </span>
            <span>Data synced with production DB</span>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Status Distribution</h3>
                <p className="text-[11px] text-slate-500">Breakdown across the pipeline lifecycle</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {stats?.status_distribution ? (
                Object.entries(stats.status_distribution).map(([statusName, count]) => {
                  const total = stats.total_requests || 1;
                  const pct = Math.round((count / total) * 100);

                  return (
                    <div key={statusName} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700">{statusName}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-500">{count}</span>
                          <span className="text-slate-400 font-mono text-[11px]">({pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className={`h-full rounded-full ${
                            statusName === 'NEW' ? 'bg-blue-500' :
                            statusName === 'SCHEDULED' ? 'bg-indigo-600' :
                            statusName === 'CONFIRMED' ? 'bg-purple-600' :
                            statusName === 'COMPLETED' ? 'bg-emerald-500' :
                            statusName === 'UNDER REVIEW' ? 'bg-amber-500' : 'bg-slate-400'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">Loading distribution…</p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link
              to="/internal/demos"
              className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-bold text-center block transition-colors"
            >
              Filter Demos by Status →
            </Link>
          </div>
        </div>
      </div>

      {/* Two Column Section: Upcoming Demos & Recent Inquiries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Upcoming Scheduled Demos */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Upcoming Confirmed Demos</h3>
                  <p className="text-[11px] text-slate-500">Next scheduled meetings with prospective clients</p>
                </div>
              </div>

              <Link
                to="/internal/scheduled"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                View All
              </Link>
            </div>

            {upcomingDemos.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <CalendarIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                No upcoming demos scheduled at this moment.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {upcomingDemos.map((demo) => (
                  <div
                    key={demo.id}
                    onClick={() => openDemoModal(demo.id)}
                    className="p-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-indigo-600">
                          {demo.reference_code}
                        </span>
                        {getStatusBadge(demo.status)}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {demo.full_name}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center space-x-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{demo.company}</span>
                        <span>•</span>
                        <span>{demo.entities_count} {demo.entities_count === '1' ? 'Entity' : 'Entities'}</span>
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center text-xs">
                      <div className="font-bold text-slate-800">
                        {demo.confirmed_date || demo.preferred_date || 'Date TBD'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {demo.confirmed_time || demo.preferred_time || 'Time TBD'}
                      </div>
                      {demo.meeting_link && (
                        <span className="mt-1 inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          <Video className="w-3 h-3" />
                          <span>Link Ready</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50/70 border-t border-slate-100 text-center">
            <Link
              to="/internal/calendar"
              className="text-xs font-semibold text-slate-600 hover:text-indigo-600 inline-flex items-center space-x-1.5"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Open Interactive Calendar Schedule</span>
            </Link>
          </div>
        </div>

        {/* Section 2: Recent Incoming Requests */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Inbox className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Recent Demo Requests</h3>
                  <p className="text-[11px] text-slate-500">Latest submissions from the public website</p>
                </div>
              </div>

              <Link
                to="/internal/demos"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                View All ({stats?.total_requests || 0})
              </Link>
            </div>

            {recentDemos.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Inbox className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                No requests found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentDemos.map((demo) => (
                  <div
                    key={demo.id}
                    onClick={() => openDemoModal(demo.id)}
                    className="p-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-indigo-600">
                          {demo.reference_code}
                        </span>
                        {getStatusBadge(demo.status)}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {demo.full_name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {demo.company} • <span className="font-medium text-slate-700">{demo.role}</span>
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium max-w-[150px] truncate">
                        {demo.interest_area}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1">
                        Assigned: {demo.assigned_user_name || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50/70 border-t border-slate-100 text-center">
            <Link
              to="/internal/demos"
              className="text-xs font-semibold text-slate-600 hover:text-indigo-600 inline-flex items-center space-x-1.5"
            >
              <span>Manage all inquiries in Data Grid</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Detail & Action Modal */}
      <InternalDemoDetailModal
        demoId={selectedDemoId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedDemoId(null);
        }}
        onUpdated={() => {
          loadDashboardData();
        }}
      />
    </div>
  );
};
