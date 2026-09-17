import React, { useEffect, useState, useMemo } from 'react';
import { 
  BookOpen, 
  Calendar, 
  Download, 
  Printer, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  Scale, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  ChevronRight,
  Layers,
  Search,
  X,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  accountingApi, 
  Account, 
  AccountLedgerResponse, 
  LedgerSummaryResponse, 
  JournalEntry 
} from '../services/accountingApi';

type ViewMode = 'detail' | 'summary';

export const GeneralLedger: React.FC = () => {
  const { activeEntity } = useAuth();

  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('detail');

  // Accounts List
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  // Date Filters
  const getDefaultDates = () => {
    const today = new Date();
    const year = today.getFullYear();
    const startOfFY = today.getMonth() >= 3 
      ? new Date(year, 3, 1) 
      : new Date(year - 1, 3, 1);
    
    return {
      start: startOfFY.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
    };
  };

  const [dateRange, setDateRange] = useState(getDefaultDates());
  const [datePreset, setDatePreset] = useState<string>('fy');
  const [includeUnposted, setIncludeUnposted] = useState<boolean>(false);

  // Data states
  const [ledgerDetail, setLedgerDetail] = useState<AccountLedgerResponse | null>(null);
  const [ledgerSummary, setLedgerSummary] = useState<LedgerSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Journal Drawer State
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [loadingJournal, setLoadingJournal] = useState<boolean>(false);

  // Account search filter
  const [accountSearch, setAccountSearch] = useState<string>('');

  // Load Accounts on entity change
  useEffect(() => {
    if (!activeEntity) return;

    const loadAccounts = async () => {
      try {
        const accs = await accountingApi.getAccounts({ entity_id: activeEntity.id, is_active: true });
        setAccounts(accs);
        if (accs.length > 0 && !selectedAccountId) {
          // Default to Cash (1000) or first account
          const defaultAcc = accs.find(a => a.code === '1000') || accs[0];
          setSelectedAccountId(defaultAcc.id);
        }
      } catch (err: any) {
        console.error('Failed to load accounts:', err);
      }
    };

    loadAccounts();
  }, [activeEntity]);

  // Handle Preset Date Selection
  const applyDatePreset = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    const year = today.getFullYear();

    if (preset === 'this-month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const end = today.toISOString().split('T')[0];
      setDateRange({ start, end });
    } else if (preset === 'last-month') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
      const end = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
      setDateRange({ start, end });
    } else if (preset === 'this-quarter') {
      const currentQuarter = Math.floor(today.getMonth() / 3);
      const start = new Date(year, currentQuarter * 3, 1).toISOString().split('T')[0];
      const end = today.toISOString().split('T')[0];
      setDateRange({ start, end });
    } else if (preset === 'fy') {
      const startOfFY = today.getMonth() >= 3 
        ? new Date(year, 3, 1) 
        : new Date(year - 1, 3, 1);
      setDateRange({
        start: startOfFY.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      });
    }
  };

  // Load Ledger Data
  const fetchLedger = async () => {
    if (!activeEntity) return;
    setLoading(true);
    setError(null);

    try {
      if (viewMode === 'detail' && selectedAccountId) {
        const data = await accountingApi.getAccountLedger({
          account_id: selectedAccountId,
          entity_id: activeEntity.id,
          start_date: dateRange.start,
          end_date: dateRange.end,
          include_unposted: includeUnposted,
        });
        setLedgerDetail(data);
      } else if (viewMode === 'summary') {
        const data = await accountingApi.getLedgerSummary({
          entity_id: activeEntity.id,
          start_date: dateRange.start,
          end_date: dateRange.end,
          include_unposted: includeUnposted,
        });
        setLedgerSummary(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load ledger data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [activeEntity, selectedAccountId, dateRange, includeUnposted, viewMode]);

  // Open Journal Drawer
  const handleOpenJournal = async (journalId: number) => {
    setLoadingJournal(true);
    try {
      const je = await accountingApi.getJournalEntryDetail(journalId);
      setSelectedJournal(je);
    } catch (err) {
      console.error('Failed to load journal detail:', err);
    } finally {
      setLoadingJournal(false);
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    if (!activeEntity || !selectedAccountId) return;
    try {
      await accountingApi.downloadLedgerCsv({
        account_id: selectedAccountId,
        entity_id: activeEntity.id,
        start_date: dateRange.start,
        end_date: dateRange.end,
        include_unposted: includeUnposted,
      });
    } catch (err: any) {
      alert('Error exporting ledger: ' + err.message);
    }
  };

  // Group accounts by type for the selector
  const groupedAccounts = useMemo(() => {
    const map: Record<string, Account[]> = {
      ASSET: [],
      LIABILITY: [],
      EQUITY: [],
      REVENUE: [],
      EXPENSE: [],
    };
    accounts
      .filter(a => 
        !accountSearch || 
        a.code.toLowerCase().includes(accountSearch.toLowerCase()) || 
        a.name.toLowerCase().includes(accountSearch.toLowerCase())
      )
      .forEach(a => {
        if (map[a.account_type]) map[a.account_type].push(a);
      });
    return map;
  }, [accounts, accountSearch]);

  const currencySymbol = activeEntity?.base_currency === 'INR' ? '₹' : activeEntity?.base_currency === 'USD' ? '$' : '£';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#260002] text-[#E6B676]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                General Ledger
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed account statements, running debit/credit balances, and journal voucher drill-down.
              </p>
            </div>
          </div>
        </div>

        {/* TOP CONTROLS & TAB SWITCHER */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/70 text-xs font-semibold">
            <button
              onClick={() => setViewMode('detail')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                viewMode === 'detail'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Account Detail Ledger
            </button>
            <button
              onClick={() => setViewMode('summary')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                viewMode === 'summary'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Accounts Matrix
            </button>
          </div>

          {viewMode === 'detail' && (
            <button
              onClick={handleExportCsv}
              disabled={loading || !ledgerDetail}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* FILTER & SELECTION BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* Account Selector (Detail View Only) */}
          {viewMode === 'detail' && (
            <div className="md:col-span-5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Select Account
              </label>
              <select
                value={selectedAccountId || ''}
                onChange={(e) => setSelectedAccountId(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#781019]"
              >
                {Object.entries(groupedAccounts).map(([category, accList]) => (
                  <optgroup key={category} label={category}>
                    {accList.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} — {acc.name} ({acc.normal_balance})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}

          {/* Quick Date Presets */}
          <div className={viewMode === 'detail' ? "md:col-span-4" : "md:col-span-6"}>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Period Preset
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'this-month', label: 'This Month' },
                { id: 'last-month', label: 'Last Month' },
                { id: 'this-quarter', label: 'This Quarter' },
                { id: 'fy', label: 'FY to Date' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyDatePreset(p.id)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium border transition-colors ${
                    datePreset === p.id
                      ? 'bg-[#260002] text-[#E6B676] border-[#260002]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Inputs */}
          <div className={viewMode === 'detail' ? "md:col-span-3" : "md:col-span-6"}>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Custom Range
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => {
                  setDateRange(prev => ({ ...prev, start: e.target.value }));
                  setDatePreset('custom');
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#781019]"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => {
                  setDateRange(prev => ({ ...prev, end: e.target.value }));
                  setDatePreset('custom');
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#781019]"
              />
            </div>
          </div>

        </div>

        {/* Unposted Preview Toggle */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <label className="flex items-center space-x-2 text-xs text-slate-700 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={includeUnposted}
              onChange={(e) => setIncludeUnposted(e.target.checked)}
              className="rounded text-[#781019] focus:ring-[#781019] w-4 h-4"
            />
            <span>Include unposted vouchers (Drafts excluded; Submitted & Approved vouchers included)</span>
          </label>

          {includeUnposted && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <AlertCircle className="w-3 h-3 text-amber-600" />
              <span>Preview Mode Active</span>
            </span>
          )}
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DETAIL VIEW: SINGLE ACCOUNT STATEMENT */}
      {/* ========================================================================= */}
      {viewMode === 'detail' && ledgerDetail && (
        <div className="space-y-6">
          
          {/* KPI CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Opening Balance
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-extrabold text-slate-900">
                  {currencySymbol} {Number(ledgerDetail.opening_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                  {ledgerDetail.opening_balance_type}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">As of {ledgerDetail.start_date}</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Period Debits
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-extrabold text-emerald-700">
                  + {currencySymbol} {Number(ledgerDetail.period_debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800">
                  DR
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Total additions/draws</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Period Credits
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-extrabold text-rose-700">
                  - {currencySymbol} {Number(ledgerDetail.period_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-800">
                  CR
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Total reductions/credits</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Net Movement
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className={`text-lg font-extrabold ${Number(ledgerDetail.net_movement) >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
                  {Number(ledgerDetail.net_movement) >= 0 ? '+' : ''}{currencySymbol} {Number(ledgerDetail.net_movement).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">During selected range</div>
            </div>

            <div className="bg-[#260002] text-white p-3.5 rounded-xl border border-[#390003] shadow-md">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#EEC68B]">
                Closing Balance
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-extrabold text-white">
                  {currencySymbol} {Number(ledgerDetail.closing_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#390003] text-[#E6B676] border border-[#C58B3E]/30">
                  {ledgerDetail.closing_balance_type}
                </span>
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5">As of {ledgerDetail.end_date}</div>
            </div>

          </div>

          {/* LEDGER TRANSACTIONS TABLE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {ledgerDetail.account_code} — {ledgerDetail.account_name}
                </h2>
                <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                  <span>Category: <strong>{ledgerDetail.account_type}</strong></span>
                  <span>•</span>
                  <span>Normal Balance: <strong>{ledgerDetail.normal_balance}</strong></span>
                  <span>•</span>
                  <span>{ledgerDetail.lines.length} transaction(s) recorded</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Voucher / Journal #</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Description / Narration</th>
                    <th className="py-3 px-4 text-right">Debit ({ledgerDetail.currency})</th>
                    <th className="py-3 px-4 text-right">Credit ({ledgerDetail.currency})</th>
                    <th className="py-3 px-4 text-right">Running Balance</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  
                  {/* OPENING ROW */}
                  <tr className="bg-slate-50/60 font-semibold text-slate-600 italic">
                    <td className="py-2.5 px-4 font-mono text-[11px]">{ledgerDetail.start_date}</td>
                    <td className="py-2.5 px-4">—</td>
                    <td className="py-2.5 px-4">—</td>
                    <td className="py-2.5 px-4">Opening Balance Brought Forward</td>
                    <td className="py-2.5 px-4 text-right">—</td>
                    <td className="py-2.5 px-4 text-right">—</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-900 font-bold">
                      {currencySymbol} {Number(ledgerDetail.opening_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {ledgerDetail.opening_balance_type}
                    </td>
                    <td className="py-2.5 px-4 text-center">—</td>
                  </tr>

                  {/* TRANSACTION ROWS */}
                  {ledgerDetail.lines.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No transactions recorded for this account in the selected date range.
                      </td>
                    </tr>
                  ) : (
                    ledgerDetail.lines.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                          {line.entry_date}
                        </td>
                        <td className="py-2.5 px-4">
                          <button
                            onClick={() => handleOpenJournal(line.journal_entry_id)}
                            className="font-mono font-bold text-[#781019] hover:underline flex items-center space-x-1"
                          >
                            <span>{line.entry_number}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                          </button>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-500">
                          {line.reference || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 max-w-xs truncate" title={line.description || line.journal_description || ''}>
                          {line.description || line.journal_description || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-medium">
                          {Number(line.debit) > 0 ? (
                            <span className="text-slate-900 font-bold">
                              {Number(line.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-medium">
                          {Number(line.credit) > 0 ? (
                            <span className="text-slate-900 font-bold">
                              {Number(line.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {currencySymbol} {Number(line.running_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          <span className={`ml-1 text-[10px] px-1 py-0.5 rounded ${
                            line.balance_type === 'DR' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                          }`}>
                            {line.balance_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            line.status === 'POSTED'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {line.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* CLOSING ROW */}
                  <tr className="bg-slate-100/70 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td className="py-3 px-4 font-mono text-[11px]">{ledgerDetail.end_date}</td>
                    <td className="py-3 px-4 font-semibold uppercase tracking-wider text-[11px]">Period Totals</td>
                    <td className="py-3 px-4">—</td>
                    <td className="py-3 px-4">Closing Balance Carried Forward</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-800">
                      {currencySymbol} {Number(ledgerDetail.period_debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-800">
                      {currencySymbol} {Number(ledgerDetail.period_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900">
                      {currencySymbol} {Number(ledgerDetail.closing_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {ledgerDetail.closing_balance_type}
                    </td>
                    <td className="py-3 px-4 text-center">—</td>
                  </tr>

                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUMMARY MATRIX VIEW: ALL ACCOUNTS MATRIX */}
      {/* ========================================================================= */}
      {viewMode === 'summary' && ledgerSummary && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">All Accounts Ledger Summary Matrix</h2>
              <p className="text-xs text-slate-500">
                Period: {ledgerSummary.start_date} to {ledgerSummary.end_date} ({ledgerSummary.currency})
              </p>
            </div>
            <div className="text-xs text-slate-500">
              Total Accounts: <strong>{ledgerSummary.accounts.length}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Account Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Opening Balance</th>
                  <th className="py-3 px-4 text-right">Period Debit</th>
                  <th className="py-3 px-4 text-right">Period Credit</th>
                  <th className="py-3 px-4 text-right">Closing Balance</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {ledgerSummary.accounts.map((acc) => (
                  <tr key={acc.account_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                      {acc.account_code}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-800">
                      {acc.account_name}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        acc.account_type === 'ASSET' ? 'bg-sky-50 text-sky-800' :
                        acc.account_type === 'LIABILITY' ? 'bg-amber-50 text-amber-800' :
                        acc.account_type === 'EQUITY' ? 'bg-purple-50 text-purple-800' :
                        acc.account_type === 'REVENUE' ? 'bg-emerald-50 text-emerald-800' :
                        'bg-rose-50 text-rose-800'
                      }`}>
                        {acc.account_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">
                      {currencySymbol} {Number(acc.opening_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                      <span className="text-[10px] text-slate-400">{acc.opening_balance_type}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-700 font-medium">
                      {Number(acc.period_debit) > 0 ? `${currencySymbol} ${Number(acc.period_debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-rose-700 font-medium">
                      {Number(acc.period_credit) > 0 ? `${currencySymbol} ${Number(acc.period_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      {currencySymbol} {Number(acc.closing_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                      <span className="text-[10px] text-slate-500">{acc.closing_balance_type}</span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedAccountId(acc.account_id);
                          setViewMode('detail');
                        }}
                        className="text-[11px] font-bold text-[#781019] hover:underline"
                      >
                        View Ledger
                      </button>
                    </td>
                  </tr>
                ))}

                {/* GRAND TOTALS */}
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td colSpan={3} className="py-3 px-4 uppercase tracking-wider text-[11px]">
                    Grand Matrix Totals
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    Dr {currencySymbol} {Number(ledgerSummary.total_opening_debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}<br />
                    Cr {currencySymbol} {Number(ledgerSummary.total_opening_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-800">
                    {currencySymbol} {Number(ledgerSummary.total_period_debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-rose-800">
                    {currencySymbol} {Number(ledgerSummary.total_period_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    Dr {currencySymbol} {Number(ledgerSummary.total_closing_debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}<br />
                    Cr {currencySymbol} {Number(ledgerSummary.total_closing_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-center">—</td>
                </tr>

              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* JOURNAL DETAIL DRILL-DOWN MODAL */}
      {/* ========================================================================= */}
      {selectedJournal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-5 bg-[#260002] text-white flex items-center justify-between border-b border-[#390003]">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-[#1E0002] border border-[#C58B3E]/30 text-[#E6B676]">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold font-mono tracking-tight text-white">
                      {selectedJournal.entry_number}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#390003] text-[#EEC68B] border border-[#C58B3E]/40">
                      {selectedJournal.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    Voucher Date: {selectedJournal.entry_date} • Ref: {selectedJournal.reference || 'N/A'}
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setSelectedJournal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Narration / Business Purpose
                </label>
                <p className="text-sm font-medium text-slate-800 mt-1 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                  {selectedJournal.description}
                </p>
              </div>

              {/* Journal Line Items */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Double-Entry Ledger Lines
                </label>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Account Code & Name</th>
                        <th className="py-2.5 px-3">Line Description</th>
                        <th className="py-2.5 px-3 text-right">Debit ({selectedJournal.currency})</th>
                        <th className="py-2.5 px-3 text-right">Credit ({selectedJournal.currency})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedJournal.lines?.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono text-slate-400">{line.line_number || idx + 1}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {line.account_code ? `${line.account_code} — ` : ''}{line.account_name || `Account #${line.account_id}`}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{line.description || '—'}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {Number(line.debit) > 0 ? Number(line.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {Number(line.credit) > 0 ? Number(line.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                        <td colSpan={3} className="py-2.5 px-3 uppercase tracking-wider text-[11px]">
                          Voucher Balance Check (Strict Debit == Credit)
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                          {Number(selectedJournal.total_debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-800">
                          {Number(selectedJournal.total_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Approval History */}
              {selectedJournal.approvals && selectedJournal.approvals.length > 0 && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Maker-Checker Audit History
                  </label>
                  <div className="space-y-2">
                    {selectedJournal.approvals.map((app) => (
                      <div key={app.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800 font-mono">{app.action}</span>
                          <span className="text-slate-500 ml-2">— {app.comments || 'No comment'}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {new Date(app.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedJournal(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition-colors"
              >
                Close Drill-Down
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

