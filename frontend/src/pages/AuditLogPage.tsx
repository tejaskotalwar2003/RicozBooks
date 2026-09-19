import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  RefreshCw, 
  Download, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountingApi, AuditLogItem } from '../services/accountingApi';

export const AuditLogPage: React.FC = () => {
  const { activeEntity } = useAuth();

  // State
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedRecordType, setSelectedRecordType] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const pageSize = 25;

  // Selected Log for Inspector Modal
  const [inspectLog, setInspectLog] = useState<AuditLogItem | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await accountingApi.getAuditLogs({
        entity_id: activeEntity?.id,
        action: selectedAction || undefined,
        record_type: selectedRecordType || undefined,
        search: search || undefined,
        skip: page * pageSize,
        limit: pageSize,
      });
      setLogs(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [activeEntity, selectedAction, selectedRecordType, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadLogs();
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await accountingApi.downloadAuditLogsCsv({
        entity_id: activeEntity?.id,
        action: selectedAction || undefined,
        record_type: selectedRecordType || undefined,
        search: search || undefined,
      });
    } catch (err: any) {
      alert('Failed to export audit logs: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('POST')) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (action.includes('APPROV')) return 'bg-blue-50 text-blue-800 border-blue-200';
    if (action.includes('REJECT') || action.includes('FAILED')) return 'bg-rose-50 text-rose-800 border-rose-200';
    if (action.includes('SUBMIT')) return 'bg-amber-50 text-amber-800 border-amber-200';
    if (action.includes('REVERS')) return 'bg-purple-50 text-purple-800 border-purple-200';
    if (action.includes('LOGIN')) return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    if (action.includes('EXPORT')) return 'bg-teal-50 text-teal-800 border-teal-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#0B0F17] text-[#E6B676] border border-slate-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Immutable Audit Trail
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Forensic tamper-evident logging recording all financial events, approvals, posts, and exports.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={handleExportCsv}
            disabled={exporting || total === 0}
            className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <Download className={`w-3.5 h-3.5 text-slate-500 ${exporting ? 'animate-bounce' : ''}`} />
            <span>{exporting ? 'Exporting...' : 'Export Audit CSV'}</span>
          </button>

          <button 
            onClick={loadLogs}
            disabled={loading}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          
          {/* Free-text Search */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by action, details, user email, record ID..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#781019]"
            />
          </div>

          {/* Action Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(0);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#781019]"
            >
              <option value="">All Action Types</option>
              <option value="LOGIN">LOGIN</option>
              <option value="JOURNAL_CREATED">JOURNAL_CREATED</option>
              <option value="JOURNAL_SUBMITTED">JOURNAL_SUBMITTED</option>
              <option value="JOURNAL_APPROVED">JOURNAL_APPROVED</option>
              <option value="JOURNAL_REJECTED">JOURNAL_REJECTED</option>
              <option value="JOURNAL_POSTED">JOURNAL_POSTED</option>
              <option value="JOURNAL_REVERSED">JOURNAL_REVERSED</option>
              <option value="ACCOUNT_CREATED">ACCOUNT_CREATED</option>
              <option value="LEDGER_EXPORTED">LEDGER_EXPORTED</option>
            </select>
          </div>

          {/* Record Type Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedRecordType}
              onChange={(e) => {
                setSelectedRecordType(e.target.value);
                setPage(0);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#781019]"
            >
              <option value="">All Record Types</option>
              <option value="JournalEntry">JournalEntry</option>
              <option value="Account">Account</option>
              <option value="GeneralLedger">GeneralLedger</option>
              <option value="Entity">Entity</option>
              <option value="User">User</option>
            </select>
          </div>

        </form>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <div>
            Showing <strong>{logs.length > 0 ? page * pageSize + 1 : 0}</strong> to <strong>{Math.min((page + 1) * pageSize, total)}</strong> of <strong>{total}</strong> immutable records
          </div>
          {(selectedAction || selectedRecordType || search) && (
            <button
              onClick={() => {
                setSelectedAction('');
                setSelectedRecordType('');
                setSearch('');
                setPage(0);
              }}
              className="text-[#781019] hover:underline font-semibold"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Record Type</th>
                <th className="py-3 px-4">Record ID</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    {loading ? 'Loading audit records...' : 'No audit records match the selected filters.'}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr 
                    key={log.id} 
                    onClick={() => setInspectLog(log)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {log.user_email || 'System'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-700">
                      {log.record_type}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600 font-semibold">
                      {log.record_id || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-sm truncate" title={log.details || ''}>
                      {log.details || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectLog(log);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        title="Inspect record"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 font-semibold disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 font-semibold disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* INSPECTOR MODAL */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#0B0F17] text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-[#E6B676]" />
                <h3 className="text-sm font-bold tracking-tight text-white">
                  Audit Record Inspector #{inspectLog.id}
                </h3>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Action</span>
                <span className="col-span-2 font-mono font-bold text-slate-900">{inspectLog.action}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Timestamp (UTC)</span>
                <span className="col-span-2 font-mono text-slate-700">{new Date(inspectLog.timestamp).toISOString()}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Actor Email</span>
                <span className="col-span-2 font-semibold text-slate-900">{inspectLog.user_email || 'System Operation'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Target Record</span>
                <span className="col-span-2 font-mono text-slate-800">{inspectLog.record_type} : {inspectLog.record_id || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Client IP</span>
                <span className="col-span-2 font-mono text-slate-500">{inspectLog.ip_address || '127.0.0.1 (Localhost)'}</span>
              </div>
              <div className="pt-2">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block mb-1">
                  Event Details & Payload
                </span>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-slate-800 break-words whitespace-pre-wrap leading-relaxed">
                  {inspectLog.details || 'No additional details logged.'}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setInspectLog(null)}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
