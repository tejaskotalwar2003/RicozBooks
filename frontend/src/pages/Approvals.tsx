import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckSquare, 
  Check, 
  Ban, 
  Eye, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2,
  X,
  RotateCcw,
  Search,
  Filter,
  Calendar,
  History,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  accountingApi, 
  JournalEntry, 
  JournalStatus, 
  ApprovalSummaryResponse 
} from '../services/accountingApi';
import { Pagination } from '../components/common/Pagination';

type StatusFilterType = 'ALL' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export const Approvals: React.FC = () => {
  const { activeEntity, user } = useAuth();
  
  // Data state
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [summary, setSummary] = useState<ApprovalSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  
  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('SUBMITTED');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Selected detail modal
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Rejection modal
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Reopen modal
  const [reopeningId, setReopeningId] = useState<number | null>(null);
  const [reopenReason, setReopenReason] = useState('');

  const isReviewer = Boolean(
    user?.roles?.some(r => ['REVIEWER', 'ADMIN', 'ORG_ADMIN', 'MANAGER'].includes(r))
  );

  // 1. Load Summary Metrics
  const loadSummary = useCallback(async () => {
    if (!activeEntity) return;
    setSummaryLoading(true);
    try {
      const data = await accountingApi.getApprovalsSummary(activeEntity.id);
      setSummary(data);
    } catch (err) {
      console.error('Failed to load approvals summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, [activeEntity?.id]);

  // 2. Load Paginated Queue
  const loadQueue = useCallback(async () => {
    if (!activeEntity) return;
    setLoading(true);
    try {
      const res = await accountingApi.getJournalEntriesPaginated({
        entity_id: activeEntity.id,
        status: statusFilter === 'ALL' ? undefined : (statusFilter as JournalStatus),
        search: searchTerm.trim() || undefined,
        page,
        page_size: pageSize
      });

      if (res && Array.isArray(res.items)) {
        setJournals(res.items);
        setTotalRecords(res.total);
        setTotalPages(res.total_pages || 1);
      } else if (Array.isArray(res)) {
        setJournals(res);
        setTotalRecords(res.length);
        setTotalPages(1);
      } else {
        setJournals([]);
        setTotalRecords(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to load approvals queue:', err);
      setJournals([]);
    } finally {
      setLoading(false);
    }
  }, [activeEntity?.id, statusFilter, searchTerm, page, pageSize]);

  // Refresh both
  const refreshAll = useCallback(() => {
    loadSummary();
    loadQueue();
  }, [loadSummary, loadQueue]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Listen to external updates
  useEffect(() => {
    const handleUpdated = () => {
      refreshAll();
    };
    window.addEventListener('approvals-updated', handleUpdated);
    return () => {
      window.removeEventListener('approvals-updated', handleUpdated);
    };
  }, [refreshAll]);

  const dispatchUpdateEvent = () => {
    window.dispatchEvent(new CustomEvent('approvals-updated'));
  };

  // Actions
  const handleApprove = async (id: number) => {
    setActionLoading(true);
    try {
      await accountingApi.approveJournal(id, 'Approved for general ledger posting');
      dispatchUpdateEvent();
      refreshAll();
      if (selectedJournal?.id === id) {
        openDetail(id);
      }
    } catch (err: any) {
      alert(err.message || 'Approval failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingId || !rejectionReason.trim()) {
      alert('A specific rejection reason is mandatory.');
      return;
    }
    setActionLoading(true);
    try {
      await accountingApi.rejectJournal(rejectingId, rejectionReason.trim());
      setRejectingId(null);
      setRejectionReason('');
      dispatchUpdateEvent();
      refreshAll();
      if (selectedJournal?.id === rejectingId) {
        setSelectedJournal(null);
      }
    } catch (err: any) {
      alert(err.message || 'Rejection failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenConfirm = async () => {
    if (!reopeningId || !reopenReason.trim()) {
      alert('A mandatory reason is required to reopen an approved journal entry.');
      return;
    }
    setActionLoading(true);
    try {
      await accountingApi.reopenJournal(reopeningId, reopenReason.trim());
      setReopeningId(null);
      setReopenReason('');
      dispatchUpdateEvent();
      refreshAll();
      if (selectedJournal?.id === reopeningId) {
        openDetail(reopeningId);
      }
    } catch (err: any) {
      alert(err.message || 'Reopen failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePost = async (id: number) => {
    setActionLoading(true);
    try {
      await accountingApi.postJournal(id);
      dispatchUpdateEvent();
      refreshAll();
      if (selectedJournal?.id === id) {
        setSelectedJournal(null);
      }
    } catch (err: any) {
      alert(err.message || 'Posting failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const full = await accountingApi.getJournalEntryDetail(id);
      setSelectedJournal(full);
    } catch (err) {
      console.error('Failed to load journal detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const pendingCount = summary?.pending_count ?? 0;
  const approvedCount = summary?.approved_count ?? 0;
  const rejectedCount = summary?.rejected_count ?? 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-6 h-6 text-[#781019]" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Maker-Checker Journal Approvals
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervisory review and authorization queue for <strong className="text-slate-800">{activeEntity?.name}</strong>.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={refreshAll}
            disabled={loading || summaryLoading}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || summaryLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* SUMMARY STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pending Review */}
        <div 
          onClick={() => { setStatusFilter('SUBMITTED'); setPage(1); }}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === 'SUBMITTED'
              ? 'bg-amber-50/60 border-amber-400 ring-2 ring-amber-300/50 shadow-xs'
              : 'bg-white border-amber-200 hover:border-amber-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Review</span>
              <div className="text-2xl font-bold text-amber-700 mt-1 font-mono">{pendingCount}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Awaiting Reviewer sign-off</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Approved (Ready to Post) */}
        <div 
          onClick={() => { setStatusFilter('APPROVED'); setPage(1); }}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === 'APPROVED'
              ? 'bg-blue-50/60 border-blue-400 ring-2 ring-blue-300/50 shadow-xs'
              : 'bg-white border-blue-200 hover:border-blue-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved (Ready to Post)</span>
              <div className="text-2xl font-bold text-blue-700 mt-1 font-mono">{approvedCount}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Authorized for GL posting</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Rejected */}
        <div 
          onClick={() => { setStatusFilter('REJECTED'); setPage(1); }}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === 'REJECTED'
              ? 'bg-rose-50/60 border-rose-400 ring-2 ring-rose-300/50 shadow-xs'
              : 'bg-white border-rose-200 hover:border-rose-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rejected</span>
              <div className="text-2xl font-bold text-rose-700 mt-1 font-mono">{rejectedCount}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Needs correction & resubmission</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Ban className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center space-x-1 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => { setStatusFilter('SUBMITTED'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'SUBMITTED'
                ? 'bg-[#390003] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Pending Review ({pendingCount})
          </button>
          <button
            onClick={() => { setStatusFilter('APPROVED'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'APPROVED'
                ? 'bg-[#390003] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => { setStatusFilter('REJECTED'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'REJECTED'
                ? 'bg-[#390003] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Rejected ({rejectedCount})
          </button>
          <button
            onClick={() => { setStatusFilter('ALL'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-[#390003] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            All Journals
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by entry #, reference..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#781019]"
          />
          {searchTerm && (
            <button 
              onClick={() => { setSearchTerm(''); setPage(1); }} 
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* APPROVALS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-3 px-4 w-32">Journal #</th>
                <th className="py-3 px-4 w-28">Date</th>
                <th className="py-3 px-4">Created By</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading approvals queue...</span>
                  </td>
                </tr>
              ) : journals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="font-semibold text-slate-700">No records found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {statusFilter === 'SUBMITTED' 
                        ? 'All clear! No journal entries currently pending review for this entity.' 
                        : `No journal entries match the filter '${statusFilter}'.`}
                    </p>
                  </td>
                </tr>
              ) : (
                journals.map((je) => {
                  const isSubmitted = je.status === 'SUBMITTED' || (je.status as string) === 'UNDER_REVIEW';
                  const isApproved = je.status === 'APPROVED';
                  const isRejected = je.status === 'REJECTED';
                  const isPosted = je.status === 'POSTED';

                  return (
                    <tr key={je.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-[#781019]">
                        {je.entry_number}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        {je.entry_date}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        {je.created_by_name || 'Accountant'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {je.entity_name || activeEntity?.name}
                      </td>
                      <td className="py-2.5 px-4 text-slate-800 max-w-xs truncate" title={je.description}>
                        {je.description}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold tnum text-slate-900">
                        {activeEntity?.base_currency === 'USD' ? '$' : (activeEntity?.base_currency === 'GBP' ? '£' : '₹')}
                        {Number(je.total_debit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {isSubmitted && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Pending Review
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Rejected
                          </span>
                        )}
                        {isPosted && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Posted
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* View Detail */}
                          <button
                            onClick={() => openDetail(je.id)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] flex items-center space-x-1 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>

                          {/* SUBMITTED Reviewer Actions */}
                          {isSubmitted && isReviewer && (
                            <>
                              <button
                                onClick={() => setRejectingId(je.id)}
                                title="Reject Journal"
                                disabled={actionLoading}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-semibold text-[11px] flex items-center space-x-0.5 transition-colors"
                              >
                                <Ban className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                              <button
                                onClick={() => handleApprove(je.id)}
                                title="Approve Journal"
                                disabled={actionLoading}
                                className="px-2.5 py-1 bg-[#390003] hover:bg-[#55080E] text-white rounded font-semibold text-[11px] flex items-center space-x-1 shadow-xs transition-colors"
                              >
                                <Check className="w-3 h-3 text-[#E6B676]" />
                                <span>Approve</span>
                              </button>
                            </>
                          )}

                          {/* APPROVED Reviewer Actions */}
                          {isApproved && isReviewer && (
                            <>
                              {/* Controlled Reopen workflow */}
                              <button
                                onClick={() => setReopeningId(je.id)}
                                title="Reopen for Review"
                                disabled={actionLoading}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded font-semibold text-[11px] flex items-center space-x-1 transition-colors"
                              >
                                <RotateCcw className="w-3 h-3 text-amber-700" />
                                <span>Reopen</span>
                              </button>
                              {/* Post to GL */}
                              <button
                                onClick={() => handlePost(je.id)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-[11px] flex items-center space-x-1 shadow-xs transition-colors"
                              >
                                <ShieldCheck className="w-3 h-3 text-[#E6B676]" />
                                <span>Post</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION BAR */}
        {totalRecords > 0 && (
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={totalRecords}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
              onPageSizeChange={(ps) => { setPageSize(ps); setPage(1); }}
              isLoading={loading}
            />
          </div>
        )}
      </div>

      {/* DETAIL DRAWER / MODAL */}
      {selectedJournal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center space-x-3">
                  <h3 className="text-base font-bold text-slate-900 font-mono">
                    {selectedJournal.entry_number}
                  </h3>
                  {selectedJournal.status === 'SUBMITTED' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Pending Review
                    </span>
                  )}
                  {selectedJournal.status === 'APPROVED' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Approved
                    </span>
                  )}
                  {selectedJournal.status === 'REJECTED' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      Rejected
                    </span>
                  )}
                  {selectedJournal.status === 'POSTED' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Posted to Ledger
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1">{selectedJournal.description}</p>
                <div className="flex items-center space-x-4 text-[11px] text-slate-500 mt-1">
                  <span>Date: <strong className="text-slate-700">{selectedJournal.entry_date}</strong></span>
                  {selectedJournal.reference && (
                    <span>Ref: <strong className="text-slate-700">{selectedJournal.reference}</strong></span>
                  )}
                  <span>Entity: <strong className="text-slate-700">{selectedJournal.entity_name || activeEntity?.name}</strong></span>
                  <span>Currency: <strong className="text-slate-700">{selectedJournal.currency}</strong></span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedJournal(null)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Rejection Notice Banner */}
            {selectedJournal.rejection_reason && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start space-x-2 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Rejection Reason: </strong>
                  <span>{selectedJournal.rejection_reason}</span>
                </div>
              </div>
            )}

            {/* Scrollable Content */}
            <div className="overflow-y-auto space-y-5 pr-1 flex-1">
              {/* Lines Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Accounting Line Entries
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                        <th className="py-2.5 px-3 w-12">#</th>
                        <th className="py-2.5 px-3">Account</th>
                        <th className="py-2.5 px-3">Memo</th>
                        <th className="py-2.5 px-3 text-right">Debit</th>
                        <th className="py-2.5 px-3 text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedJournal.lines?.map(l => (
                        <tr key={l.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono text-slate-400">{l.line_number}</td>
                          <td className="py-2 px-3">
                            <span className="font-mono font-bold text-[#781019] mr-1.5">{l.account_code}</span>
                            <span className="font-semibold text-slate-800">{l.account_name}</span>
                          </td>
                          <td className="py-2 px-3 text-slate-500">{l.description || '—'}</td>
                          <td className="py-2 px-3 text-right font-mono font-semibold tnum text-slate-900">
                            {Number(l.debit) > 0 ? Number(l.debit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold tnum text-slate-900">
                            {Number(l.credit) > 0 ? Number(l.credit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 bg-slate-50 font-mono font-bold text-xs text-slate-900">
                        <td colSpan={3} className="py-2.5 px-3 text-right uppercase">Balancing Total:</td>
                        <td className="py-2.5 px-3 text-right tnum">{Number(selectedJournal.total_debit).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right tnum">{Number(selectedJournal.total_credit).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Audit & Approval History Trail */}
              <div>
                <div className="flex items-center space-x-1.5 mb-2">
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Approval & Audit History
                  </h4>
                </div>
                {selectedJournal.approvals && selectedJournal.approvals.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                    {selectedJournal.approvals.map((app) => (
                      <div key={app.id} className="p-3 bg-white hover:bg-slate-50 flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              app.action === 'APPROVED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              app.action === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                              app.action === 'REOPENED' ? 'bg-amber-50 text-amber-800 border border-amber-300' :
                              'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {app.action}
                            </span>
                            <span className="font-semibold text-slate-900">
                              {app.reviewer_name || `User #${app.reviewer_id}`}
                            </span>
                          </div>
                          {app.comments && (
                            <p className="text-slate-600 text-xs italic mt-1 pl-1">
                              "{app.comments}"
                            </p>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                          {new Date(app.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                    No approval records recorded yet.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedJournal(null)}
                className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                Close
              </button>

              <div className="flex items-center space-x-2">
                {selectedJournal.status === 'SUBMITTED' && isReviewer && (
                  <>
                    <button
                      onClick={() => setRejectingId(selectedJournal.id)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors"
                    >
                      Reject Voucher
                    </button>
                    <button
                      onClick={() => handleApprove(selectedJournal.id)}
                      disabled={actionLoading}
                      className="px-3.5 py-1.5 bg-[#390003] hover:bg-[#55080E] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1"
                    >
                      <Check className="w-3.5 h-3.5 text-[#E6B676]" />
                      <span>Authorize & Approve</span>
                    </button>
                  </>
                )}

                {selectedJournal.status === 'APPROVED' && isReviewer && (
                  <>
                    <button
                      onClick={() => setReopeningId(selectedJournal.id)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors flex items-center space-x-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                      <span>Reopen for Review</span>
                    </button>
                    <button
                      onClick={() => handlePost(selectedJournal.id)}
                      disabled={actionLoading}
                      className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#E6B676]" />
                      <span>Post to General Ledger</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REOPEN REASON MODAL */}
      {reopeningId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2 text-amber-700">
              <RotateCcw className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-slate-900">Reopen Approved Journal</h3>
            </div>
            <p className="text-xs text-slate-600">
              Reverting approval returns this journal to <strong>Pending Review</strong> so corrections can be made. 
              A mandatory justification reason is required and will be permanently recorded in the audit trail.
            </p>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Reason for Reopening <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Incorrect expense account was approved. Line items need correction before posting..."
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-1 focus:ring-amber-500 text-xs text-slate-900"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => { setReopeningId(null); setReopenReason(''); }}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !reopenReason.trim()}
                onClick={handleReopenConfirm}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
              >
                {actionLoading ? 'Processing...' : 'Confirm Reopen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2 text-rose-700">
              <Ban className="w-5 h-5 text-rose-600" />
              <h3 className="text-base font-bold text-slate-900">Reject Journal Entry</h3>
            </div>
            <p className="text-xs text-slate-600">
              Enter the reason for rejection. This will be visible to the accountant and permanently recorded in the audit trail.
            </p>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Reason for Rejection <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Account misclassification, missing vendor invoice attachment..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-1 focus:ring-rose-600 text-xs text-slate-900"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !rejectionReason.trim()}
                onClick={handleRejectConfirm}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
              >
                {actionLoading ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
