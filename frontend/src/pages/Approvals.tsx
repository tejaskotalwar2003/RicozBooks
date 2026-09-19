import React, { useState, useEffect } from 'react';
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
  X 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountingApi, JournalEntry, JournalStatus } from '../services/accountingApi';

export const Approvals: React.FC = () => {
  const { activeEntity, user } = useAuth();
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected detail
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  
  // Rejection dialog
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const isReviewer = user?.roles.includes('REVIEWER') || user?.roles.includes('ADMIN');

  const loadPending = async () => {
    if (!activeEntity) return;
    setLoading(true);
    try {
      // Load both SUBMITTED and APPROVED
      const [submitted, approved] = await Promise.all([
        accountingApi.getJournalEntries({
          entity_id: activeEntity.id,
          status: 'SUBMITTED',
        }),
        accountingApi.getJournalEntries({
          entity_id: activeEntity.id,
          status: 'APPROVED',
        })
      ]);
      setJournals([...submitted, ...approved]);
    } catch (err) {
      console.error('Failed to load pending approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, [activeEntity?.id]);

  const handleApprove = async (id: number) => {
    try {
      await accountingApi.approveJournal(id, 'Approved by Reviewer');
      loadPending();
      if (selectedJournal?.id === id) setSelectedJournal(null);
    } catch (err: any) {
      alert(err.message || 'Approval failed.');
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingId || !rejectionReason.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }
    try {
      await accountingApi.rejectJournal(rejectingId, rejectionReason.trim());
      setRejectingId(null);
      setRejectionReason('');
      loadPending();
      if (selectedJournal?.id === rejectingId) setSelectedJournal(null);
    } catch (err: any) {
      alert(err.message || 'Rejection failed.');
    }
  };

  const handlePost = async (id: number) => {
    try {
      await accountingApi.postJournal(id);
      loadPending();
      if (selectedJournal?.id === id) setSelectedJournal(null);
    } catch (err: any) {
      alert(err.message || 'Posting failed.');
    }
  };

  const openDetail = async (id: number) => {
    try {
      const full = await accountingApi.getJournalEntryDetail(id);
      setSelectedJournal(full);
    } catch (err) {
      console.error('Failed to load detail:', err);
    }
  };

  const pendingCount = journals.filter(j => j.status === 'SUBMITTED').length;
  const approvedCount = journals.filter(j => j.status === 'APPROVED').length;

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
            Supervisory review queue for <strong className="text-slate-800">{activeEntity?.name}</strong>. Inspect lines and authorize postings.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={loadPending}
            disabled={loading}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Review</span>
            <div className="text-2xl font-bold text-amber-700 mt-1 font-mono">{pendingCount}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Awaiting Reviewer sign-off</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved (Ready to Post)</span>
            <div className="text-2xl font-bold text-blue-700 mt-1 font-mono">{approvedCount}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Ready for general ledger posting</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
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
                    Loading pending approvals...
                  </td>
                </tr>
              ) : journals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <span>All clear! No journal entries currently pending review for this entity.</span>
                  </td>
                </tr>
              ) : (
                journals.map((je) => (
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
                      {je.status === 'SUBMITTED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Pending Review
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Approved
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => openDetail(je.id)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>

                        {je.status === 'SUBMITTED' && isReviewer && (
                          <>
                            <button
                              onClick={() => setRejectingId(je.id)}
                              title="Reject Journal"
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-semibold text-[11px] flex items-center space-x-0.5"
                            >
                              <Ban className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                            <button
                              onClick={() => handleApprove(je.id)}
                              title="Approve Journal"
                              className="px-2.5 py-1 bg-[#390003] hover:bg-[#55080E] text-white rounded font-semibold text-[11px] flex items-center space-x-1"
                              className="px-2.5 py-1 bg-[#781019] hover:bg-[#600C13] text-white rounded font-semibold text-[11px] flex items-center space-x-1 cursor-pointer transition-colors shadow-xs"
                            >
                              <Check className="w-3 h-3 text-[#E6B676]" />
                              <span>Approve</span>
                            </button>
                          </>
                        )}

                        {je.status === 'APPROVED' && isReviewer && (
                          <button
                            onClick={() => handlePost(je.id)}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-[11px] flex items-center space-x-1"
                          >
                            <ShieldCheck className="w-3 h-3 text-[#E6B676]" />
                            <span>Post</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedJournal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-mono">
                  Inspect {selectedJournal.entry_number}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">{selectedJournal.description}</p>
              </div>
              <button onClick={() => setSelectedJournal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

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

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedJournal(null)}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Close
              </button>

              {selectedJournal.status === 'SUBMITTED' && isReviewer && (
                <>
                  <button
                    onClick={() => setRejectingId(selectedJournal.id)}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold"
                  >
                    Reject Voucher
                  </button>
                  <button
                    onClick={() => handleApprove(selectedJournal.id)}
                    className="px-3 py-1.5 bg-[#390003] text-white rounded-lg text-xs font-semibold"
                    className="px-3.5 py-1.5 bg-[#781019] hover:bg-[#600C13] text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                  >
                    Authorize & Approve
                  </button>
                </>
              )}

              {selectedJournal.status === 'APPROVED' && isReviewer && (
                <button
                  onClick={() => handlePost(selectedJournal.id)}
                  className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold"
                >
                  Post to General Ledger
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reject Journal Entry</h3>
            <p className="text-xs text-slate-600">
              Enter the reason for rejection. This will be permanently recorded in the audit trail.
            </p>
            <textarea
              required
              rows={3}
              placeholder="e.g. Account misclassification, needs vendor invoice attachment..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-1 focus:ring-rose-600 text-xs text-slate-900"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
