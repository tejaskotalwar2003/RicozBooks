import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  Building2, 
  User, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { 
  internalDemoApi, 
  DemoRequestItem, 
  InternalUser 
} from '../../services/internalDemoApi';
import { InternalDemoDetailModal } from './InternalDemoDetailModal';

export const InternalCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [demos, setDemos] = useState<DemoRequestItem[]>([]);
  const [team, setTeam] = useState<InternalUser[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Day for sidebar agenda
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Modal State
  const [selectedDemoId, setSelectedDemoId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchCalendarData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [resList, teamList] = await Promise.all([
        internalDemoApi.listDemos({ limit: 200 }),
        internalDemoApi.getTeam()
      ]);
      setDemos(resList.items);
      setTeam(teamList);
    } catch (err: any) {
      console.error('Failed to load calendar data:', err);
      setError(err.message || 'Failed to load calendar data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  // Filter demos by staff if selected
  const filteredDemos = demos.filter((d) => {
    if (selectedStaff && d.assigned_to !== selectedStaff) return false;
    return true;
  });

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(now.toISOString().split('T')[0]);
  };

  // Group demos by date (either confirmed_date or preferred_date)
  const demosByDate: Record<string, DemoRequestItem[]> = {};
  filteredDemos.forEach((d) => {
    const dStr = d.confirmed_date || d.preferred_date;
    if (dStr) {
      if (!demosByDate[dStr]) demosByDate[dStr] = [];
      demosByDate[dStr].push(d);
    }
  });

  // Selected day demos
  const selectedDayDemos = demosByDate[selectedDateStr] || [];

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
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wider">
              Schedule
            </span>
            <span className="text-xs text-slate-400 font-mono">Interactive Booking Calendar</span>
          </div>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Demo Calendar
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            View demo pipeline distribution, scheduled meetings, and staff allocation.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Staff Filter */}
          <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedStaff !== undefined ? String(selectedStaff) : 'ALL'}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedStaff(val === 'ALL' ? undefined : Number(val));
              }}
              className="text-xs text-slate-700 bg-transparent outline-hidden font-medium cursor-pointer"
            >
              <option value="ALL">All Team Members</option>
              {team.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={fetchCalendarData}
            disabled={isLoading}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
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
          <button type="button" onClick={fetchCalendarData} className="font-bold underline ml-3">
            Retry
          </button>
        </div>
      )}

      {/* Main Calendar + Day Agenda Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Calendar Grid (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5">
          {/* Calendar Month Navigation Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-900">
                {monthNames[month]} {year}
              </h2>
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                Today
              </button>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 text-center font-bold text-[11px] text-slate-400 py-3 uppercase tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Prev month placeholder days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => {
              const dayNum = daysInPrevMonth - firstDayIndex + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="min-h-[70px] sm:min-h-[85px] p-1.5 rounded-xl bg-slate-50/50 border border-slate-100/50 text-slate-300 text-xs flex flex-col justify-between"
                >
                  <span className="font-medium text-[11px]">{dayNum}</span>
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayDemos = demosByDate[dateStr] || [];
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              const isSelected = dateStr === selectedDateStr;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`min-h-[70px] sm:min-h-[85px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between overflow-hidden ${
                    isSelected
                      ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/20'
                      : isToday
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : 'border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-emerald-600 text-white font-extrabold'
                          : isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-700'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayDemos.length > 0 && (
                      <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-100/80 px-1.5 py-0.2 rounded-md">
                        {dayDemos.length}
                      </span>
                    )}
                  </div>

                  {/* Micro demo pill badges */}
                  <div className="mt-1 space-y-1 overflow-hidden">
                    {dayDemos.slice(0, 2).map((d) => (
                      <div
                        key={d.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openDemoModal(d.id);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] truncate font-medium hover:opacity-80 transition-opacity ${
                          d.status === 'SCHEDULED' || d.status === 'CONFIRMED'
                            ? 'bg-indigo-100 text-indigo-800 font-semibold'
                            : d.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                        title={`${d.full_name} (${d.company})`}
                      >
                        {d.full_name.split(' ')[0]} • {d.company}
                      </div>
                    ))}
                    {dayDemos.length > 2 && (
                      <span className="text-[9px] text-slate-400 font-bold block text-center">
                        +{dayDemos.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Day Agenda (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Day Schedule
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </h3>
            </div>

            {selectedDayDemos.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <CalendarIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No demos on this date</p>
                <p className="text-[11px] text-slate-400 mt-1">Select another day on the calendar.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {selectedDayDemos.map((demo) => (
                  <div
                    key={demo.id}
                    onClick={() => openDemoModal(demo.id)}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-indigo-600">
                        {demo.reference_code}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {demo.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm mt-1.5 group-hover:text-indigo-600 transition-colors">
                      {demo.full_name}
                    </h4>

                    <div className="text-xs text-slate-500 flex items-center space-x-1.5 mt-0.5">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      <span>{demo.company}</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                      <div className="flex items-center space-x-1 text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{demo.confirmed_time || demo.preferred_time || 'Time TBD'}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {demo.assigned_user_name || 'Unassigned'}
                      </span>
                    </div>

                    {demo.meeting_link && (
                      <div className="mt-2 flex items-center space-x-1.5 text-xs text-emerald-700 font-semibold">
                        <Video className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="truncate max-w-[200px]">{demo.meeting_link}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              type="button"
              onClick={handleToday}
              className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
            >
              Jump to Today
            </button>
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
          fetchCalendarData();
        }}
      />
    </div>
  );
};
