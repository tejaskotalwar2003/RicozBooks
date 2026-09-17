import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  X, 
  RotateCcw, 
  ShieldCheck,
  Eye,
  Check,
  Ban
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  accountingApi, 
  JournalEntry, 
  JournalStatus, 
  Account 
} from '../services/accountingApi';

const STATUS_FILTERS: { label: string; value: JournalStatus | 'ALL' }[] = [
  { label: 'All Vouchers', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Posted', value: 'POSTED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Reversed', value: 'REVERSED' },
];

interface FormLine {
  account_id: number;
  description: string;
  debit: string;
  credit: string;
}

export const JournalEntries: React.FC = () => {
  const { activeEntity, user } = useAuth();
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<JournalStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  // New Journal Modal
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [exchangeRate, setExchangeRate] = useState('1.0');
  const [lines, setLines] = useState<FormLine[]>([
    { account_id: 0, description: '', debit: '', credit: '' },
    { account_id: 0, description: '', debit: '', credit: '' }
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Journal Detail Modal
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Rejection Dialog
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Reversal Dialog
  const [reversingId, setReversingId] = useState<number | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  const isAccountant = user?.roles.includes('ACCOUNTANT') || user?.roles.includes('ADMIN');
  const isReviewer = user?.roles.includes('REVIEWER') || user?.roles.includes('ADMIN');
  const isAdmin = Boolean(user?.roles.includes('ADMIN'));

  const loadData = async () => {
    if (!activeEntity) return;
    setLoading(true);
    try {
      const [journalsData, accountsData] = await Promise.all([
        accountingApi.getJournalEntries({
          entity_id: activeEntity.id,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          search: search.trim() || undefined,
        }),
        accountingApi.getAccounts({
          entity_id: activeEntity.id,
        })
      ]);
      setJournals(journalsData);
      setAccounts(accountsData.filter(a => a.is_active));
      setCurrency(activeEntity.base_currency);
    } catch (err) {
      console.error('Failed to load journals or accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeEntity?.id, statusFilter, search]);

  // Balance Calculations for Form
  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.001 && totalDebit > 0;

  const handleAddLine = () => {
    setLines([...lines, { account_id: 0, description: '', debit: '', credit: '' }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, idx) => idx !== index));
  };

  const handleLineChange = (index: number, field: keyof FormLine, value: string) => {
    const updated = [...lines];
    if (field === 'account_id') {
      updated[index].account_id = parseInt(value, 10) || 0;
    } else {
      updated[index][field] = value;
      // If user enters debit, clear credit on that line, and vice-versa
      if (field === 'debit' && parseFloat(value) > 0) {
        updated[index].credit = '';
      } else if (field === 'credit' && parseFloat(value) > 0) {
        updated[index].debit = '';
      }
    }
    setLines(updated);
  };

  const handleSaveJournal = async (saveAsDraft: boolean) => {
    if (!activeEntity) return;
    setFormError(null);

    // Basic client validation
    if (!description.trim()) {
      setFormError('Please enter an entry description.');
      return;
    }
    const hasZeroAccount = lines.some(l => l.account_id === 0);
    if (hasZeroAccount) {
      setFormError('Please select a valid account for every line.');
      return;
    }

    if (!saveAsDraft && !isBalanced) {
      setFormError(`Cannot submit unbalanced journal. Total Debit (${totalDebit.toFixed(2)}) must equal Total Credit (${totalCredit.toFixed(2)}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      await accountingApi.createJournalEntry({
        entity_id: activeEntity.id,
        entry_date: entryDate,
        reference: reference.trim() || undefined,
        description: description.trim(),
        currency,
        exchange_rate: parseFloat(exchangeRate) || 1.0,
        save_as_draft: saveAsDraft,
        lines: lines.map(l => ({
          account_id: l.account_id,
          description: l.description.trim() || undefined,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
        })),
      });

      setIsNewOpen(false);
      setDescription('');
      setReference('');
      setLines([
        { account_id: 0, description: '', debit: '', credit: '' },
        { account_id: 0, description: '', debit: '', credit: '' }
      ]);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save journal voucher.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openJournalDetail = async (id: number) => {
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

  const handleApprove = async (id: number) => {
    try {
      await accountingApi.approveJournal(id, 'Approved by Reviewer');
      loadData();
      if (selectedJournal?.id === id) openJournalDetail(id);
    } catch (err: any) {
      alert(err.message || 'Approval failed.');
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingId || !rejectionReason.trim()) {
      alert('Please provide a specific rejection reason.');
      return;
    }
    try {
      await accountingApi.rejectJournal(rejectingId, rejectionReason.trim());
      setRejectingId(null);
      setRejectionReason('');
      loadData();
      if (selectedJournal?.id === rejectingId) openJournalDetail(rejectingId);
    } catch (err: any) {
      alert(err.message || 'Rejection failed.');
    }
  };

  const handlePost = async (id: number) => {
    try {
      await accountingApi.postJournal(id);
      loadData();
      if (selectedJournal?.id === id) openJournalDetail(id);
    } catch (err: any) {
      alert(err.message || 'Posting failed.');
    }
  };

  const handleReverseConfirm = async () => {
    if (!reversingId) return;
    try {
      await accountingApi.reverseJournal(reversingId, reversalReason.trim() || undefined);
      setReversingId(null);
      setReversalReason('');
      loadData();
      setSelectedJournal(null);
    } catch (err: any) {
      alert(err.message || 'Reversal failed.');
    }
  };

  const getStatusBadge = (status: JournalStatus) => {
    switch (status) {
      case 'POSTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Posted</span>;
      case 'APPROVED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Approved</span>;
      case 'SUBMITTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Pending Review</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Rejected</span>;
      case 'REVERSED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Reversed</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">Draft</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-6 h-6 text-[#781019]" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Journal Entries
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Double-entry financial vouchers for <strong className="text-slate-800">{activeEntity?.name}</strong>. Strict debit=credit validation.
          </p>
        </div>

        {isAccountant && (
          <button
            onClick={() => setIsNewOpen(true)}
            className="px-4 py-2 bg-[#390003] hover:bg-[#55080E] text-white text-xs font-semibold rounded-lg shadow-sm border border-[#781019] flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4 text-[#E6B676]" />
            <span>+ New Journal Entry</span>
          </button>
        )}
      </div>

      {/* FILTERS & SEARCH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        
        {/* Status Filters */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === f.value
                  ? 'bg-[#390003] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search JE #, ref, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#781019] bg-slate-50 text-slate-800"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>

      </div>

      {/* JOURNALS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-3 px-4 w-32">JE Number</th>
                <th className="py-3 px-4 w-28">Date</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Created By</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading journal vouchers...
                  </td>
                </tr>
              ) : journals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No journal entries found. Click "+ New Journal Entry" to record your first transaction.
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
                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      {je.reference || '—'}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900 max-w-sm truncate" title={je.description}>
                      {je.description}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {je.created_by_name || 'Finance User'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold tnum text-slate-900">
                      {activeEntity?.base_currency === 'USD' ? '$' : (activeEntity?.base_currency === 'GBP' ? '£' : '₹')}
                      {Number(je.total_debit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {getStatusBadge(je.status)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => openJournalDetail(je.id)}
                        className="p-1 text-slate-600 hover:text-[#781019] rounded hover:bg-slate-100 font-semibold inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="text-[11px]">View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CREATE JOURNAL ENTRY (STRICT DOUBLE-ENTRY FORM) */}
      {isNewOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-5 my-4 sm:my-8 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Journal Entry</h3>
                <p className="text-[11px] text-slate-500">
                  Enter balanced double-entry lines for {activeEntity?.name}.
                </p>
              </div>
              <button onClick={() => setIsNewOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Header Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Entry Date *</label>
                <input
                  type="date"
                  required
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded-lg border-slate-300 focus:ring-1 focus:ring-[#781019] text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reference / PO</label>
                <input
                  type="text"
                  placeholder="e.g. INV-8891"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded-lg border-slate-300 focus:ring-1 focus:ring-[#781019] text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Currency</label>
                <input
                  type="text"
                  disabled
                  value={currency}
                  className="w-full px-2.5 py-1.5 border rounded-lg border-slate-200 bg-slate-100 font-mono text-slate-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Exchange Rate</label>
                <input
                  type="number"
                  step="0.0001"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded-lg border-slate-300 focus:ring-1 focus:ring-[#781019] text-slate-900 font-mono"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">Journal Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly cloud hosting prepayment and amortized expense"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg border-slate-300 focus:ring-1 focus:ring-[#781019] text-slate-900"
                />
              </div>
            </div>

            {/* Dynamic Lines Table */}
            <div className="border border-slate-200 rounded-xl overflow-x-auto text-xs">
              <div className="min-w-[560px]">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 font-semibold text-slate-700 grid grid-cols-12 gap-2 items-center">
                <span className="col-span-4">Account</span>
                <span className="col-span-4">Description</span>
                <span className="col-span-2 text-right">Debit ({currency})</span>
                <span className="col-span-2 text-right">Credit ({currency})</span>
              </div>

              <div className="divide-y divide-slate-100 p-2 space-y-2">
                {lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    {/* Account Select */}
                    <div className="col-span-4">
                      <select
                        aria-label={`Account line ${idx + 1}`}
                        value={line.account_id}
                        onChange={(e) => handleLineChange(idx, 'account_id', e.target.value)}
                        className="w-full px-2 py-1.5 border rounded-md border-slate-300 focus:ring-1 focus:ring-[#781019] text-xs bg-white text-slate-900 font-medium"
                      >
                        <option value={0}>-- Select Account --</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Description */}
                    <div className="col-span-4">
                      <input
                        type="text"
                        placeholder="Line memo..."
                        value={line.description}
                        onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                        className="w-full px-2 py-1.5 border rounded-md border-slate-300 focus:ring-1 focus:ring-[#781019] text-xs text-slate-800"
                      />
                    </div>

                    {/* Debit */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={line.debit}
                        onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                        className="w-full px-2 py-1.5 border rounded-md border-slate-300 focus:ring-1 focus:ring-[#781019] text-xs text-right font-mono font-semibold text-slate-900 tnum"
                      />
                    </div>

                    {/* Credit & Remove */}
                    <div className="col-span-2 flex items-center space-x-1">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={line.credit}
                        onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                        className="w-full px-2 py-1.5 border rounded-md border-slate-300 focus:ring-1 focus:ring-[#781019] text-xs text-right font-mono font-semibold text-slate-900 tnum"
                      />
                      {lines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="px-3 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-md font-semibold text-xs flex items-center space-x-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line</span>
                </button>

                {/* Double Entry Totals & Verification Box */}
                <div className="flex items-center space-x-4 font-mono text-xs">
                  <div>
                    <span className="text-slate-500 mr-1.5">Total Dr:</span>
                    <span className="font-bold text-slate-900 tnum">
                      {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 mr-1.5">Total Cr:</span>
                    <span className="font-bold text-slate-900 tnum">
                      {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Double-Entry Validation Banner */}
            <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
              isBalanced 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center space-x-2">
                {isBalanced ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span className="font-semibold">
                  {isBalanced 
                    ? 'Balanced Voucher: Total Debit equals Total Credit. Ready for review or submission.'
                    : `Unbalanced: Out of balance by ${difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}. Double-entry rule requires Debit = Credit.`
                  }
                </span>
              </div>
              <span className="font-mono font-bold">
                Diff: {difference.toFixed(2)}
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold text-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveJournal(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold text-xs disabled:opacity-50"
              >
                Save as Draft
              </button>

              <button
                type="button"
                disabled={isSubmitting || !isBalanced}
                onClick={() => handleSaveJournal(false)}
                className="px-4 py-2 bg-[#390003] hover:bg-[#55080E] text-white rounded-lg font-semibold text-xs disabled:opacity-50 flex items-center space-x-1.5"
              >
                <span>Submit for Review</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#E6B676]" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: VIEW JOURNAL DETAILS & APPROVAL TRAIL */}
      {selectedJournal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-bold text-slate-900 font-mono">
                    {selectedJournal.entry_number}
                  </h3>
                  {getStatusBadge(selectedJournal.status)}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {selectedJournal.description}
                </p>
              </div>
              <button onClick={() => setSelectedJournal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Rejection Banner */}
            {selectedJournal.status === 'REJECTED' && selectedJournal.rejection_reason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900">
                <span className="font-bold">Rejection Reason:</span> {selectedJournal.rejection_reason}
              </div>
            )}

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">Date</span>
                <span className="font-bold text-slate-800 font-mono">{selectedJournal.entry_date}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Reference</span>
                <span className="font-bold text-slate-800 font-mono">{selectedJournal.reference || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Created By</span>
                <span className="font-bold text-slate-800">{selectedJournal.created_by_name || 'Accountant'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Posted At</span>
                <span className="font-bold text-slate-800 font-mono">
                  {selectedJournal.posted_at ? new Date(selectedJournal.posted_at).toLocaleString() : 'Not Posted'}
                </span>
              </div>
            </div>

            {/* Lines Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3 w-12">#</th>
                    <th className="py-2.5 px-3">Account</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Debit ({selectedJournal.currency})</th>
                    <th className="py-2.5 px-3 text-right">Credit ({selectedJournal.currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {selectedJournal.lines?.map((l) => (
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
                    <td colSpan={3} className="py-2.5 px-3 text-right uppercase tracking-wider">Total Balancing Amount:</td>
                    <td className="py-2.5 px-3 text-right tnum">
                      {Number(selectedJournal.total_debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right tnum">
                      {Number(selectedJournal.total_credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Approval Audit Trail */}
            {selectedJournal.approvals && selectedJournal.approvals.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Approval & Audit History
                </span>
                <div className="space-y-1.5">
                  {selectedJournal.approvals.map((app) => (
                    <div key={app.id} className="flex items-center justify-between text-slate-600">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800">{app.action}</span>
                        <span>by {app.reviewer_name || 'System'}</span>
                        {app.comments && <span className="text-slate-500 italic">— "{app.comments}"</span>}
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">
                        {new Date(app.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contextual Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">
                Double-Entry Ledger Status: <strong className="text-slate-800">{selectedJournal.status}</strong>
              </span>

              <div className="flex items-center space-x-2">
                {/* Submit button for Draft */}
                {(selectedJournal.status === 'DRAFT' || selectedJournal.status === 'REJECTED') && isAccountant && (
                  <button
                    onClick={async () => {
                      await accountingApi.submitJournal(selectedJournal.id);
                      loadData();
                      openJournalDetail(selectedJournal.id);
                    }}
                    className="px-3 py-1.5 bg-[#390003] hover:bg-[#55080E] text-white rounded-lg text-xs font-semibold"
                  >
                    Submit for Review
                  </button>
                )}

                {/* Reviewer actions for Submitted */}
                {selectedJournal.status === 'SUBMITTED' && isReviewer && (
                  <>
                    <button
                      onClick={() => setRejectingId(selectedJournal.id)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleApprove(selectedJournal.id)}
                      className="px-3 py-1.5 bg-[#390003] hover:bg-[#55080E] text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
                    >
                      <Check className="w-3.5 h-3.5 text-[#E6B676]" />
                      <span>Approve</span>
                    </button>
                  </>
                )}

                {/* Post to ledger action for Approved */}
                {selectedJournal.status === 'APPROVED' && (isReviewer || isAdmin) && (
                  <button
                    onClick={() => handlePost(selectedJournal.id)}
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-sm"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#E6B676]" />
                    <span>Post to Ledger</span>
                  </button>
                )}

                {/* Reverse action for Posted */}
                {selectedJournal.status === 'POSTED' && isAdmin && (
                  <button
                    onClick={() => setReversingId(selectedJournal.id)}
                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-semibold flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reverse Entry</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: REJECTION REASON DIALOG */}
      {rejectingId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reject Journal Entry</h3>
            <p className="text-xs text-slate-600">
              Please enter the specific reason for rejecting this voucher. The creator will be notified to revise it.
            </p>
            <textarea
              required
              rows={3}
              placeholder="e.g. Missing supplier tax invoice, incorrect account assignment..."
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

      {/* MODAL: REVERSAL ENTRY REASON DIALOG */}
      {reversingId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reverse Posted Journal</h3>
            <p className="text-xs text-slate-600">
              This will create an automated mirror voucher with debits and credits swapped, immediately posted to the general ledger.
            </p>
            <input
              type="text"
              placeholder="Reason for reversal (e.g. Billing correction)..."
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-1 focus:ring-purple-600 text-xs text-slate-900"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => { setReversingId(null); setReversalReason(''); }}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReverseConfirm}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold"
              >
                Post Reversal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
