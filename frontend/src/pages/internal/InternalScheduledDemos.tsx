import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CalendarCheck, 
  Calendar, 
  Clock, 
  Video, 
  Copy, 
  Check, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  ExternalLink, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  CalendarRange, 
  AlertCircle,
  MoreVertical,
  ArrowRight
} from 'lucide-react';
import { 
  internalDemoApi, 
  DemoRequestItem 
} from '../../services/internalDemoApi';
import { InternalDemoDetailModal } from './InternalDemoDetailModal';

export const InternalScheduledDemos: React.FC = () => {
  const [demos, setDemos] = useState<DemoRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'upcoming'>('all');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Modal State
  const [selectedDemoId, setSelectedDemoId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchScheduled = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch both SCHEDULED and CONFIRMED
      const [resSched, resConf, resResched] = await Promise.all([
        internalDemoApi.listDemos({ status: 'SCHEDULED', limit: 100 }),
        internalDemoApi.listDemos({ status: 'CONFIRMED', limit: 100 }),
        internalDemoApi.listDemos({ status: 'RESCHEDULED', limit: 100 })
      ]);
      const combined = [...resSched.items, ...resConf.items, ...resResched.items];
      // Sort by confirmed_date ascending
      combined.sort((a, b) => {
        const dateA = a.confirmed_date || a.preferred_date || '9999-99-99';
        const dateB = b.confirmed_date || b.preferred_date || '9999-99-99';
        return dateA.localeCompare(dateB);
      });
      setDemos(combined);
    } catch (err: any) {
      console.error('Error fetching scheduled demos:', err);
      setError(err.message || 'Failed to load scheduled demos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduled();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredDemos = demos.filter((d) => {
    const dDate = d.confirmed_date || d.preferred_date || '';
    if (activeTab === 'today') {
      if (dDate !== todayStr) return false;
    } else if (activeTab === 'upcoming') {
      if (dDate < todayStr) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = d.full_name.toLowerCase().includes(q);
      const matchComp = d.company.toLowerCase().includes(q);
      const matchRef = d.reference_code.toLowerCase().includes(q);
      const matchStaff = (d.assigned_user_name || '').toLowerCase().includes(q);
      if (!matchName && !matchComp && !matchRef && !matchStaff) return false;
    }
    return true;
  });

  const handleCopyLink = (id: number, link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openDemoModal = (id: number) => {
    setSelectedDemoId(id);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/70">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
              Meetings
            </span>
            <span className="text-xs text-slate-400 font-mono">{demos.length} Active Sessions</span>
          </div>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Scheduled Demos
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            Confirmed calendar appointments, meeting links, and demo conductors.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/internal/calendar"
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 shadow-2xs transition-all"
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Calendar View</span>
          </Link>

          <button
            type="button"
            onClick={fetchScheduled}
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
          <button type="button" onClick={fetchScheduled} className="font-bold underline ml-3">
            Retry
          </button>
        </div>
      )}

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 p-1 bg-slate-200/60 rounded-xl max-w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Scheduled ({demos.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'today'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Today's Demos ({demos.filter(d => (d.confirmed_date || d.preferred_date) === todayStr).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'upcoming'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upcoming
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search scheduled..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden bg-white"
          />
        </div>
      </div>

      {/* Grid of Scheduled Demo Cards */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
          <span className="text-xs font-medium">Loading confirmed demos...</span>
        </div>
      ) : filteredDemos.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <CalendarCheck className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No scheduled demos found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Review incoming requests and assign a confirmed date and meeting link to see them here.
          </p>
          <Link
            to="/internal/demos"
            className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all"
          >
            <span>Go to Inquiries</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDemos.map((demo) => {
            const isToday = (demo.confirmed_date || demo.preferred_date) === todayStr;

            return (
              <div
                key={demo.id}
                className={`bg-white rounded-2xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between overflow-hidden ${
                  isToday ? 'border-emerald-300 ring-2 ring-emerald-500/10' : 'border-slate-200/80'
                }`}
              >
                {/* Top Status Header */}
                <div className="p-5 pb-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                      {demo.reference_code}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      demo.status === 'CONFIRMED' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                      demo.status === 'RESCHEDULED' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                      'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}>
                      {demo.status}
                    </span>
                  </div>

                  {/* Customer & Company Details */}
                  <div className="mt-3.5">
                    <h3 className="text-base font-bold text-slate-900">
                      {demo.full_name}
                    </h3>
                    <div className="text-xs text-slate-600 flex items-center space-x-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-800">{demo.company}</span>
                      <span>•</span>
                      <span>{demo.role}</span>
                    </div>

                    <div className="mt-2 space-y-1 text-[11px] text-slate-500">
                      <div className="flex items-center space-x-1.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{demo.work_email}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{demo.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Focus Topic */}
                  <div className="mt-3 p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Demo Focus</span>
                    <span className="font-semibold text-slate-800 line-clamp-1">{demo.interest_area}</span>
                  </div>

                  {/* Schedule Details Box */}
                  <div className="mt-3 p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-indigo-950 font-bold">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{demo.confirmed_date || demo.preferred_date}</span>
                      </div>
                      {isToday && (
                        <span className="px-2 py-0.2 rounded-full bg-emerald-600 text-white text-[9px] font-extrabold uppercase">
                          Today
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-indigo-700 text-[11px]">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{demo.confirmed_time || demo.preferred_time}</span>
                      </div>
                      <span>{demo.duration || '45 mins'}</span>
                    </div>
                  </div>

                  {/* Conductor / Staff */}
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                    <span className="text-slate-400">Assigned Staff:</span>
                    <span className="font-semibold text-slate-800">
                      {demo.assigned_user_name || 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="p-3 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-2">
                  {demo.meeting_link ? (
                    <div className="flex items-center space-x-1.5">
                      <a
                        href={demo.meeting_link.startsWith('http') ? demo.meeting_link : `https://${demo.meeting_link}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Join</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopyLink(demo.id, demo.meeting_link!)}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                        title="Copy meeting link"
                      >
                        {copiedId === demo.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-amber-600 italic">No meeting link</span>
                  )}

                  <button
                    type="button"
                    onClick={() => openDemoModal(demo.id)}
                    className="ml-auto px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Manage / Reschedule
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail & Action Modal */}
      <InternalDemoDetailModal
        demoId={selectedDemoId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedDemoId(null);
        }}
        onUpdated={() => {
          fetchScheduled();
        }}
      />
    </div>
  );
};
