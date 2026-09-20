import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building2, 
  CalendarCheck,
  FileCheck,
  RefreshCw,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDashboardMetrics, DashboardMetricsResponse } from '../services/accountingApi';

export const Dashboard: React.FC = () => {
  const { user, activeEntity, entities } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDashboardMetrics(activeEntity?.id);
      setMetrics(data);
    } catch (err: any) {
      console.error('Failed to load dashboard metrics:', err);
      setError(err.message || 'Failed to fetch live financial metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [activeEntity?.id]);

  const currencySymbol = metrics?.currency_symbol || (activeEntity?.base_currency === 'USD' ? '$' : (activeEntity?.base_currency === 'GBP' ? '£' : (activeEntity?.base_currency === 'EUR' ? '€' : '₹')));

  const formatAmount = (val: number | string | undefined | null) => {
    const num = typeof val === 'string' ? parseFloat(val) : (val ?? 0);
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Trajectory scaling
  const trajectory = metrics?.monthly_trajectory || [];
  const maxTrajectoryVal = Math.max(
    ...trajectory.map(t => Math.max(Number(t.revenue || 0), Number(t.expense || 0))),
    100
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Good Morning, {user?.first_name || 'Finance Leader'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Here's what's happening with your finances today in <strong className="text-slate-800">{activeEntity?.name || 'Company'}</strong>.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchMetrics}
            disabled={isLoading}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Ledger</span>
          </button>

          {metrics?.is_balanced !== false ? (
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              Ledger Balanced & In Sync
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold flex items-center">
              <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-600" />
              Reconciliation Active
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchMetrics} className="font-semibold underline">Retry</button>
        </div>
      )}

      {/* 4 CORE FINANCIAL KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-3 tnum">
            {currencySymbol}{formatAmount(metrics?.total_revenue)}
          </div>
          <div className="flex items-center text-xs font-semibold text-emerald-600 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            <span>Net Operating Revenue</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expenses</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-3 tnum">
            {currencySymbol}{formatAmount(metrics?.total_expense)}
          </div>
          <div className="flex items-center text-xs font-semibold text-slate-500 mt-1">
            <ArrowDownRight className="w-3.5 h-3.5 mr-0.5 text-slate-400" />
            <span>Operating Overheads</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-[#FAF5EE] p-5 rounded-xl border border-[#E6B676]/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#390003] uppercase tracking-wider">Net Profit</span>
            <div className="w-8 h-8 rounded-lg bg-[#E6B676]/30 text-[#390003] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#390003] mt-3 tnum">
            {currencySymbol}{formatAmount(metrics?.net_profit)}
          </div>
          <div className="flex items-center text-xs font-bold text-emerald-700 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            <span>Margin: {metrics?.net_margin_pct ?? '0.00'}%</span>
          </div>
        </div>

        {/* Total Assets */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Assets</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-3 tnum">
            {currencySymbol}{formatAmount(metrics?.total_assets)}
          </div>
          <div className="flex items-center text-xs font-semibold text-blue-600 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5 mr-0.5" />
            <span>General Ledger Balance</span>
          </div>
        </div>

      </div>

      {/* MIDDLE SECTION: OVERVIEW CHART, CLOSE STATUS & JOURNAL STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Financial Overview Chart Card (2 Columns) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Financial Overview (Revenue vs Expenses)</h2>
              <p className="text-[11px] text-slate-500">Live monthly trajectory computed from posted ledger journals</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1.5 font-semibold text-emerald-700">
                <span className="w-2.5 h-2.5 bg-emerald-600 rounded-sm"></span>
                <span>Revenue</span>
              </span>
              <span className="flex items-center space-x-1.5 font-semibold text-[#781019]">
                <span className="w-2.5 h-2.5 bg-[#781019] rounded-sm"></span>
                <span>Expenses</span>
              </span>
            </div>
          </div>

          {/* Clean Financial Chart Visualization */}
          <div className="h-56 w-full flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
            {trajectory.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <Clock className="w-6 h-6 mb-1 text-slate-300" />
                <span>No transaction activity recorded yet</span>
              </div>
            ) : (
              trajectory.map((bar) => {
                const revNum = Number(bar.revenue || 0);
                const expNum = Number(bar.expense || 0);
                const revHeight = maxTrajectoryVal > 0 ? Math.max(4, Math.round((revNum / maxTrajectoryVal) * 100)) : 4;
                const expHeight = maxTrajectoryVal > 0 ? Math.max(4, Math.round((expNum / maxTrajectoryVal) * 100)) : 4;
                
                return (
                  <div key={`${bar.year}-${bar.month_num}`} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <div className="w-full max-w-[40px] flex items-end justify-center gap-1 h-full">
                      <div 
                        style={{ height: `${revNum > 0 ? revHeight : 4}%` }} 
                        className={`w-1/2 rounded-t-sm transition-all cursor-pointer relative group ${revNum > 0 ? 'bg-emerald-600 hover:opacity-90' : 'bg-slate-200'}`}
                      >
                        <div className="hidden group-hover:block absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow z-10 whitespace-nowrap">
                          {currencySymbol} {formatAmount(revNum)}
                        </div>
                      </div>
                      <div 
                        style={{ height: `${expNum > 0 ? expHeight : 4}%` }} 
                        className={`w-1/2 rounded-t-sm transition-all cursor-pointer relative group ${expNum > 0 ? 'bg-[#781019] hover:opacity-90' : 'bg-slate-200'}`}
                      >
                        <div className="hidden group-hover:block absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow z-10 whitespace-nowrap">
                          {currencySymbol} {formatAmount(expNum)}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">{bar.month}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>Operating Margin: <strong className="text-slate-800 font-mono">{metrics?.net_margin_pct ?? '0.00'}%</strong></span>
            <span>Net Operating Result: <strong className="text-emerald-700 font-mono">{currencySymbol} {formatAmount(metrics?.net_profit)}</strong></span>
          </div>
        </div>

        {/* Period-End Close Widget & Journal Entry Status */}
        <div className="space-y-6">
          
          {/* Close Status Card */}
          <Link 
            to="/close-manager" 
            className="block bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 hover:border-[#C58B3E]/50 hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CalendarCheck className="w-4 h-4 text-[#C58B3E] group-hover:scale-110 transition-transform" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider group-hover:text-[#781019] transition-colors">Close Status</h3>
              </div>
              <span className="text-xs font-bold text-[#390003] bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center space-x-1">
                <span>{metrics?.close_status?.period_name || 'September 2026'}</span>
                <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-[#C58B3E] transition-colors" />
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600">Overall Progress</span>
                <span className="text-[#390003] font-bold">{metrics?.close_status?.completion_percentage ?? 0}% completed</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#390003] to-[#E6B676] h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${metrics?.close_status?.completion_percentage ?? 0}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
              <div className="p-2 rounded bg-emerald-50 border border-emerald-200">
                <div className="font-bold text-emerald-800 text-sm">{metrics?.close_status?.completed_tasks ?? 0}</div>
                <div className="text-[10px] text-emerald-700">Completed</div>
              </div>
              <div className="p-2 rounded bg-amber-50 border border-amber-200">
                <div className="font-bold text-amber-800 text-sm">{metrics?.close_status?.pending_tasks ?? 0}</div>
                <div className="text-[10px] text-amber-700">Pending</div>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-600 text-sm">{metrics?.close_status?.blocked_tasks ?? 0}</div>
                <div className="text-[10px] text-slate-500">Blocked</div>
              </div>
            </div>
          </Link>

          {/* Journal Entry Status Breakdown */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Journal Entry Status</h3>
              <span className="text-[10px] text-slate-400 font-mono">Total: {metrics?.journal_counts?.total ?? 0}</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="flex items-center space-x-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span>Draft</span>
                </span>
                <span className="font-bold text-slate-700 font-mono">{metrics?.journal_counts?.draft ?? 0}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="flex items-center space-x-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Pending Approval</span>
                </span>
                <span className="font-bold text-amber-700 font-mono">{metrics?.journal_counts?.pending ?? 0}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="flex items-center space-x-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>Approved</span>
                </span>
                <span className="font-bold text-blue-700 font-mono">{metrics?.journal_counts?.approved ?? 0}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="flex items-center space-x-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Posted to Ledger</span>
                </span>
                <span className="font-bold text-emerald-700 font-mono">{metrics?.journal_counts?.posted ?? 0}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="flex items-center space-x-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>Rejected</span>
                </span>
                <span className="font-bold text-rose-700 font-mono">{metrics?.journal_counts?.rejected ?? 0}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* LOWER SECTION: RECENT JOURNAL ENTRIES & MULTI-ENTITY SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Journal Entries Table (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-[#781019]" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Recent Journal Entries</h3>
            </div>
            <Link 
              to="/journals" 
              className="text-xs font-semibold text-[#781019] hover:underline flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {metrics?.recent_journals && metrics.recent_journals.length > 0 ? (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4">JE Number</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4">Entity</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {metrics.recent_journals.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-semibold text-[#781019]">
                        <Link to="/journals" className="hover:underline">{j.entry_number}</Link>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-500">{j.entry_date}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-900 max-w-xs truncate">{j.description}</td>
                      <td className="py-2.5 px-4 text-slate-600">{j.entity_name}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold tnum text-slate-900">
                        {currencySymbol} {formatAmount(j.amount)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          j.status === 'POSTED' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : j.status === 'APPROVED'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : j.status === 'SUBMITTED' || j.status === 'UNDER_REVIEW'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : j.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {j.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 space-y-3">
                <FileCheck className="w-8 h-8 text-slate-300 mx-auto" />
                <div>
                  <p className="font-semibold text-slate-700">No Journal Entries Recorded Yet</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Transactions recorded for {activeEntity?.name || 'this entity'} will immediately populate your general ledger and reports.
                  </p>
                </div>
                <Link
                  to="/journals"
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#781019] text-white font-semibold text-xs hover:bg-[#8F131E] shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Journal Entry</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Multi-Entity Breakdown Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-[#781019]" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Company Entities</h3>
            </div>
            <span className="text-[10px] font-semibold text-slate-500">
              {entities.length} {entities.length === 1 ? 'Legal Entity' : 'Legal Entities'}
            </span>
          </div>

          <div className="space-y-3">
            {entities.map((ent, idx) => (
              <div 
                key={ent.id} 
                className={`p-3 rounded-lg border transition-all ${
                  ent.id === activeEntity?.id 
                    ? 'bg-amber-50/50 border-[#C58B3E]/40 shadow-xs' 
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-slate-900 flex items-center space-x-1.5">
                      <span>{ent.name}</span>
                      {ent.id === activeEntity?.id && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#781019] text-white font-semibold">Active</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {ent.tax_identifier ? `Tax ID: ${ent.tax_identifier}` : (ent.code ? `Code: ${ent.code}` : (idx === 0 ? 'Primary Operating Unit' : 'Operating Subsidiary'))}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
                      {ent.base_currency || 'INR'}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {idx === 0 ? 'Primary' : 'Subsidiary'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <Link to="/entities" className="text-xs font-semibold text-[#781019] hover:underline flex items-center space-x-1">
              <span>Manage Entity Portfolio</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
};
