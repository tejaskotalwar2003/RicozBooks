import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  Building2, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  User, 
  Video, 
  MoreVertical, 
  Download, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  CalendarCheck,
  UserCheck
} from 'lucide-react';
import { 
  internalDemoApi, 
  DemoRequestItem, 
  InternalUser 
} from '../../services/internalDemoApi';
import { InternalDemoDetailModal } from './InternalDemoDetailModal';

export const InternalDemosList: React.FC = () => {
  const [demos, setDemos] = useState<DemoRequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [interestFilter, setInterestFilter] = useState('ALL');
  const [assignedFilter, setAssignedFilter] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  // Team list for filter
  const [team, setTeam] = useState<InternalUser[]>([]);

  // Modal State
  const [selectedDemoId, setSelectedDemoId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Load team
  useEffect(() => {
    internalDemoApi.getTeam().then(setTeam).catch(() => {});
  }, []);

  // Fetch demos
  const fetchDemos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await internalDemoApi.listDemos({
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        interest_area: interestFilter !== 'ALL' ? interestFilter : undefined,
        assigned_to: assignedFilter,
        sort_by: sortBy,
        sort_dir: sortDir,
        page,
        limit
      });
      setDemos(res.items);
      setTotal(res.total);
    } catch (err: any) {
      console.error('Error fetching demos:', err);
      setError(err.message || 'Failed to load demo requests');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, interestFilter, assignedFilter, sortBy, sortDir, page, limit]);

  useEffect(() => {
    fetchDemos();
  }, [fetchDemos]);

  // Debounced search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
    setPage(1);
  };

  const openDemoModal = (id: number) => {
    setSelectedDemoId(id);
    setIsDetailModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1 animate-pulse" />
            NEW
          </span>
        );
      case 'UNDER REVIEW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            UNDER REVIEW
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            SCHEDULED
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            CONFIRMED
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            COMPLETED
          </span>
        );
      case 'RESCHEDULED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
            RESCHEDULED
          </span>
        );
      case 'CANCELLED':
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  // Export to CSV helper
  const handleExportCSV = () => {
    if (demos.length === 0) return;
    const headers = [
      'Reference Code',
      'Customer Name',
      'Work Email',
      'Phone',
      'Company',
      'Role',
      'Entities',
      'Interest Area',
      'Preferred Date',
      'Preferred Time',
      'Confirmed Date',
      'Confirmed Time',
      'Status',
      'Assigned To',
      'Created At'
    ];

    const rows = demos.map(d => [
      `"${d.reference_code}"`,
      `"${d.full_name}"`,
      `"${d.work_email}"`,
      `"${d.phone}"`,
      `"${d.company}"`,
      `"${d.role}"`,
      `"${d.entities_count}"`,
      `"${d.interest_area}"`,
      `"${d.preferred_date || ''}"`,
      `"${d.preferred_time || ''}"`,
      `"${d.confirmed_date || ''}"`,
      `"${d.confirmed_time || ''}"`,
      `"${d.status}"`,
      `"${d.assigned_user_name || 'Unassigned'}"`,
      `"${new Date(d.created_at).toLocaleString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ricozbooks_demos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/70">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
              Registry
            </span>
            <span className="text-xs text-slate-400 font-mono">Total {total} Requests</span>
          </div>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Demo Requests
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            Search, filter, schedule, assign, and manage enterprise demo bookings.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 shadow-2xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={fetchDemos}
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
          <button
            type="button"
            onClick={fetchDemos}
            className="font-bold underline ml-3 hover:text-rose-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search box */}
          <div className="md:col-span-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search reference ID, client name, email, company..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">NEW</option>
              <option value="UNDER REVIEW">UNDER REVIEW</option>
              <option value="SCHEDULED">SCHEDULED</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="RESCHEDULED">RESCHEDULED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          {/* Interest Area Filter */}
          <div className="md:col-span-3">
            <select
              value={interestFilter}
              onChange={(e) => {
                setInterestFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden bg-white"
            >
              <option value="ALL">All Topics</option>
              <option value="Complete Platform Demo">Complete Platform Demo</option>
              <option value="Accounting & Double-Entry Ledger">Accounting & Double-Entry</option>
              <option value="GST & Compliance">GST & Compliance</option>
              <option value="Financial Reports">Financial Reports</option>
              <option value="Multi-Entity Management">Multi-Entity Management</option>
            </select>
          </div>

          {/* Assigned Staff Filter */}
          <div className="md:col-span-2">
            <select
              value={assignedFilter !== undefined ? String(assignedFilter) : 'ALL'}
              onChange={(e) => {
                const val = e.target.value;
                setAssignedFilter(val === 'ALL' ? undefined : Number(val));
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden bg-white"
            >
              <option value="ALL">All Assigned</option>
              {team.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters chips */}
        {(statusFilter !== 'ALL' || interestFilter !== 'ALL' || assignedFilter !== undefined || search) && (
          <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-medium">Active Filters:</span>
            {search && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 flex items-center space-x-1">
                <span>Keyword: "{search}"</span>
                <button type="button" onClick={() => setSearch('')} className="ml-1 text-slate-400 hover:text-slate-700">×</button>
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 flex items-center space-x-1">
                <span>Status: {statusFilter}</span>
                <button type="button" onClick={() => setStatusFilter('ALL')} className="ml-1 text-indigo-400 hover:text-indigo-800">×</button>
              </span>
            )}
            {interestFilter !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 flex items-center space-x-1">
                <span>Topic: {interestFilter}</span>
                <button type="button" onClick={() => setInterestFilter('ALL')} className="ml-1 text-purple-400 hover:text-purple-800">×</button>
              </span>
            )}
            {assignedFilter !== undefined && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 flex items-center space-x-1">
                <span>Staff: {team.find(u => u.id === assignedFilter)?.name || assignedFilter}</span>
                <button type="button" onClick={() => setAssignedFilter(undefined)} className="ml-1 text-emerald-400 hover:text-emerald-800">×</button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setInterestFilter('ALL');
                setAssignedFilter(undefined);
              }}
              className="text-xs text-rose-600 hover:underline font-medium ml-auto"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th 
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('reference_code')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Reference ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Customer & Company</th>
                <th className="py-3 px-4">Role & Entities</th>
                <th className="py-3 px-4">Interest Area</th>
                <th 
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('preferred_date')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Schedule / Slot</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Assigned To</th>
                <th 
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Submitted</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                    <span>Loading demo requests from PostgreSQL...</span>
                  </td>
                </tr>
              ) : demos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600 text-sm">No demo requests matched your filters</p>
                    <p className="text-xs text-slate-400 mt-1">Try broadening your search or clearing applied filters.</p>
                  </td>
                </tr>
              ) : (
                demos.map((demo) => (
                  <tr
                    key={demo.id}
                    className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                    onClick={() => openDemoModal(demo.id)}
                  >
                    {/* Reference ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                      {demo.reference_code}
                    </td>

                    {/* Customer & Company */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {demo.full_name}
                      </div>
                      <div className="text-slate-500 flex items-center space-x-1.5 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700 truncate max-w-[140px]">{demo.company}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[140px]">{demo.work_email}</span>
                      </div>
                    </td>

                    {/* Role & Entities */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {demo.role}
                      </span>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {demo.entities_count} {demo.entities_count === '1' ? 'Entity' : 'Entities'}
                      </div>
                    </td>

                    {/* Interest Area */}
                    <td className="py-3.5 px-4 max-w-[180px]">
                      <span className="font-medium text-slate-800 line-clamp-2 leading-tight">
                        {demo.interest_area}
                      </span>
                    </td>

                    {/* Schedule / Slot */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {demo.confirmed_date ? (
                        <div>
                          <div className="font-semibold text-emerald-700 flex items-center space-x-1">
                            <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{demo.confirmed_date}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {demo.confirmed_time}
                          </div>
                        </div>
                      ) : demo.preferred_date ? (
                        <div>
                          <div className="font-medium text-slate-700 flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{demo.preferred_date}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {demo.preferred_time || 'Preferred'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No slot specified</span>
                      )}
                    </td>

                    {/* Assigned To */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {demo.assigned_user_name ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                            {demo.assigned_user_name.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-700 text-xs">
                            {demo.assigned_user_name}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                          <span>Unassigned</span>
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(demo.status)}
                    </td>

                    {/* Submitted At */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="text-slate-600 font-medium">
                        {new Date(demo.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(demo.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Actions */}
                    <td 
                      className="py-3.5 px-4 text-center whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => openDemoModal(demo.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors inline-flex items-center space-x-1 text-xs font-semibold"
                        title="View & Manage"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Manage</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center space-x-2">
            <span>Showing</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs outline-hidden"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>of <span className="font-bold text-slate-900">{total}</span> requests</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
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
          fetchDemos();
        }}
      />
    </div>
  );
};
