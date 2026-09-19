import React from 'react';
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
  FileCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const { user, activeEntity } = useAuth();
  const currencySymbol = activeEntity?.base_currency === 'USD' ? '$' : (activeEntity?.base_currency === 'GBP' ? '£' : '₹');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Good Morning, {user?.first_name || 'Finance Leader'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Here's what's happening with your finances today in <strong className="text-slate-800">{activeEntity?.name}</strong>.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
            Ledger Balanced & Locked
          </span>
        </div>
      </div>

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
            {currencySymbol}12,50,000.00
          </div>
          <div className="flex items-center text-xs font-semibold text-emerald-600 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            <span>↑ 12% vs last month</span>
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
            {currencySymbol}7,85,400.00
          </div>
          <div className="flex items-center text-xs font-semibold text-emerald-600 mt-1">
            <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
            <span>↓ 4% vs last month (Optimized)</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-[#FAF5EE] p-5 rounded-xl border border-[#E6B676]/60 shadow-xs">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#390003] uppercase tracking-wider">Net Profit</span>
            <div className="w-8 h-8 rounded-lg bg-[#E6B676]/30 text-[#390003] flex items-center justify-center">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Profit</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#C58B3E] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#390003] mt-3 tnum">
          <div className="text-2xl font-bold text-slate-900 mt-3 tnum">
            {currencySymbol}4,64,600.00
          </div>
          <div className="flex items-center text-xs font-bold text-emerald-700 mt-1">
          <div className="flex items-center text-xs font-semibold text-emerald-600 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            <span>↑ 22% vs last month</span>
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
            {currencySymbol}84,20,000.00
          </div>
          <div className="flex items-center text-xs font-semibold text-blue-600 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            <span>↑ 9% vs last year</span>
          </div>
        </div>

      </div>

      {/* MIDDLE SECTION: OVERVIEW CHART, JOURNAL STATUS & CLOSE STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Financial Overview Chart Card (2 Columns) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Financial Overview (Revenue vs Expenses)</h2>
              <p className="text-[11px] text-slate-500">FY 2026-27 monthly trajectory across operating cycles</p>
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
            {[
              { month: 'Apr', rev: 65, exp: 45 },
              { month: 'May', rev: 72, exp: 50 },
              { month: 'Jun', rev: 80, exp: 52 },
              { month: 'Jul', rev: 88, exp: 58 },
              { month: 'Aug', rev: 95, exp: 62 },
              { month: 'Sep', rev: 100, exp: 62 },
            ].map((bar) => (
              <div key={bar.month} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full max-w-[40px] flex items-end justify-center gap-1 h-full">
                  <div 
                    style={{ height: `${bar.rev}%` }} 
                    className="w-1/2 bg-emerald-600 rounded-t-sm hover:opacity-90 transition-all cursor-pointer relative group"
                  >
                    <div className="hidden group-hover:block absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow z-10 whitespace-nowrap">
                      ₹{bar.rev * 12500}
                    </div>
                  </div>
                  <div 
                    style={{ height: `${bar.exp}%` }} 
                    className="w-1/2 bg-[#781019] rounded-t-sm hover:opacity-90 transition-all cursor-pointer relative group"
                  >
                    <div className="hidden group-hover:block absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow z-10 whitespace-nowrap">
                      ₹{bar.exp * 12500}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-slate-500">{bar.month}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>Operating Margin: <strong className="text-slate-800 font-mono">37.1%</strong></span>
            <span>EBITDA: <strong className="text-emerald-700 font-mono">₹ 5,12,000.00</strong></span>
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
              <span className="text-xs font-bold text-slate-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center space-x-1">
                <span>September 2026</span>
                <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-[#C58B3E] transition-colors" />
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600">Overall Progress</span>
                <span className="text-[#390003] font-bold">80% completed</span>
                <span className="text-slate-900 font-bold">80% completed</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-gradient-to-r from-[#390003] to-[#E6B676] h-2.5 rounded-full" style={{ width: '80%' }}></div>
                <div className="bg-gradient-to-r from-[#781019] to-[#C58B3E] h-2.5 rounded-full" style={{ width: '80%' }}></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
              <div className="p-2 rounded bg-emerald-50 border border-emerald-200">
                <div className="font-bold text-emerald-800 text-sm">6</div>
                <div className="text-[10px] text-emerald-700">Completed</div>
              </div>
              <div className="p-2 rounded bg-amber-50 border border-amber-200">
                <div className="font-bold text-amber-800 text-sm">2</div>
                <div className="text-[10px] text-amber-700">Pending</div>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-600 text-sm">0</div>
                <div className="text-[10px] text-slate-500">Blocked</div>
              </div>
            </div>
          </Link>

          {/* Journal Entry Status Breakdown */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Journal Entry Status</h3>
              <span className="text-[10px] text-slate-400 font-mono">Total: 28</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="flex items-center space-x-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span>Draft</span>
                </span>
                <span className="font-bold text-slate-700 font-mono">4</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="flex items-center space-x-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Pending Approval</span>
                </span>
                <span className="font-bold text-amber-700 font-mono">3</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="flex items-center space-x-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>Approved</span>
                </span>
                <span className="font-bold text-blue-700 font-mono">2</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="flex items-center space-x-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Posted to Ledger</span>
                </span>
                <span className="font-bold text-emerald-700 font-mono">18</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="flex items-center space-x-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>Rejected</span>
                </span>
                <span className="font-bold text-rose-700 font-mono">1</span>
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
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold font-mono">
              Real Ledger
            </span>
          </div>

          <div className="overflow-x-auto">
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
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-semibold text-[#781019]">JE-2026-0042</td>
                  <td className="py-2.5 px-4 font-mono text-slate-500">14-Sep-2026</td>
                  <td className="py-2.5 px-4 font-medium text-slate-900">Monthly SaaS Subscription Inflow</td>
                  <td className="py-2.5 px-4 text-slate-600">Ricoz India</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold tnum text-slate-900">₹ 4,85,000.00</td>
                  <td className="py-2.5 px-4 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Posted
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-semibold text-[#781019]">JE-2026-0041</td>
                  <td className="py-2.5 px-4 font-mono text-slate-500">14-Sep-2026</td>
                  <td className="py-2.5 px-4 font-medium text-slate-900">Cloud Hosting & AWS Accrual</td>
                  <td className="py-2.5 px-4 text-slate-600">Ricoz US</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold tnum text-slate-900">$ 3,200.00</td>
                  <td className="py-2.5 px-4 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Pending
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-semibold text-[#781019]">JE-2026-0040</td>
                  <td className="py-2.5 px-4 font-mono text-slate-500">13-Sep-2026</td>
                  <td className="py-2.5 px-4 font-medium text-slate-900">Office Rent Provision Sep</td>
                  <td className="py-2.5 px-4 text-slate-600">Ricoz India</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold tnum text-slate-900">₹ 1,50,000.00</td>
                  <td className="py-2.5 px-4 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Posted
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-semibold text-[#781019]">JE-2026-0039</td>
                  <td className="py-2.5 px-4 font-mono text-slate-500">12-Sep-2026</td>
                  <td className="py-2.5 px-4 font-medium text-slate-900">UK Legal & Statutory Filing</td>
                  <td className="py-2.5 px-4 text-slate-600">Ricoz UK</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold tnum text-slate-900">£ 2,100.00</td>
                  <td className="py-2.5 px-4 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      Approved
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Multi-Entity Breakdown Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-[#781019]" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Multi-Entity Portfolio</h3>
            </div>
            <span className="text-[10px] font-semibold text-slate-500">3 Legal Entities</span>
          </div>

          <div className="space-y-3">
            {/* Entity 1 */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-slate-900">Ricoz India</div>
                <div className="text-[10px] text-slate-500">GSTIN: 27AAACA1234F1Z5</div>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">INR (₹)</span>
                <div className="text-[10px] text-slate-500 mt-1">Operational Base</div>
              </div>
            </div>

            {/* Entity 2 */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-slate-900">Ricoz US</div>
                <div className="text-[10px] text-slate-500">EIN-84-9382109 (Delaware)</div>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold font-mono">USD ($)</span>
                <div className="text-[10px] text-slate-500 mt-1">Rate: ₹83.50</div>
              </div>
            </div>

            {/* Entity 3 */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-slate-900">Ricoz UK</div>
                <div className="text-[10px] text-slate-500">VAT: GB998234120</div>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold font-mono">GBP (£)</span>
                <div className="text-[10px] text-slate-500 mt-1">Rate: ₹108.20</div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

