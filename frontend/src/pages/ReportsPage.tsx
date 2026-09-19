import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Scale, 
  Layers, 
  DollarSign,
  ArrowUpRight,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  accountingApi, 
  TrialBalanceResponse, 
  ProfitLossResponse, 
  BalanceSheetResponse 
} from '../services/accountingApi';

type ReportTab = 'trial-balance' | 'profit-loss' | 'balance-sheet';

export const ReportsPage: React.FC = () => {
  const { activeEntity } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ReportTab>('trial-balance');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date Range state
  const todayStr = new Date().toISOString().slice(0, 10);
  const curYear = new Date().getFullYear();
  const fyStart = new Date().getMonth() >= 3 ? `${curYear}-04-01` : `${curYear - 1}-04-01`;

  const [startDate, setStartDate] = useState(fyStart);
  const [endDate, setEndDate] = useState(todayStr);
  const [asOfDate, setAsOfDate] = useState(todayStr);
  const [includeUnposted, setIncludeUnposted] = useState(false);
  const [datePreset, setDatePreset] = useState<string>('fy');

  // Report Data States
  const [trialBalance, setTrialBalance] = useState<TrialBalanceResponse | null>(null);
  const [profitLoss, setProfitLoss] = useState<ProfitLossResponse | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetResponse | null>(null);

  const applyPreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    if (preset === 'this-month') {
      const start = new Date(y, m, 1).toISOString().slice(0, 10);
      setStartDate(start);
      setEndDate(todayStr);
      setAsOfDate(todayStr);
    } else if (preset === 'last-month') {
      const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
      const end = new Date(y, m, 0).toISOString().slice(0, 10);
      setStartDate(start);
      setEndDate(end);
      setAsOfDate(end);
    } else if (preset === 'this-quarter') {
      const qMonth = Math.floor(m / 3) * 3;
      const start = new Date(y, qMonth, 1).toISOString().slice(0, 10);
      setStartDate(start);
      setEndDate(todayStr);
      setAsOfDate(todayStr);
    } else if (preset === 'fy') {
      setStartDate(fyStart);
      setEndDate(todayStr);
      setAsOfDate(todayStr);
    }
  };

  const fetchReports = async () => {
    if (!activeEntity) return;
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'trial-balance') {
        const data = await accountingApi.getTrialBalance({
          entity_id: activeEntity.id,
          start_date: startDate,
          end_date: endDate,
          include_unposted: includeUnposted
        });
        setTrialBalance(data);
      } else if (activeTab === 'profit-loss') {
        const data = await accountingApi.getProfitLoss({
          entity_id: activeEntity.id,
          start_date: startDate,
          end_date: endDate,
          include_unposted: includeUnposted
        });
        setProfitLoss(data);
      } else if (activeTab === 'balance-sheet') {
        const data = await accountingApi.getBalanceSheet({
          entity_id: activeEntity.id,
          as_of_date: asOfDate,
          include_unposted: includeUnposted
        });
        setBalanceSheet(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeEntity?.id, activeTab, startDate, endDate, asOfDate, includeUnposted]);

  const handleExportCsv = async () => {
    if (!activeEntity) return;
    try {
      if (activeTab === 'trial-balance') {
        await accountingApi.downloadTrialBalanceCsv({
          entity_id: activeEntity.id,
          start_date: startDate,
          end_date: endDate,
          include_unposted: includeUnposted
        });
      } else if (activeTab === 'profit-loss') {
        await accountingApi.downloadProfitLossCsv({
          entity_id: activeEntity.id,
          start_date: startDate,
          end_date: endDate,
          include_unposted: includeUnposted
        });
      } else if (activeTab === 'balance-sheet') {
        await accountingApi.downloadBalanceSheetCsv({
          entity_id: activeEntity.id,
          as_of_date: asOfDate,
          include_unposted: includeUnposted
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to export CSV.');
    }
  };

  const currencySymbol = activeEntity?.base_currency === 'INR' ? '₹' : activeEntity?.base_currency === 'USD' ? '$' : '£';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#260002] text-[#E6B676]">
            <div className="p-2 rounded-lg bg-[#0B0F17] text-[#E6B676] border border-slate-800">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Financial Reports
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Official statements for <strong className="text-slate-800">{activeEntity?.name}</strong>. Calculated strictly from double-entry ledger transactions.
              </p>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handleExportCsv}
            disabled={loading}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* TAB SELECTOR */}
      <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('trial-balance')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
            activeTab === 'trial-balance'
              ? 'border-[#781019] text-[#781019] bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Trial Balance</span>
        </button>

        <button
          onClick={() => setActiveTab('profit-loss')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
            activeTab === 'profit-loss'
              ? 'border-[#781019] text-[#781019] bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Profit & Loss Statement</span>
        </button>

        <button
          onClick={() => setActiveTab('balance-sheet')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
            activeTab === 'balance-sheet'
              ? 'border-[#781019] text-[#781019] bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Balance Sheet</span>
        </button>
      </div>

      {/* FILTER & PERIOD CONTROL TOOLBAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* Presets */}
          <div className="md:col-span-6">
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
                  onClick={() => applyPreset(p.id)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium border transition-colors cursor-pointer ${
                    datePreset === p.id
                      ? 'bg-[#260002] text-[#E6B676] border-[#260002]'
                      ? 'bg-[#0B0F17] text-[#EEC68B] border-slate-800 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Pickers */}
          {activeTab !== 'balance-sheet' ? (
            <div className="md:col-span-6">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Date Range
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setDatePreset('custom'); }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#781019]"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setDatePreset('custom'); }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#781019]"
                />
              </div>
            </div>
          ) : (
            <div className="md:col-span-6">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Statement As Of Date
              </label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => { setAsOfDate(e.target.value); setDatePreset('custom'); }}
                className="w-full sm:w-64 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#781019]"
              />
            </div>
          )}

        </div>

        {/* Unposted Preview Toggle */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <label className="flex items-center space-x-2 text-xs text-slate-700 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={includeUnposted}
              onChange={(e) => setIncludeUnposted(e.target.checked)}
              className="rounded text-[#781019] focus:ring-[#781019] w-4 h-4 cursor-pointer"
            />
            <span>Include unposted vouchers (Drafts excluded; Submitted & Approved included for preview)</span>
          </label>

          {includeUnposted && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <AlertCircle className="w-3 h-3 text-amber-600" />
              <span>Preview Mode Active</span>
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="bg-white p-12 rounded-xl border border-slate-200 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#390003] border-t-[#E6B676] rounded-full animate-spin"></div>
          <div className="w-8 h-8 border-3 border-slate-300 border-t-[#781019] rounded-full animate-spin"></div>
          <span className="text-xs text-slate-500 font-semibold">Calculating financial statements from ledger...</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TRIAL BALANCE TAB */}
      {/* ========================================================================= */}
      {!loading && activeTab === 'trial-balance' && trialBalance && (
        <div className="space-y-4">
          
          {/* Verification Banner */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            trialBalance.is_balanced 
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
              : 'bg-rose-50/80 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-center space-x-2.5">
              {trialBalance.is_balanced ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider">
                  {trialBalance.is_balanced ? '✓ Trial Balance Verified (Debit == Credit)' : '⚠ Unbalanced Ledger Detected'}
                </div>
                <div className="text-xs text-slate-600">
                  Total Closing Debits: <strong>{currencySymbol} {Number(trialBalance.total_closing_debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> | Total Closing Credits: <strong>{currencySymbol} {Number(trialBalance.total_closing_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
            </div>

            <div className="text-xs font-mono font-bold px-3 py-1 rounded bg-white border border-slate-200">
              Difference: {currencySymbol} {Number(trialBalance.difference).toFixed(2)}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Account Name</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4 text-right">Opening Dr</th>
                    <th className="py-3 px-4 text-right">Opening Cr</th>
                    <th className="py-3 px-4 text-right">Period Dr</th>
                    <th className="py-3 px-4 text-right">Period Cr</th>
                    <th className="py-3 px-4 text-right">Closing Dr</th>
                    <th className="py-3 px-4 text-right">Closing Cr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {trialBalance.items.map((item) => (
                    <tr key={item.account_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-[#781019]">
                        <button
                          onClick={() => navigate(`/ledger`)}
                          title="View Account Ledger"
                          className="hover:underline flex items-center space-x-1 cursor-pointer"
                        >
                          <span>{item.account_code}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </button>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{item.account_name}</td>
                      <td className="py-2.5 px-4">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                          {item.account_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tnum">
                        {item.opening_debit > 0 ? Number(item.opening_debit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tnum">
                        {item.opening_credit > 0 ? Number(item.opening_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tnum text-slate-900 font-semibold">
                        {item.period_debit > 0 ? Number(item.period_debit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tnum text-slate-900 font-semibold">
                        {item.period_credit > 0 ? Number(item.period_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tnum font-bold text-[#260002]">
                      <td className="py-2.5 px-4 text-right font-mono tnum font-bold text-slate-900">
                        {item.closing_debit > 0 ? Number(item.closing_debit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tnum font-bold text-[#260002]">
                      <td className="py-2.5 px-4 text-right font-mono tnum font-bold text-slate-900">
                        {item.closing_credit > 0 ? Number(item.closing_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#1E0002] text-white font-bold border-t border-[#390003]">
                  <tr className="bg-[#0B0F17] text-white font-bold border-t border-slate-800">
                    <td colSpan={3} className="py-3 px-4 uppercase tracking-wider text-xs text-[#EEC68B]">Grand Totals</td>
                    <td className="py-3 px-4 text-right font-mono tnum text-xs">{currencySymbol} {Number(trialBalance.total_opening_debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right font-mono tnum text-xs">{currencySymbol} {Number(trialBalance.total_opening_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right font-mono tnum text-xs">{currencySymbol} {Number(trialBalance.total_period_debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right font-mono tnum text-xs">{currencySymbol} {Number(trialBalance.total_period_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right font-mono tnum text-sm text-[#E6B676]">{currencySymbol} {Number(trialBalance.total_closing_debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right font-mono tnum text-sm text-[#E6B676]">{currencySymbol} {Number(trialBalance.total_closing_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PROFIT & LOSS TAB */}
      {/* ========================================================================= */}
      {!loading && activeTab === 'profit-loss' && profitLoss && (
        <div className="space-y-6">
          
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</span>
              <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
                {currencySymbol} {Number(profitLoss.total_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-emerald-600 font-semibold mt-1">Operating software & services</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expenses</span>
              <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
                {currencySymbol} {Number(profitLoss.total_expense).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-500 font-semibold mt-1">Payroll, rent, infrastructure</div>
            </div>

            <div className={`p-5 rounded-xl border shadow-xs ${
              profitLoss.net_profit_loss >= 0 
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                : 'bg-rose-50/70 border-rose-200 text-rose-900'
            }`}>
              <span className="text-xs font-semibold uppercase tracking-wider">Net Profit / (Loss)</span>
              <div className="text-2xl font-extrabold mt-2 font-mono">
                {currencySymbol} {Number(profitLoss.net_profit_loss).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-semibold mt-1">
                {profitLoss.net_profit_loss >= 0 ? 'Profitable Period' : 'Operating Deficit'}
              </div>
            </div>

            <div className="bg-[#260002] text-white p-5 rounded-xl border border-[#390003] shadow-md">
            <div className="bg-[#0B0F17] text-white p-5 rounded-xl border border-slate-800 shadow-md">
              <span className="text-xs font-semibold text-[#EEC68B] uppercase tracking-wider">Net Margin %</span>
              <div className="text-2xl font-extrabold text-white mt-2 font-mono">
                {Number(profitLoss.net_margin_pct).toFixed(2)}%
              </div>
              <div className="text-xs text-slate-300 font-semibold mt-1">of Total Revenue</div>
            </div>
          </div>

          {/* Detailed Statement Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 uppercase tracking-wider">
              Statement of Profit and Loss (Income Statement)
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {/* Revenue Section */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between font-bold text-slate-900 uppercase tracking-wider text-xs border-b pb-2">
                  <span>Operating Revenue</span>
                  <span>Amount ({profitLoss.currency})</span>
                </div>
                {profitLoss.revenue_accounts.length === 0 ? (
                  <div className="text-slate-400 italic py-2">No revenue recognized in this period.</div>
                ) : (
                  profitLoss.revenue_accounts.map((acc) => (
                    <div key={acc.account_id} className="flex items-center justify-between py-1 text-slate-700">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-slate-500">{acc.account_code}</span>
                        <span className="font-medium text-slate-900">{acc.account_name}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-[11px] text-slate-400 font-mono">{acc.percentage_of_revenue}%</span>
                        <span className="font-mono font-semibold text-slate-900">{currencySymbol} {Number(acc.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  ))
                )}
                <div className="flex items-center justify-between pt-2 border-t font-bold text-slate-900">
                  <span>Total Operating Revenue</span>
                  <span className="font-mono">{currencySymbol} {Number(profitLoss.total_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Expense Section */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between font-bold text-slate-900 uppercase tracking-wider text-xs border-b pb-2">
                  <span>Operating Expenses</span>
                  <span>Amount ({profitLoss.currency})</span>
                </div>
                {profitLoss.expense_accounts.length === 0 ? (
                  <div className="text-slate-400 italic py-2">No expenses recorded in this period.</div>
                ) : (
                  profitLoss.expense_accounts.map((acc) => (
                    <div key={acc.account_id} className="flex items-center justify-between py-1 text-slate-700">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-slate-500">{acc.account_code}</span>
                        <span className="font-medium text-slate-900">{acc.account_name}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-[11px] text-slate-400 font-mono">{acc.percentage_of_revenue}%</span>
                        <span className="font-mono font-semibold text-slate-900">{currencySymbol} {Number(acc.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  ))
                )}
                <div className="flex items-center justify-between pt-2 border-t font-bold text-slate-900">
                  <span>Total Operating Expenses</span>
                  <span className="font-mono">{currencySymbol} {Number(profitLoss.total_expense).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Net Income Summary Row */}
              <div className="p-4 bg-slate-50/80 flex items-center justify-between text-sm font-extrabold text-slate-900">
                <span className="uppercase tracking-wider">Net Operating Income / (Loss)</span>
                <span className="font-mono text-base text-[#781019]">{currencySymbol} {Number(profitLoss.net_profit_loss).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. BALANCE SHEET TAB */}
      {/* ========================================================================= */}
      {!loading && activeTab === 'balance-sheet' && balanceSheet && (
        <div className="space-y-6">
          
          {/* Equation Verification Banner */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            balanceSheet.is_balanced 
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
              : 'bg-rose-50/80 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-center space-x-2.5">
              {balanceSheet.is_balanced ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider">
                  {balanceSheet.is_balanced ? '✓ Fundamental Equation Balanced (Assets == Liabilities + Equity)' : '⚠ Balance Sheet Equation Variance'}
                </div>
                <div className="text-xs text-slate-600">
                  Total Assets: <strong>{currencySymbol} {Number(balanceSheet.total_assets).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> = Total Liabilities & Equity: <strong>{currencySymbol} {Number(balanceSheet.total_liabilities_and_equity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
            </div>

            <div className="text-xs font-mono font-bold px-3 py-1 rounded bg-white border border-slate-200">
              Variance: {currencySymbol} {Number(balanceSheet.difference).toFixed(2)}
            </div>
          </div>

          {/* Two-Column Assets vs Liabilities & Equity Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* ASSETS COLUMN */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">Assets</span>
                  <span className="font-mono text-xs font-bold text-slate-600">{currencySymbol} {Number(balanceSheet.total_assets).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="p-4 divide-y divide-slate-100 text-xs">
                  {balanceSheet.asset_accounts.length === 0 ? (
                    <div className="text-slate-400 italic py-2">No asset balances found.</div>
                  ) : (
                    balanceSheet.asset_accounts.map((acc) => (
                      <div key={acc.account_id} className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-slate-500">{acc.account_code}</span>
                          <span className="font-medium text-slate-900">{acc.account_name}</span>
                        </div>
                        <span className="font-mono font-semibold text-slate-900">{currencySymbol} {Number(acc.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-4 bg-[#260002] text-white flex items-center justify-between font-bold text-sm">
              <div className="p-4 bg-[#0B0F17] text-white flex items-center justify-between font-bold text-sm border-t border-slate-800">
                <span className="uppercase tracking-wider text-[#EEC68B]">Total Assets</span>
                <span className="font-mono text-base text-white">{currencySymbol} {Number(balanceSheet.total_assets).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* LIABILITIES & EQUITY COLUMN */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                {/* Liabilities */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">Liabilities</span>
                  <span className="font-mono text-xs font-bold text-slate-600">{currencySymbol} {Number(balanceSheet.total_liabilities).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="p-4 divide-y divide-slate-100 text-xs">
                  {balanceSheet.liability_accounts.length === 0 ? (
                    <div className="text-slate-400 italic py-1">No liability balances.</div>
                  ) : (
                    balanceSheet.liability_accounts.map((acc) => (
                      <div key={acc.account_id} className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-slate-500">{acc.account_code}</span>
                          <span className="font-medium text-slate-900">{acc.account_name}</span>
                        </div>
                        <span className="font-mono font-semibold text-slate-900">{currencySymbol} {Number(acc.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Equity & Current Earnings */}
                <div className="p-4 bg-slate-50 border-y border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">Equity</span>
                  <span className="font-mono text-xs font-bold text-slate-600">{currencySymbol} {Number(balanceSheet.total_equity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="p-4 divide-y divide-slate-100 text-xs">
                  {balanceSheet.equity_accounts.map((acc) => (
                    <div key={acc.account_id} className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-slate-500">{acc.account_code}</span>
                        <span className="font-medium text-slate-900">{acc.account_name}</span>
                      </div>
                      <span className="font-mono font-semibold text-slate-900">{currencySymbol} {Number(acc.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}

                  {/* Current Period Net Earnings row */}
                  <div className="flex items-center justify-between py-2 text-emerald-800 bg-emerald-50/60 px-2 rounded font-semibold">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-emerald-600">P&L</span>
                      <span>Current Period Net Earnings</span>
                    </div>
                    <span className="font-mono">{currencySymbol} {Number(balanceSheet.current_period_earnings).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#260002] text-white flex items-center justify-between font-bold text-sm">
              <div className="p-4 bg-[#0B0F17] text-white flex items-center justify-between font-bold text-sm border-t border-slate-800">
                <span className="uppercase tracking-wider text-[#EEC68B]">Total Liabilities & Equity</span>
                <span className="font-mono text-base text-white">{currencySymbol} {Number(balanceSheet.total_liabilities_and_equity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

