import React, { useEffect, useState, useCallback } from 'react';
import { 
  api, 
  AuditLogItem, 
  AuditLogListResponseData 
} from '../../services/api';
import { 
  History, 
  Search, 
  Calendar, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Eye, 
  X, 
  ShieldCheck, 
  FileText, 
  User, 
  Globe, 
  Terminal, 
  Check, 
  Copy,
  Clock,
  Layers
} from 'lucide-react';

export const AuditTrailViewer: React.FC = () => {
  const [logsData, setLogsData] = useState<AuditLogListResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter States
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [recordTypeFilter, setRecordTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Selected Log for Details Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [copiedDetails, setCopiedDetails] = useState(false);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.getDeveloperAuditLogs({
        page,
        limit,
        search: search.trim() || undefined,
        action: actionFilter || undefined,
        record_type: recordTypeFilter || undefined,
        date_from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        date_to: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined,
      });
      setLogsData(res);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      setErrorMessage(err.message || 'Unable to retrieve audit logs.');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, actionFilter, recordTypeFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle preset date ranges
  const handleDatePreset = (preset: 'today' | '7days' | '30days' | 'clear') => {
    const today = new Date();
    const toISO = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'clear') {
      setDateFrom('');
      setDateTo('');
    } else if (preset === 'today') {
      const todayStr = toISO(today);
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === '7days') {
      const prior = new Date();
      prior.setDate(today.getDate() - 7);
      setDateFrom(toISO(prior));
      setDateTo(toISO(today));
    } else if (preset === '30days') {
      const prior = new Date();
      prior.setDate(today.getDate() - 30);
      setDateFrom(toISO(prior));
      setDateTo(toISO(today));
    }
    setPage(1);
  };

  const handleCopyDetails = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDetails(true);
    setTimeout(() => setCopiedDetails(false), 2000);
  };

  // Helper to color-code action badges
  const getActionBadgeColor = (action: string) => {
    if (action.includes('LOGIN_SUCCESS') || action.includes('ACCEPTED') || action.includes('APPROVED')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
    if (action.includes('UNAUTHORIZED') || action.includes('SUSPENDED') || action.includes('REVOKED') || action.includes('REJECTED')) {
      return 'bg-red-500/10 text-red-400 border-red-500/30';
    }
    if (action.includes('UPDATED') || action.includes('ASSIGNED') || action.includes('TOGGLED')) {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
    if (action.includes('CREATED') || action.includes('PROVISIONED') || action.includes('PROMOTED')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#781019] to-[#3B0006] border border-[#C58B3E]/40 flex items-center justify-center">
              <History className="w-4 h-4 text-[#E6B676]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Central Audit Trail
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Immutable administrative event logging, authorization audits, and security compliance traceability.
          </p>
        </div>

        {/* Refresh & Quick Status */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">Tamper-Proof Audit Store</span>
          </div>

          <button
            onClick={() => fetchLogs()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 flex items-start gap-3 text-red-200">
          <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm">
            <span className="font-semibold">Error: </span>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
            Total Audited Records
          </span>
          <div className="text-2xl font-black text-white">
            {logsData ? logsData.total.toLocaleString() : '—'}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Platform & Tenant Events</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
            Active Event Types
          </span>
          <div className="text-2xl font-black text-[#E6B676]">
            {logsData?.available_actions.length ?? '—'}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Security & Consequential Actions</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
            Current Page
          </span>
          <div className="text-2xl font-black text-emerald-400">
            {logsData ? `${logsData.page} / ${logsData.pages}` : '—'}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">{logsData?.items.length ?? 0} records on view</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
            Immutability Policy
          </span>
          <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Append-Only</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">No Mutation / Deletion</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
        {/* Row 1: Search and Type Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by actor email, action, record ID, or details..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#C58B3E] transition-colors"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="sm:col-span-3">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 focus:outline-none focus:border-[#C58B3E]"
            >
              <option value="">All Actions ({logsData?.available_actions.length ?? 0})</option>
              {logsData?.available_actions.map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={recordTypeFilter}
              onChange={(e) => {
                setRecordTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 focus:outline-none focus:border-[#C58B3E]"
            >
              <option value="">All Record Types ({logsData?.available_record_types.length ?? 0})</option>
              {logsData?.available_record_types.map(rt => (
                <option key={rt} value={rt}>{rt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Date Range Picker & Quick Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Date Range:</span>
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-[#C58B3E]"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-[#C58B3E]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold mr-1">Presets:</span>
            <button
              onClick={() => handleDatePreset('today')}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => handleDatePreset('7days')}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
            >
              7 Days
            </button>
            <button
              onClick={() => handleDatePreset('30days')}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
            >
              30 Days
            </button>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => handleDatePreset('clear')}
                className="px-2 py-1 rounded-lg bg-red-950/40 hover:bg-red-950 text-red-300 text-[11px] border border-red-800/40 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Audit Trail Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Actor</th>
                <th className="p-3.5">Target Resource</th>
                <th className="p-3.5">Details</th>
                <th className="p-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                      <span>Loading audit trail...</span>
                    </div>
                  </td>
                </tr>
              ) : !logsData || logsData.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <History className="w-8 h-8 text-slate-600" />
                      <p className="text-sm font-semibold text-slate-400">No audit records found.</p>
                      <p className="text-xs text-slate-600">Try adjusting your search criteria or date filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logsData.items.map((log) => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Timestamp */}
                    <td className="p-3.5 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{formatDate(log.timestamp)}</span>
                      </div>
                    </td>

                    {/* Action Badge */}
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wide inline-block ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Actor */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span className="font-semibold text-slate-200">
                          {log.user_email || `User #${log.user_id}` || 'System'}
                        </span>
                      </div>
                    </td>

                    {/* Target Resource */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-slate-500" />
                        <span className="font-medium text-slate-300">
                          {log.record_type}
                        </span>
                        {log.record_id && (
                          <span className="font-mono text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                            #{log.record_id}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Details Snippet */}
                    <td className="p-3.5 max-w-xs sm:max-w-md truncate text-slate-400 font-mono text-[11px]">
                      {log.details || '—'}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[11px] font-semibold border border-slate-700"
                      >
                        <Eye className="w-3 h-3 text-[#E6B676]" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Bar */}
        {logsData && logsData.pages > 1 && (
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3 text-slate-400">
              <span>
                Showing <strong>{(logsData.page - 1) * logsData.limit + 1}</strong> to{' '}
                <strong>{Math.min(logsData.page * logsData.limit, logsData.total)}</strong> of{' '}
                <strong>{logsData.total.toLocaleString()}</strong> records
              </span>

              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800">
                <span>Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-slate-300 font-semibold px-2">
                Page {logsData.page} of {logsData.pages}
              </span>

              <button
                onClick={() => setPage(p => Math.min(logsData.pages, p + 1))}
                disabled={page >= logsData.pages}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Modal / Slide-over Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#781019] to-[#3B0006] border border-[#C58B3E]/40 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#E6B676]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-white">Audit Event Details</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadgeColor(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Record ID: #{selectedLog.id} • {formatDate(selectedLog.timestamp)}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Immutability Banner */}
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 flex items-center gap-2.5 text-emerald-300 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Immutable Record — Cryptographically preserved system history. Read-only.</span>
            </div>

            {/* Structured Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-500 font-semibold block mb-0.5">Actor</span>
                <span className="font-bold text-slate-200 truncate block">
                  {selectedLog.user_email || `ID #${selectedLog.user_id}` || 'System'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-500 font-semibold block mb-0.5">Target Resource</span>
                <span className="font-bold text-slate-200 block">
                  {selectedLog.record_type} {selectedLog.record_id ? `(#${selectedLog.record_id})` : ''}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-500 font-semibold block mb-0.5">Origin IP</span>
                <span className="font-mono text-slate-300 block truncate">
                  {selectedLog.ip_address || '—'}
                </span>
              </div>
            </div>

            {/* User Agent */}
            {selectedLog.user_agent && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Client User Agent</span>
                </div>
                <p className="font-mono text-[11px] text-slate-300 break-all">
                  {selectedLog.user_agent}
                </p>
              </div>
            )}

            {/* Details Content Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Event Payload & Metadata:</span>
                </span>

                {selectedLog.details && (
                  <button
                    onClick={() => handleCopyDetails(selectedLog.details || '')}
                    className="flex items-center gap-1 text-[11px] text-[#E6B676] hover:text-white transition-colors"
                  >
                    {copiedDetails ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Metadata</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 max-h-48 overflow-y-auto scrollbar-thin">
                <pre className="font-mono text-[11px] text-slate-300 whitespace-pre-wrap break-all">
                  {selectedLog.details || 'No additional metadata recorded for this action.'}
                </pre>
              </div>
            </div>

            {/* Close Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
