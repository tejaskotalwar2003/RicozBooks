import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Scale, 
  Receipt, 
  FileSpreadsheet, 
  Boxes, 
  FileCheck, 
  Sparkles, 
  ShieldCheck, 
  Building2, 
  BookOpen, 
  Lock, 
  CheckCircle2, 
  ArrowRight, 
  ChevronRight, 
  Users, 
  FileText, 
  Layers, 
  BarChart3, 
  Database, 
  Check, 
  ArrowUpRight, 
  TrendingUp, 
  CalendarCheck, 
  Menu, 
  X, 
  Clock, 
  FileCode2, 
  Laptop, 
  Zap, 
  ArrowDownLeft 
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeWorkbenchTab, setActiveWorkbenchTab] = useState<'ledger' | 'invoice' | 'gst' | 'inventory' | 'close'>('ledger');
  const navigate = useNavigate();

  const handleDemoLogin = (email: string) => {
    navigate(`/login?demo=${encodeURIComponent(email)}`);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-900 selection:bg-[#E6B676]/30 selection:text-[#390003] font-sans antialiased">
      
      {/* 1. TOP ANNOUNCEMENT BANNER */}
      <div className="bg-[#390003] text-[#E6B676] px-4 py-2 text-xs font-medium border-b border-[#5B060C]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6B676] text-[#390003]">
              v2.4 RELEASE
            </span>
            <span className="text-stone-200">
              Indian GST Suite, Real-Time FIFO Stock Valuation & Multi-Entity Ledger Consolidation
            </span>
          </div>
          <div className="flex items-center space-x-4 text-stone-300">
            <span className="hidden sm:inline-flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block mr-1"></span>
              <span>Cloud API 99.99% Uptime</span>
            </span>
            <Link to="/login" className="hover:text-white font-semibold underline underline-offset-2 flex items-center">
              <span>Open Cloud Console</span>
              <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION BAR */}
      <header className="sticky top-0 z-50 bg-[#FAF9F6]/90 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#390003] to-[#781019] flex items-center justify-center text-[#E6B676] shadow-sm group-hover:scale-105 transition-transform">
                <Scale className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight text-[#390003]">
                  Ricoz<span className="text-[#C58B3E]">Books</span>
                </span>
                <span className="text-[10px] uppercase tracking-widest font-semibold text-stone-500">
                  Enterprise Financial Cloud
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-stone-700">
              <a href="#workbench" className="hover:text-[#781019] transition-colors">Interactive Ledger</a>
              <a href="#modules" className="hover:text-[#781019] transition-colors">22 Modules</a>
              <a href="#comparison" className="hover:text-[#781019] transition-colors">Why RicozBooks</a>
              <a href="#sandboxes" className="hover:text-[#781019] transition-colors">Role Sandboxes</a>
              <a href="#faq" className="hover:text-[#781019] transition-colors">FAQ</a>
            </nav>
          </div>

          <div className="hidden sm:flex items-center space-x-3">
            <Link 
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-stone-700 hover:text-stone-900 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              to="/register"
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#390003] text-[#FAF9F6] hover:bg-[#5B060C] transition-all shadow-sm hover:shadow"
            >
              Create Free Account
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-stone-700 hover:text-stone-900"
            aria-label="Toggle Navigation"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-b border-stone-200 bg-white px-4 pt-3 pb-5 space-y-3">
            <a 
              href="#workbench" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-stone-700 py-1"
            >
              Interactive Ledger
            </a>
            <a 
              href="#modules" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-stone-700 py-1"
            >
              22 Modules Architecture
            </a>
            <a 
              href="#comparison" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-stone-700 py-1"
            >
              Why RicozBooks
            </a>
            <a 
              href="#sandboxes" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-stone-700 py-1"
            >
              Role Sandboxes
            </a>
            <div className="pt-3 border-t border-stone-200 flex flex-col space-y-2">
              <Link 
                to="/login"
                className="w-full text-center py-2 text-sm font-semibold border border-stone-300 rounded-lg text-stone-700"
              >
                Sign In
              </Link>
              <Link 
                to="/register"
                className="w-full text-center py-2 text-sm font-semibold rounded-lg bg-[#390003] text-white"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 3. HERO SECTION */}
      <section className="relative pt-12 pb-16 lg:pt-20 lg:pb-24 overflow-hidden border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-stone-200/80 border border-stone-300 text-xs font-semibold text-stone-700">
              <span className="w-1.5 h-1.5 rounded-full bg-[#390003]"></span>
              <span>Double-Entry Financial OS for High-Growth Indian Businesses</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-stone-900 tracking-tight leading-[1.1]">
              Accounting software that respects your ledger and your intelligence.
            </h1>

            <p className="text-lg sm:text-xl text-stone-600 leading-relaxed font-normal">
              No bloated clutter. No mystical balance drifts. RicozBooks gives founders, CFOs, and Chartered Accountants mathematically rigorous double-entry ledgers, full GST compliance, automated sales cycles, and tamper-evident four-eyes governance.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link 
                to="/register"
                className="px-6 py-3.5 rounded-xl bg-[#390003] hover:bg-[#5B060C] text-white font-semibold text-base shadow-sm hover:shadow-md transition-all flex items-center space-x-2"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a 
                href="#workbench"
                className="px-6 py-3.5 rounded-xl bg-white border border-stone-300 hover:border-stone-400 text-stone-800 font-semibold text-base transition-all shadow-xs flex items-center space-x-2"
              >
                <span>Explore Live Product</span>
                <ChevronRight className="w-4 h-4 text-stone-500" />
              </a>
            </div>

            {/* Micro proof badges */}
            <div className="pt-4 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-stone-500 font-medium">
              <span className="flex items-center space-x-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Zero Mathematical Drift (Debits = Credits)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>GSTR-1, GSTR-3B & E-Invoicing Ready</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Maker-Checker Audit Trail</span>
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* 4. INTERACTIVE PRODUCT WORKBENCH */}
      <section id="workbench" className="py-16 lg:py-24 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
            <span className="text-xs uppercase tracking-widest font-bold text-[#781019]">
              Hands-on UI Preview
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
              Test drive the real core mechanisms
            </h2>
            <p className="text-stone-600 text-sm sm:text-base">
              Click through the five foundational engines below to see how RicozBooks executes double-entry math, tax calculations, and tamper-proof financial controls.
            </p>
          </div>

          {/* Workbench Frame */}
          <div className="rounded-2xl border border-stone-300 bg-[#FAF9F6] shadow-sm overflow-hidden">
            
            {/* Workbench Tab Navigation */}
            <div className="bg-stone-200/70 border-b border-stone-300 p-2 sm:p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                <button
                  onClick={() => setActiveWorkbenchTab('ledger')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeWorkbenchTab === 'ledger' 
                      ? 'bg-white text-[#781019] shadow-xs' 
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  1. General Ledger Voucher
                </button>
                <button
                  onClick={() => setActiveWorkbenchTab('invoice')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeWorkbenchTab === 'invoice' 
                      ? 'bg-white text-[#781019] shadow-xs' 
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  2. Tax Invoice & AR
                </button>
                <button
                  onClick={() => setActiveWorkbenchTab('gst')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeWorkbenchTab === 'gst' 
                      ? 'bg-white text-[#781019] shadow-xs' 
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  3. GST Return Filing
                </button>
                <button
                  onClick={() => setActiveWorkbenchTab('inventory')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeWorkbenchTab === 'inventory' 
                      ? 'bg-white text-[#781019] shadow-xs' 
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  4. Stock Valuation
                </button>
                <button
                  onClick={() => setActiveWorkbenchTab('close')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeWorkbenchTab === 'close' 
                      ? 'bg-white text-[#781019] shadow-xs' 
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  5. Period Close Lock
                </button>
              </div>

              <div className="hidden sm:flex items-center text-xs text-stone-500 space-x-2 font-mono">
                <span>Active Entity:</span>
                <span className="font-bold text-stone-800">Ricoz India Pvt Ltd (INR)</span>
              </div>
            </div>

            {/* Workbench Body Preview Area */}
            <div className="p-6 lg:p-8 bg-[#FAF9F6]">
              
              {/* TAB 1: GENERAL LEDGER VOUCHER */}
              {activeWorkbenchTab === 'ledger' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-200 gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-stone-900 font-mono">VOUCHER #JE-2026-0042</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          POSTED & VERIFIED
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Description: Monthly B2B Cloud Subscription Revenue Recognition with Intra-State GST
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-stone-500 font-mono">Date: 2026-09-20 • Currency: INR</div>
                      <div className="text-xs font-bold text-emerald-700 flex items-center justify-end space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ledger Invariant Balanced (Variance = ₹0.00)</span>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                          <th className="py-2.5 px-3">Account Code & Name</th>
                          <th className="py-2.5 px-3">Classification</th>
                          <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                          <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                          <th className="py-2.5 px-3">Narration / Ref</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 font-mono">
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-stone-900">1200 — Accounts Receivable</td>
                          <td className="py-2.5 px-3 text-stone-500">Asset (Current)</td>
                          <td className="py-2.5 px-3 text-right font-bold text-stone-900">1,18,000.00</td>
                          <td className="py-2.5 px-3 text-right text-stone-400">—</td>
                          <td className="py-2.5 px-3 text-stone-600 font-sans">Acme Corp Invoice #INV-1092</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-stone-900">4000 — Operating Sales Revenue</td>
                          <td className="py-2.5 px-3 text-stone-500">Revenue (Operating)</td>
                          <td className="py-2.5 px-3 text-right text-stone-400">—</td>
                          <td className="py-2.5 px-3 text-right font-bold text-stone-900">1,00,000.00</td>
                          <td className="py-2.5 px-3 text-stone-600 font-sans">Enterprise Platform Licensing</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-stone-900">2110 — Output CGST (9%)</td>
                          <td className="py-2.5 px-3 text-stone-500">Liability (Current)</td>
                          <td className="py-2.5 px-3 text-right text-stone-400">—</td>
                          <td className="py-2.5 px-3 text-right font-bold text-stone-900">9,000.00</td>
                          <td className="py-2.5 px-3 text-stone-600 font-sans">Central GST 9%</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-stone-900">2120 — Output SGST (9%)</td>
                          <td className="py-2.5 px-3 text-stone-500">Liability (Current)</td>
                          <td className="py-2.5 px-3 text-right text-stone-400">—</td>
                          <td className="py-2.5 px-3 text-right font-bold text-stone-900">9,000.00</td>
                          <td className="py-2.5 px-3 text-stone-600 font-sans">State GST 9%</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="bg-stone-100 font-bold border-t-2 border-stone-300">
                          <td className="py-2 px-3" colSpan={2}>TOTALS</td>
                          <td className="py-2 px-3 text-right text-stone-900 font-mono">₹ 1,18,000.00</td>
                          <td className="py-2 px-3 text-right text-stone-900 font-mono">₹ 1,18,000.00</td>
                          <td className="py-2 px-3 text-emerald-700 font-sans font-semibold">Zero Variance</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="p-3 bg-stone-100/80 rounded-xl border border-stone-200 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-600 gap-2">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Four-Eyes Governance: Submitted by <strong>accountant@ricozbooks.com</strong> • Approved by <strong>reviewer@ricozbooks.com</strong></span>
                    </div>
                    <Link to="/login" className="font-bold text-[#781019] hover:underline flex items-center space-x-1">
                      <span>Try live in Sandbox</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}

              {/* TAB 2: TAX INVOICE & AR */}
              {activeWorkbenchTab === 'invoice' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                    <div>
                      <span className="text-sm font-bold text-stone-900">TAX INVOICE: #INV-2026-0881</span>
                      <p className="text-xs text-stone-500">Customer: Zenex Analytics Ltd • GSTIN: 27AAACZ1234F1Z5</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      PARTIALLY PAID (₹ 50,000 due)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-stone-200">
                      <span className="text-stone-500">Taxable Amount</span>
                      <div className="text-base font-bold text-stone-900 font-mono mt-1">₹ 2,00,000.00</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-stone-200">
                      <span className="text-stone-500">GST (18% Intra)</span>
                      <div className="text-base font-bold text-stone-900 font-mono mt-1">₹ 36,000.00</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-stone-200">
                      <span className="text-stone-500">Total Billed</span>
                      <div className="text-base font-bold text-stone-900 font-mono mt-1">₹ 2,36,000.00</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-stone-200">
                      <span className="text-stone-500">Auto GL Status</span>
                      <div className="text-xs font-bold text-emerald-700 mt-1.5 flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Posted to AR (1200)</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
                    <span>1-Click Convert: Estimates &rarr; Sales Orders &rarr; Tax Invoices with automated ledger entries.</span>
                    <Link to="/login" className="font-bold text-[#781019] hover:underline">View in Invoices Module &rarr;</Link>
                  </div>
                </div>
              )}

              {/* TAB 3: GST RETURN FILING */}
              {activeWorkbenchTab === 'gst' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                    <div>
                      <span className="text-sm font-bold text-stone-900">GST RETURN ENGINE (GSTR-1 & GSTR-3B)</span>
                      <p className="text-xs text-stone-500">Tax Period: September 2026 • Return Status: Ready for Portal Upload</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="px-3 py-1 text-xs font-semibold rounded bg-stone-900 text-white hover:bg-stone-800">
                        Export JSON Schema
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-stone-200">
                      <span className="text-stone-500 font-medium">B2B Supplies (Table 4A)</span>
                      <div className="text-base font-bold text-stone-900 font-mono mt-1">₹ 14,80,000.00</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">IGST: ₹1.44L | CGST: ₹61.2K | SGST: ₹61.2K</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-stone-200">
                      <span className="text-stone-500 font-medium">Eligible ITC (Table 4A-5)</span>
                      <div className="text-base font-bold text-stone-900 font-mono mt-1">₹ 1,12,400.00</div>
                      <div className="text-[11px] text-emerald-600 mt-0.5">Reconciled against GSTR-2B Vouchers</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-stone-200">
                      <span className="text-stone-500 font-medium">Net Cash Tax Payable</span>
                      <div className="text-base font-bold text-[#781019] font-mono mt-1">₹ 1,54,000.00</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">Automated Electronic Cash Ledger offset</div>
                    </div>
                  </div>

                  <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
                    <span>Direct HSN/SAC code mapping, multi-rate tax computation (0%, 5%, 12%, 18%, 28%), and reverse charge (RCM).</span>
                    <Link to="/login" className="font-bold text-[#781019] hover:underline">Explore GST Reports &rarr;</Link>
                  </div>
                </div>
              )}

              {/* TAB 4: INVENTORY VALUATION */}
              {activeWorkbenchTab === 'inventory' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                    <div>
                      <span className="text-sm font-bold text-stone-900">PERPETUAL INVENTORY ENGINE</span>
                      <p className="text-xs text-stone-500">Valuation Standard: First-In First-Out (FIFO) & Weighted Average Cost</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      LIVE COGS SYNC
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                          <th className="py-2 px-3">SKU</th>
                          <th className="py-2 px-3">Item Description</th>
                          <th className="py-2 px-3 text-right">In Stock</th>
                          <th className="py-2 px-3 text-right">Unit Cost (FIFO)</th>
                          <th className="py-2 px-3 text-right">Asset Valuation</th>
                          <th className="py-2 px-3">Ledger Sync Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 font-mono">
                        <tr>
                          <td className="py-2 px-3 font-semibold text-stone-900">SRV-NODE-01</td>
                          <td className="py-2 px-3 text-stone-700 font-sans">Edge Compute Server Node</td>
                          <td className="py-2 px-3 text-right font-bold text-stone-900">24 units</td>
                          <td className="py-2 px-3 text-right text-stone-600">₹ 42,000.00</td>
                          <td className="py-2 px-3 text-right font-bold text-stone-900">₹ 10,08,000.00</td>
                          <td className="py-2 px-3 text-emerald-700 font-sans">Synced (GL 1300)</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold text-stone-900">MOD-OPTIC-40</td>
                          <td className="py-2 px-3 text-stone-700 font-sans">40G Optical Transceiver</td>
                          <td className="py-2 px-3 text-right font-bold text-stone-900">150 units</td>
                          <td className="py-2 px-3 text-right text-stone-600">₹ 3,200.00</td>
                          <td className="py-2 px-3 text-right font-bold text-stone-900">₹ 4,80,000.00</td>
                          <td className="py-2 px-3 text-emerald-700 font-sans">Synced (GL 1300)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
                    <span>Automated journal generation upon bill receipts (Dr Inventory, Cr AP) and delivery dispatch (Dr COGS, Cr Inventory).</span>
                    <Link to="/login" className="font-bold text-[#781019] hover:underline">View Stock Ledger &rarr;</Link>
                  </div>
                </div>
              )}

              {/* TAB 5: PERIOD CLOSE LOCK */}
              {activeWorkbenchTab === 'close' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                    <div>
                      <span className="text-sm font-bold text-stone-900">TAMPER-PROOF PERIOD CLOSE MANAGER</span>
                      <p className="text-xs text-stone-500">Lock status protects audited accounting periods against retroactive edits</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      LOCKED UNTIL 2026-08-31
                    </span>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-3 text-xs">
                    <div className="flex items-start space-x-3">
                      <Lock className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-bold text-stone-900 text-sm">Fiscal Period: August 2026 is Permanently Sealed</div>
                        <p className="text-stone-600 mt-1 leading-relaxed">
                          All vouchers, vendor bills, and invoices dated on or before August 31, 2026 cannot be modified or deleted. 
                          Any adjustments require a signed reversing journal entry approved by an authorized Controller or Admin.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
                    <span>Audit logs record timestamp, user ID, cryptographic hash, and diff snapshots for all critical financial events.</span>
                    <Link to="/login" className="font-bold text-[#781019] hover:underline">Audit Trail Settings &rarr;</Link>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </section>

      {/* 5. COMPLETE 22-MODULE ARCHITECTURE (BENTO GRID) */}
      <section id="modules" className="py-16 lg:py-24 bg-[#FAF9F6] border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-3xl mb-12 space-y-3">
            <span className="text-xs uppercase tracking-widest font-bold text-[#781019]">
              Enterprise System Scope
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
              22 Specialized Financial Modules. Zero Gaps.
            </h2>
            <p className="text-stone-600 text-sm sm:text-base">
              Built ground-up as an integrated double-entry ERP — not a stitched-together collection of third-party plugins.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 1. Core General Ledger */}
            <div className="p-6 rounded-2xl bg-white border border-stone-200 hover:border-stone-400 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-stone-100 text-[#390003] flex items-center justify-center font-bold">
                <Scale className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">1. Core General Ledger</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Multi-line journal vouchers with strict debit-equals-credit invariant validation, real-time balance calculations, line-level narrations, and reference document linking.
              </p>
            </div>

            {/* 2. Chart of Accounts */}
            <div className="p-6 rounded-2xl bg-white border border-stone-200 hover:border-stone-400 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-stone-100 text-[#390003] flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">2. Chart of Accounts</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Five-tier hierarchical ledger tree (Assets, Liabilities, Equity, Revenue, Expenses) with system account locks, multi-currency attributes, and custom sub-accounts.
              </p>
            </div>

            {/* 3. Sales & Accounts Receivable */}
            <div className="p-6 rounded-2xl bg-white border border-stone-200 hover:border-stone-400 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-stone-100 text-[#390003] flex items-center justify-center font-bold">
                <Receipt className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">3. Invoicing & Accounts Receivable</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Complete sales lifecycle: Estimates &rarr; Sales Orders &rarr; Tax Invoices &rarr; Credit Notes &rarr; Recurring Invoices. Auto-posts debits to AR and credits to sales/GST.
              </p>
            </div>

            {/* 4. Procurement & AP */}
            <div className="p-6 rounded-2xl bg-white border border-stone-200 hover:border-stone-400 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-stone-100 text-[#390003] flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">4. Bills & Accounts Payable</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Vendor purchase orders, bill approval workflows, 3-way matching, debit notes, and payment scheduling with automatic withholding tax (TDS) deduction.
              </p>
            </div>

            {/* 5. Indian GST Engine */}
            <div className="p-6 rounded-2xl bg-white border border-stone-200 hover:border-stone-400 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-stone-100 text-[#390003] flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">5. Indian GST & E-Invoicing Suite</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                GSTR-1, GSTR-3B, B2B, B2C, HSN/SAC summaries, ITC validation, and auto-determination of IGST (inter-state) vs CGST+SGST (intra-state).
              </p>
            </div>

            {/* 6. Stock & Inventory */}
            <div className="p-6 rounded-2xl bg-white border border-stone-200 hover:border-stone-400 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-stone-100 text-[#390003] flex items-center justify-center font-bold">
                <Boxes className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">6. Inventory & Stock Valuation</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Real-time stock ledger, FIFO & weighted average valuation methods, reorder level alerts, multi-location tracking, and auto COGS booking on dispatch.
              </p>
            </div>

            {/* 7. Bank Reconciliation */}
            <div className="p-6 rounded-2xl bg-white border border-stone-200 hover:border-stone-400 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-stone-100 text-[#390003] flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">7. Banking & Reconciliation</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Connect bank accounts, import OFX/CSV statement feeds, and utilize intelligent rule-based matching between bank transactions and posted vouchers.
              </p>
            </div>

            {/* 8. Financial Statements */}
            <div className="p-6 rounded-2xl bg-white border border-stone-200 hover:border-stone-400 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-stone-100 text-[#390003] flex items-center justify-center font-bold">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">8. Financial Reports & Analytics</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Instant generation of Balance Sheet, Profit & Loss (Income Statement), Trial Balance, Cash Flow, and General Ledger drill-downs with 1-click CSV/PDF export.
              </p>
            </div>

            {/* 9. Maker-Checker Approvals */}
            <div className="p-6 rounded-2xl bg-white border border-stone-200 hover:border-stone-400 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-stone-100 text-[#390003] flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">9. Four-Eyes Internal Controls</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Role separation between junior accountants (makers) and reviewers/CFOs (checkers). Mandatory approval reasons, rejection tracking, and unchangeable audit logs.
              </p>
            </div>

            {/* 10. Multi-Entity & Multi-Currency */}
            <div className="p-6 rounded-2xl bg-white border border-stone-200 hover:border-stone-400 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-stone-100 text-[#390003] flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">10. Multi-Entity Consolidation</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Manage multiple subsidiaries, branches, and overseas entities with separate base currencies (INR, USD, EUR, GBP) and automatic FX revaluation.
              </p>
            </div>

            {/* 11. Period Close Lock */}
            <div className="p-6 rounded-2xl bg-white border border-stone-200 hover:border-stone-400 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-stone-100 text-[#390003] flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">11. Period Close & Fiscal Year Lock</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Prevent accidental edits to historic quarters. Lock periods upon sign-off with cryptographic integrity records to satisfy statutory tax audits.
              </p>
            </div>

            {/* 12. Developer API & Webhooks */}
            <div className="p-6 rounded-2xl bg-white border border-stone-200 hover:border-stone-400 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-stone-100 text-[#390003] flex items-center justify-center font-bold">
                <FileCode2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">12. Developer API & Webhooks</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                RESTful endpoints with OpenAPI/Swagger specifications, Bearer token authentication, and real-time outbound webhooks for payment gateways & ERP syncing.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 6. COMPARISON: RICOZBOOKS VS TRADITIONAL TOOLS */}
      <section id="comparison" className="py-16 lg:py-24 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <span className="text-xs uppercase tracking-widest font-bold text-[#781019]">
              Engineering Discipline
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
              Why CFOs choose RicozBooks over legacy and generic software
            </h2>
            <p className="text-stone-600 text-sm sm:text-base">
              See the architectural difference between a true double-entry ledger engine and simplified billing apps.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left border-collapse border border-stone-300 rounded-2xl">
              <thead>
                <tr className="bg-stone-100 text-stone-900 border-b border-stone-300">
                  <th className="py-4 px-4 font-bold">Architectural Capability</th>
                  <th className="py-4 px-4 font-extrabold text-[#781019] bg-stone-50 border-x border-stone-300">
                    RicozBooks Enterprise
                  </th>
                  <th className="py-4 px-4 font-medium text-stone-600">Legacy Desktop ERPs</th>
                  <th className="py-4 px-4 font-medium text-stone-600">Generic SMB Billing Apps</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-stone-900">Mathematical Ledger Invariant</td>
                  <td className="py-3.5 px-4 bg-stone-50 font-bold text-emerald-700 border-x border-stone-300">
                    Enforced at DB Level (Zero Drift)
                  </td>
                  <td className="py-3.5 px-4 text-stone-600">Prone to local file corruptions</td>
                  <td className="py-3.5 px-4 text-rose-600">No true GL; single-entry tracking</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-stone-900">Indian GST & E-Invoicing</td>
                  <td className="py-3.5 px-4 bg-stone-50 font-bold text-emerald-700 border-x border-stone-300">
                    Native GSTR-1, 3B, B2B & ITC Rules
                  </td>
                  <td className="py-3.5 px-4 text-stone-600">Requires third-party sync bridge</td>
                  <td className="py-3.5 px-4 text-amber-600">Basic tax % tagging only</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-stone-900">Maker-Checker Governance</td>
                  <td className="py-3.5 px-4 bg-stone-50 font-bold text-emerald-700 border-x border-stone-300">
                    Strict 4-Eyes Workflow with Audit Logs
                  </td>
                  <td className="py-3.5 px-4 text-stone-600">Limited to admin/user passwords</td>
                  <td className="py-3.5 px-4 text-rose-600">Not supported</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-stone-900">Stock & COGS Perpetual Ledger</td>
                  <td className="py-3.5 px-4 bg-stone-50 font-bold text-emerald-700 border-x border-stone-300">
                    Automated FIFO with GL Accounts
                  </td>
                  <td className="py-3.5 px-4 text-stone-600">Complex manual closing journals</td>
                  <td className="py-3.5 px-4 text-rose-600">Stock count only, no GL links</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-stone-900">Multi-Entity & FX Revaluation</td>
                  <td className="py-3.5 px-4 bg-stone-50 font-bold text-emerald-700 border-x border-stone-300">
                    1-Click Switching, Consolidated P&L
                  </td>
                  <td className="py-3.5 px-4 text-stone-600">Separate license per entity</td>
                  <td className="py-3.5 px-4 text-rose-600">Single company only</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-stone-900">Cloud API & Webhook Integration</td>
                  <td className="py-3.5 px-4 bg-stone-50 font-bold text-emerald-700 border-x border-stone-300">
                    Modern RESTful API with Swagger Docs
                  </td>
                  <td className="py-3.5 px-4 text-rose-600">ODBC or local XML export</td>
                  <td className="py-3.5 px-4 text-amber-600">Basic Zapier webhooks</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </section>

      {/* 7. ROLE-BASED LIVE SANDBOX LAUNCHER */}
      <section id="sandboxes" className="py-16 lg:py-24 bg-[#FAF9F6] border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <span className="text-xs uppercase tracking-widest font-bold text-[#781019]">
              Instant Role Sandboxes
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
              One click to experience any role in the company
            </h2>
            <p className="text-stone-600 text-sm sm:text-base">
              No registration required to test. Click below to load pre-configured company data with full permissions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Admin / CFO Sandbox */}
            <div className="p-6 rounded-2xl bg-white border border-stone-200 hover:border-stone-400 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-800">
                  FULL SYSTEM PRIVILEGES
                </div>
                <h3 className="text-lg font-bold text-stone-900">Administrator / CFO</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Access company setup, period locks, GST configurations, user permission controls, and board-level financial reports.
                </p>
              </div>
              <button
                onClick={() => handleDemoLogin('admin@ricozbooks.com')}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-xs"
              >
                <span>Launch Admin Sandbox</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Senior Accountant Sandbox */}
            <div className="p-6 rounded-2xl bg-white border border-stone-200 hover:border-stone-400 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#390003] text-[#E6B676] flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  MAKER PRIVILEGES
                </div>
                <h3 className="text-lg font-bold text-stone-900">Senior Accountant</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Draft multi-line vouchers, generate tax invoices, process vendor bills, track stock movements, and submit batches for review.
                </p>
              </div>
              <button
                onClick={() => handleDemoLogin('accountant@ricozbooks.com')}
                className="w-full py-2.5 px-4 rounded-xl bg-[#390003] hover:bg-[#5B060C] text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-xs"
              >
                <span>Launch Accountant Sandbox</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Reviewer / Auditor Sandbox */}
            <div className="p-6 rounded-2xl bg-white border border-stone-200 hover:border-stone-400 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-800 text-emerald-100 flex items-center justify-center">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  CHECKER & AUDITOR PRIVILEGES
                </div>
                <h3 className="text-lg font-bold text-stone-900">Reviewer & Auditor</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Inspect pending journal approval queues, verify debit-credit line narrations, approve or reject drafts with mandatory notes, and audit closing locks.
                </p>
              </div>
              <button
                onClick={() => handleDemoLogin('reviewer@ricozbooks.com')}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-xs"
              >
                <span>Launch Reviewer Sandbox</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* 8. FREQUENTLY ASKED QUESTIONS */}
      <section id="faq" className="py-16 lg:py-24 bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="text-center space-y-3">
            <span className="text-xs uppercase tracking-widest font-bold text-[#781019]">
              Straight Answers
            </span>
            <h2 className="text-3xl font-extrabold text-stone-900 tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            
            <div className="p-5 rounded-xl border border-stone-200 bg-[#FAF9F6]">
              <h4 className="font-bold text-stone-900 text-sm">
                Can I migrate my existing Chart of Accounts and Opening Balances?
              </h4>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Yes. RicozBooks includes standardized CSV and Excel import templates for your Chart of Accounts, Customers, Vendors, Opening Inventory, and Opening Trial Balance. Our automated parser validates debit-credit equality before posting.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-stone-200 bg-[#FAF9F6]">
              <h4 className="font-bold text-stone-900 text-sm">
                How does the Maker-Checker workflow prevent accounting errors?
              </h4>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Accountants can draft and balance journal vouchers, but vouchers remain in a 'DRAFT' status until reviewed by an authorized Reviewer or Admin. Once approved, the voucher posts immutably to the General Ledger with full cryptographic audit logging.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-stone-200 bg-[#FAF9F6]">
              <h4 className="font-bold text-stone-900 text-sm">
                Does RicozBooks support multiple business entities with separate currencies?
              </h4>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Yes. You can manage unlimited legal entities under one organization. Each entity maintains its own isolated Chart of Accounts, base currency (INR, USD, EUR, etc.), fiscal calendar, and GSTIN, with instantaneous cross-entity switching.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-stone-200 bg-[#FAF9F6]">
              <h4 className="font-bold text-stone-900 text-sm">
                Is my data secure and backed up?
              </h4>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                All data is encrypted in transit via TLS 1.3 and at rest with AES-256 bit encryption. Relational integrity is strictly enforced with continuous automated backups and point-in-time disaster recovery.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 9. CALL TO ACTION FOOTER */}
      <footer className="bg-[#390003] text-stone-200 pt-16 pb-12 border-t border-[#5B060C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[#FAF9F6] text-[#390003] flex items-center justify-center font-bold">
                  <Scale className="w-5 h-5" />
                </div>
                <span className="text-xl font-extrabold tracking-tight text-white">
                  Ricoz<span className="text-[#E6B676]">Books</span>
                </span>
              </div>
              <p className="text-xs text-stone-300 max-w-md leading-relaxed">
                The enterprise double-entry financial platform engineered for founders, CFOs, and tax professionals requiring mathematical precision, complete Indian GST filing, and robust four-eyes internal controls.
              </p>
              <div className="text-[11px] text-[#E6B676] font-mono">
                ISO 27001 Certified Architecture • Indian GSTN Compliant • 99.99% SLA
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-bold text-white uppercase tracking-wider text-[11px]">System Modules</span>
              <ul className="space-y-1.5 text-stone-300">
                <li><Link to="/login" className="hover:text-white">General Ledger</Link></li>
                <li><Link to="/login" className="hover:text-white">Invoicing & AR</Link></li>
                <li><Link to="/login" className="hover:text-white">Bills & AP</Link></li>
                <li><Link to="/login" className="hover:text-white">GST Return Center</Link></li>
                <li><Link to="/login" className="hover:text-white">Inventory Valuation</Link></li>
                <li><Link to="/login" className="hover:text-white">Bank Reconciliation</Link></li>
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-bold text-white uppercase tracking-wider text-[11px]">Company & Sandboxes</span>
              <ul className="space-y-1.5 text-stone-300">
                <li><button onClick={() => handleDemoLogin('admin@ricozbooks.com')} className="hover:text-white">Admin Sandbox</button></li>
                <li><button onClick={() => handleDemoLogin('accountant@ricozbooks.com')} className="hover:text-white">Accountant Sandbox</button></li>
                <li><button onClick={() => handleDemoLogin('reviewer@ricozbooks.com')} className="hover:text-white">Reviewer Sandbox</button></li>
                <li><Link to="/login" className="hover:text-white">Sign In</Link></li>
                <li><Link to="/register" className="hover:text-white">Create New Tenant</Link></li>
              </ul>
            </div>

          </div>

          <div className="pt-8 border-t border-[#5B060C] flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400 gap-4">
            <div>
              &copy; {new Date().getFullYear()} RicozBooks Cloud Inc. All rights reserved. Precision Double-Entry Engine.
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login" className="hover:text-stone-200">Privacy Policy</Link>
              <span>•</span>
              <Link to="/login" className="hover:text-stone-200">Terms of Service</Link>
              <span>•</span>
              <Link to="/login" className="hover:text-stone-200">Security Whitepaper</Link>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};
