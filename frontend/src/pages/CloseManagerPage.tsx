import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  RefreshCw, 
  ShieldCheck, 
  UserCheck, 
  FileText, 
  ChevronDown,
  AlertTriangle,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountingApi, ClosePeriod, CloseTask, CloseStatus } from '../services/accountingApi';

export const CloseManagerPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('ADMIN');
  const isReviewer = user?.roles?.includes('REVIEWER') || isAdmin;

  const [periods, setPeriods] = useState<ClosePeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [periodDetail, setPeriodDetail] = useState<ClosePeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'BLOCKED'>('ALL');
  
  // Modals
  const [showLockModal, setShowLockModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showNewPeriodModal, setShowNewPeriodModal] = useState(false);
  const [lockNotes, setLockNotes] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [submittingLock, setSubmittingLock] = useState(false);
  const [notesModalTask, setNotesModalTask] = useState<CloseTask | null>(null);
  const [taskNotesInput, setTaskNotesInput] = useState('');

  // New period form
  const [newPeriodName, setNewPeriodName] = useState('');
  const [newFiscalYear, setNewFiscalYear] = useState('2026-27');
  const [newMonth, setNewMonth] = useState(10);
  const [newTargetDate, setNewTargetDate] = useState('2026-11-05');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchPeriods = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await accountingApi.getClosePeriods();
      setPeriods(data);
      if (data.length > 0) {
        const activeId = selectedPeriodId || data[0].id;
        setSelectedPeriodId(activeId);
        await loadPeriodDetail(activeId);
      } else {
        setPeriodDetail(null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load close periods');
    } finally {
      setLoading(false);
    }
  };

  const loadPeriodDetail = async (id: number) => {
    try {
      const detail = await accountingApi.getClosePeriodDetail(id);
      setPeriodDetail(detail);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load period tasks');
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const handlePeriodChange = async (id: number) => {
    setSelectedPeriodId(id);
    setErrorMessage(null);
    setSuccessMessage(null);
    await loadPeriodDetail(id);
  };

  const handleStatusChange = async (task: CloseTask, newStatus: CloseStatus) => {
    setUpdatingTaskId(task.id);
    setErrorMessage(null);
    try {
      await accountingApi.updateCloseTask(task.id, { status: newStatus });
      if (selectedPeriodId) {
        await loadPeriodDetail(selectedPeriodId);
        // Refresh period summary list as well
        const updatedList = await accountingApi.getClosePeriods();
        setPeriods(updatedList);
      }
      setSuccessMessage(`Task "${task.task_name}" updated to ${newStatus.replace(/_/g, ' ')}`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update task status');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleSaveNotes = async () => {
    if (!notesModalTask) return;
    try {
      await accountingApi.updateCloseTask(notesModalTask.id, { notes: taskNotesInput });
      if (selectedPeriodId) await loadPeriodDetail(selectedPeriodId);
      setNotesModalTask(null);
      setSuccessMessage('Task remarks saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save remarks');
    }
  };

  const handleLockPeriod = async () => {
    if (!selectedPeriodId) return;
    setSubmittingLock(true);
    setErrorMessage(null);
    try {
      await accountingApi.lockClosePeriod(selectedPeriodId, { notes: lockNotes });
      setShowLockModal(false);
      setLockNotes('');
      await loadPeriodDetail(selectedPeriodId);
      const updatedList = await accountingApi.getClosePeriods();
      setPeriods(updatedList);
      setSuccessMessage('Accounting period locked and closed. Hard ledger lock is active.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to lock period');
    } finally {
      setSubmittingLock(false);
    }
  };

  const handleReopenPeriod = async () => {
    if (!selectedPeriodId || !reopenReason.trim()) {
      setErrorMessage('Please provide a mandatory audit explanation for reopening closed books.');
      return;
    }
    setSubmittingLock(true);
    setErrorMessage(null);
    try {
      await accountingApi.reopenClosePeriod(selectedPeriodId, { reason: reopenReason });
      setShowReopenModal(false);
      setReopenReason('');
      await loadPeriodDetail(selectedPeriodId);
      const updatedList = await accountingApi.getClosePeriods();
      setPeriods(updatedList);
      setSuccessMessage('Accounting period reopened. Emergency audit entry logged.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reopen period');
    } finally {
      setSubmittingLock(false);
    }
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPeriodName.trim()) return;
    setSubmittingLock(true);
    try {
      const activeEntityId = user?.active_entity_id || user?.default_entity_id || 1;
      const created = await accountingApi.createClosePeriod({
        entity_id: activeEntityId,
        period_name: newPeriodName,
        fiscal_year: newFiscalYear,
        month: newMonth,
        target_date: newTargetDate,
      });
      setShowNewPeriodModal(false);
      setNewPeriodName('');
      await fetchPeriods();
      if (created?.id) {
        setSelectedPeriodId(created.id);
        await loadPeriodDetail(created.id);
      }
      setSuccessMessage(`New close period "${newPeriodName}" initialized with standard statutory tasks.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create close period');
    } finally {
      setSubmittingLock(false);
    }
  };

  const tasks = periodDetail?.tasks || [];
  const filteredTasks = tasks.filter(t => {
    if (filterTab === 'PENDING') return t.status === 'IN_PROGRESS' || t.status === 'READY_FOR_REVIEW' || t.status === 'NOT_STARTED';
    if (filterTab === 'APPROVED') return t.status === 'APPROVED';
    if (filterTab === 'BLOCKED') return t.status === 'BLOCKED';
    return true;
  });

  const isPeriodClosed = periodDetail?.status === 'CLOSED';
  const completionPct = periodDetail?.completion_percentage || 0;
  const approvedCount = tasks.filter(t => t.status === 'APPROVED').length;
  const pendingCount = tasks.filter(t => t.status !== 'APPROVED' && t.status !== 'BLOCKED').length;
  const blockedCount = tasks.filter(t => t.status === 'BLOCKED').length;

  return (
    <div className="space-y-6">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#0B0F17] text-[#E6B676] border border-slate-800 rounded-xl shadow-xs">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Period-End Close Manager
              </h1>
              <p className="text-xs text-slate-500">
                Statutory closing checklists, supervisory sign-offs, and hard ledger locking.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => fetchPeriods()}
            title="Refresh"
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowNewPeriodModal(true)}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#C58B3E]" />
              <span>New Period</span>
            </button>
          )}

          {isPeriodClosed ? (
            isAdmin && (
              <button
                onClick={() => setShowReopenModal(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-300 rounded-xl hover:bg-amber-100 transition-colors shadow-xs cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Reopen Period</span>
              </button>
            )
          ) : (
            isAdmin && (
              <button
                onClick={() => setShowLockModal(true)}
                className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-[#781019] hover:bg-[#600C13] border border-[#781019] rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-[#EEC68B]" />
                <span>Lock & Close Books</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700 font-bold ml-2">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800 font-bold ml-2">✕</button>
        </div>
      )}

      {/* PERIOD SELECTOR & STATUS STRIP */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Accounting Period:</label>
            <div className="relative inline-block">
              <select
                value={selectedPeriodId || ''}
                onChange={(e) => handlePeriodChange(Number(e.target.value))}
                className="appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-xl px-3.5 py-2 pr-8 hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#C58B3E]/30 cursor-pointer"
              >
                {periods.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.period_name} ({p.fiscal_year}) &bull; {p.status}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Period Status Badge */}
          <div className="flex items-center space-x-3 text-xs">
            {isPeriodClosed ? (
              <span className="flex items-center space-x-1.5 px-3 py-1 bg-slate-900 text-amber-300 font-bold rounded-lg border border-amber-400/30 shadow-xs">
                <Lock className="w-3.5 h-3.5 text-amber-300" />
                <span>HARD LEDGER LOCKED &bull; CLOSED</span>
              </span>
            ) : completionPct === 100 ? (
              <span className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>READY FOR FINAL CFO LOCK</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 px-3 py-1 bg-amber-50 text-amber-900 font-bold rounded-lg border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>IN PROGRESS &bull; {completionPct}% COMPLETE</span>
              </span>
            )}

            <span className="text-slate-400 font-semibold text-[11px]">
              Target: <strong className="text-slate-700">{periodDetail?.target_date || 'N/A'}</strong>
            </span>
          </div>
        </div>

        {/* 4 EXECUTIVE KPI METRICS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-1">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Overall Progress</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-black text-slate-900 font-mono">{completionPct}%</span>
              <span className="text-[11px] font-semibold text-slate-500">{approvedCount}/{tasks.length} tasks</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#781019] via-[#C58B3E] to-emerald-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${completionPct}%` }}
              ></div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Approved Procedures</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-black text-emerald-700 font-mono">{approvedCount}</span>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Verified</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Passed 4-eyes supervisory review</p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pending Actions</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-black text-amber-700 font-mono">{pendingCount}</span>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Action Req</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Awaiting prep or sign-off</p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Blocked Procedures</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-black text-rose-700 font-mono">{blockedCount}</span>
              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">{blockedCount === 0 ? 'Clear' : 'Attention'}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Zero unresolved blockers required to lock</p>
          </div>
        </div>
      </div>

      {/* CHECKLIST TABLE AREA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Table Filter Tabs */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-1.5 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${filterTab === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All Procedures ({tasks.length})
            </button>
            <button
              onClick={() => setFilterTab('PENDING')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${filterTab === 'PENDING' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilterTab('APPROVED')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${filterTab === 'APPROVED' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Approved ({approvedCount})
            </button>
            {blockedCount > 0 && (
              <button
                onClick={() => setFilterTab('BLOCKED')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${filterTab === 'BLOCKED' ? 'bg-rose-700 text-white' : 'text-rose-700 hover:bg-rose-50'}`}
              >
                Blocked ({blockedCount})
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C58B3E]" />
            <span>Maker-Checker controls enforced for all approvals</span>
          </div>
        </div>

        {/* Task Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Statutory Procedure</th>
                <th className="py-3 px-4">Target Due Date</th>
                <th className="py-3 px-4">Assignee & Reviewer</th>
                <th className="py-3 px-4">Procedure Status</th>
                <th className="py-3 px-4 text-right">Remarks & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No procedures match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t, idx) => {
                  const isApproved = t.status === 'APPROVED';
                  const isBlocked = t.status === 'BLOCKED';
                  const isInProgress = t.status === 'IN_PROGRESS';
                  const isReadyForReview = t.status === 'READY_FOR_REVIEW';

                  return (
                    <tr key={t.id} className={`hover:bg-slate-50/70 transition-colors ${isApproved ? 'bg-emerald-50/20' : ''}`}>
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                          <span>{t.task_name}</span>
                          {isApproved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline shrink-0" />}
                        </div>
                        {t.description && (
                          <div className="text-[11px] text-slate-500 mt-0.5 max-w-md">
                            {t.description}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                        {t.due_date}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-0.5 text-[11px]">
                          <span className="text-slate-700 font-semibold flex items-center space-x-1">
                            <span className="text-slate-400">Prep:</span>
                            <span>{t.assigned_to_name || 'Senior Accountant'}</span>
                          </span>
                          <span className="text-slate-500 flex items-center space-x-1">
                            <span className="text-slate-400">Sign-off:</span>
                            <span>{t.reviewer_name || (isApproved ? 'Verified' : 'Pending')}</span>
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isPeriodClosed ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            {t.status.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <div className="relative inline-block">
                            <select
                              value={t.status}
                              disabled={updatingTaskId === t.id}
                              onChange={(e) => handleStatusChange(t, e.target.value as CloseStatus)}
                              className={`text-[10px] font-bold rounded-lg px-2.5 py-1 pr-6 border cursor-pointer appearance-none transition-colors ${
                                isApproved 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                  : isBlocked 
                                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                                  : isReadyForReview
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : isInProgress
                                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              <option value="NOT_STARTED">Not Started</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="READY_FOR_REVIEW">Ready for Review</option>
                              {isReviewer && <option value="APPROVED">Approved (Sign-Off)</option>}
                              <option value="BLOCKED">Blocked</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-slate-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setNotesModalTask(t);
                              setTaskNotesInput(t.notes || '');
                            }}
                            title="Inspect/Edit Remarks"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {!isPeriodClosed && !isApproved && isReviewer && (
                            <button
                              disabled={updatingTaskId === t.id}
                              onClick={() => handleStatusChange(t, 'APPROVED')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-md transition-colors shadow-2xs cursor-pointer flex items-center space-x-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Sign-Off</span>
                            </button>
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

        {/* Audit Guidance Note */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>All task status changes, completions, and sign-offs are logged into the immutable forensic audit trail.</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">RicozBooks Governance Engine v1.0</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: CFO LOCK & CLOSE BOOKS */}
      {/* ======================================================== */}
      {showLockModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-amber-600">
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                <Lock className="w-6 h-6 text-[#781019]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Finalize & Lock Accounting Period</h3>
                <p className="text-xs text-slate-500">Executive CFO sign-off & permanent ledger lock</p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5 leading-relaxed">
              <div className="font-bold flex items-center space-x-1.5 text-amber-950">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                <span>Permanent Double-Entry Invariant Lock:</span>
              </div>
              <p>
                Once locked, <strong>no user can add, edit, or post journal vouchers</strong> dated within {periodDetail?.period_name}. All financial statements (Trial Balance, P&L, Balance Sheet) will become official.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                CFO Closing Remarks / Sign-Off Notes:
              </label>
              <textarea
                value={lockNotes}
                onChange={(e) => setLockNotes(e.target.value)}
                placeholder="e.g., September 2026 books verified by audit committee. Bank reconciliations 100% matched."
                rows={3}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C58B3E]/40 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLockModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingLock}
                onClick={handleLockPeriod}
                className="px-4 py-2 text-xs font-bold text-white bg-[#781019] hover:bg-[#600C13] border border-[#781019] rounded-xl transition-colors shadow-sm cursor-pointer flex items-center space-x-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-[#EEC68B]" />
                <span>{submittingLock ? 'Locking Period...' : 'Confirm Hard Lock & Close'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EMERGENCY REOPEN PERIOD */}
      {/* ======================================================== */}
      {showReopenModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                <Unlock className="w-6 h-6 text-rose-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Emergency Period Unlock</h3>
                <p className="text-xs text-slate-500">Reopen accounting period for statutory adjustments</p>
              </div>
            </div>

            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1 leading-relaxed">
              <strong>Compliance Alert:</strong> Reopening a closed period permits journal voucher postings and will generate an alert in the audit trail with your name, IP, and timestamp.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mandatory Audit Explanation: <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Explain why this period is being unlocked (e.g., Year-end statutory tax audit adjustment authorized by Board)."
                rows={3}
                required
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/30 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReopenModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingLock || !reopenReason.trim()}
                onClick={handleReopenPeriod}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                {submittingLock ? 'Reopening...' : 'Authorize Period Reopen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: TASK REMARKS & NOTES */}
      {/* ======================================================== */}
      {notesModalTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Task Remarks & Audit Evidence</h3>
              <p className="text-xs text-slate-500">{notesModalTask.task_name}</p>
            </div>

            <textarea
              value={taskNotesInput}
              onChange={(e) => setTaskNotesInput(e.target.value)}
              placeholder="Record reconciliation notes, statement references, or auditor sign-off memos..."
              rows={4}
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C58B3E]/30 focus:outline-hidden"
            />

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setNotesModalTask(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNotes}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#781019] hover:bg-[#600C13] rounded-lg cursor-pointer"
              >
                Save Remarks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: INITIALIZE NEW CLOSE PERIOD */}
      {/* ======================================================== */}
      {showNewPeriodModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreatePeriod} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Initialize New Accounting Period</h3>
              <p className="text-xs text-slate-500">Automatically provisions the 8 standard statutory close procedures</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Period Name</label>
                <input
                  type="text"
                  required
                  value={newPeriodName}
                  onChange={(e) => setNewPeriodName(e.target.value)}
                  placeholder="e.g. October 2026 Close"
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C58B3E]/30 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fiscal Year</label>
                  <input
                    type="text"
                    required
                    value={newFiscalYear}
                    onChange={(e) => setNewFiscalYear(e.target.value)}
                    placeholder="2026-27"
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C58B3E]/30 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Month Number (1-12)</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={newMonth}
                    onChange={(e) => setNewMonth(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C58B3E]/30 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Close Deadline</label>
                <input
                  type="date"
                  required
                  value={newTargetDate}
                  onChange={(e) => setNewTargetDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C58B3E]/30 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewPeriodModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingLock}
                className="px-4 py-2 text-xs font-bold text-white bg-[#781019] hover:bg-[#600C13] rounded-xl cursor-pointer shadow-sm"
              >
                {submittingLock ? 'Creating...' : 'Initialize Period'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

