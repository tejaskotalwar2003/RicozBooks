import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Building2, 
  Scale, 
  BookOpen, 
  CheckCircle2, 
  ArrowRight, 
  Lock, 
  Users, 
  FileText, 
  BarChart3, 
  Layers, 
  Sparkles,
  ChevronRight,
  Database,
  ExternalLink,
  Menu,
  X
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-[#E6B676]/30 selection:text-[#260002]">
      
      {/* ========================================================================= */}
      {/* 1. NAVBAR */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 bg-[#260002]/95 backdrop-blur-md border-b border-[#390003] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <img 
              src="/logo.jpg" 
              alt="RicozBooks Logo" 
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover shadow-md border border-[#C58B3E]/40 group-hover:scale-105 transition-transform" 
            />
            <div>
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Ricoz<span className="text-[#E6B676]">Books</span>
              </span>
              <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#EEC68B] font-semibold -mt-1">
                by ricoz
              </div>
            </div>
          </Link>

          {/* Navigation Anchors (Desktop) */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold tracking-wide text-slate-200">
            <a href="#features" className="hover:text-[#E6B676] transition-colors">Features</a>
            <a href="#multi-entity" className="hover:text-[#E6B676] transition-colors">Multi-Entity</a>
            <a href="#roles" className="hover:text-[#E6B676] transition-colors">Roles & RBAC</a>
            <a href="#workflow" className="hover:text-[#E6B676] transition-colors">Accounting Workflow</a>
            <a href="#security" className="hover:text-[#E6B676] transition-colors">Security</a>
          </nav>

          {/* Action CTAs (Desktop) */}
          <div className="hidden sm:flex items-center space-x-3">
            <Link
              to="/login"
              className="px-4 py-2 text-xs font-bold text-[#EEC68B] hover:text-white hover:bg-[#390003] rounded-lg transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/get-started"
              className="px-4 py-2 text-xs font-bold bg-[#E6B676] hover:bg-[#EEC68B] text-[#260002] rounded-lg shadow-sm hover:shadow-md transition-all flex items-center space-x-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Hamburger Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#1E0002] border-b border-[#390003] px-4 py-4 space-y-3 shadow-xl">
            <nav className="flex flex-col space-y-2 text-sm font-semibold tracking-wide text-slate-200">
              <a 
                href="#features" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-white/5 hover:text-[#E6B676] transition-colors"
              >
                Features
              </a>
              <a 
                href="#multi-entity" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-white/5 hover:text-[#E6B676] transition-colors"
              >
                Multi-Entity
              </a>
              <a 
                href="#roles" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-white/5 hover:text-[#E6B676] transition-colors"
              >
                Roles & RBAC
              </a>
              <a 
                href="#workflow" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-white/5 hover:text-[#E6B676] transition-colors"
              >
                Accounting Workflow
              </a>
              <a 
                href="#security" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-white/5 hover:text-[#E6B676] transition-colors"
              >
                Security
              </a>
            </nav>
            <div className="pt-3 border-t border-white/10 flex flex-col space-y-2">
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-xs font-bold text-[#EEC68B] bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/get-started"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-xs font-bold bg-[#E6B676] hover:bg-[#EEC68B] text-[#260002] rounded-lg shadow-sm transition-all"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#260002] via-[#2F0003] to-[#1A0002] text-white pt-16 pb-24 lg:pt-24 lg:pb-32">
        {/* Glow Highlights */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#E6B676]/10 blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-[#781019]/25 blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Messaging */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#390003] text-[#EEC68B] border border-[#C58B3E]/30">
                <Sparkles className="w-3.5 h-3.5 text-[#E6B676]" />
                <span>Enterprise Finance & Accounting SaaS</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                Simplify Your Business Accounting with <span className="text-[#E6B676]">RicozBooks</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                A modern, production-grade accounting platform built for high-growth enterprises. Seamlessly manage multi-entity books, enforce strict double-entry ledger integrity, and automate supervisory maker-checker approvals.
              </p>

              {/* CTAs */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  to="/get-started"
                  className="w-full sm:w-auto px-7 py-3.5 bg-[#E6B676] hover:bg-[#EEC68B] text-[#260002] text-sm font-black rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/login"
                  className="w-full sm:w-auto px-7 py-3.5 bg-[#390003] hover:bg-[#4E0004] text-white text-sm font-bold rounded-xl border border-[#C58B3E]/30 transition-all flex items-center justify-center space-x-2"
                >
                  <span>1-Click Demo Login</span>
                  <ChevronRight className="w-4 h-4 text-[#EEC68B]" />
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left border-t border-white/10 text-xs text-slate-300">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Strict Debit = Credit</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Multi-Entity Consolidation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Immutable Audit Trail</span>
                </div>
              </div>

            </div>

            {/* Right Column: Visual Product Showcase Mock */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl bg-[#1E0002] border border-[#C58B3E]/40 p-6 shadow-2xl shadow-black/50 text-white space-y-4">
                
                {/* Mock Card Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-mono text-slate-400 ml-2">Voucher: JE-2026-0001</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-700">
                    POSTED
                  </span>
                </div>

                {/* Voucher Content */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Legal Entity</span>
                    <span className="font-bold text-white">Ricoz Technologies Pvt. Ltd. (INR)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Status Check</span>
                    <span className="text-emerald-400 font-bold flex items-center space-x-1">
                      <Scale className="w-3.5 h-3.5 mr-1" />
                      <span>Balanced (Difference: ₹ 0.00)</span>
                    </span>
                  </div>

                  {/* Lines preview */}
                  <div className="bg-[#260002] rounded-xl border border-white/10 overflow-hidden text-[11px]">
                    <div className="grid grid-cols-12 bg-[#390003]/80 p-2 font-bold text-[#EEC68B] border-b border-white/10">
                      <span className="col-span-6">Account</span>
                      <span className="col-span-3 text-right">Debit</span>
                      <span className="col-span-3 text-right">Credit</span>
                    </div>
                    <div className="grid grid-cols-12 p-2 border-b border-white/5 font-mono">
                      <span className="col-span-6 truncate">1100 — Operating Bank</span>
                      <span className="col-span-3 text-right text-emerald-400 font-bold">₹ 2,50,000</span>
                      <span className="col-span-3 text-right text-slate-500">—</span>
                    </div>
                    <div className="grid grid-cols-12 p-2 font-mono">
                      <span className="col-span-6 truncate">4000 — Sales Revenue</span>
                      <span className="col-span-3 text-right text-slate-500">—</span>
                      <span className="col-span-3 text-right text-rose-400 font-bold">₹ 2,50,000</span>
                    </div>
                  </div>

                  {/* Maker-Checker Stamp */}
                  <div className="p-2.5 rounded-lg bg-[#390003]/50 border border-[#C58B3E]/20 flex items-center justify-between text-[11px]">
                    <span className="text-slate-300">Maker-Checker Authorization</span>
                    <span className="text-[#E6B676] font-semibold">Reviewed & Approved</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. FEATURES SECTION (8 Core Modules) */}
      {/* ========================================================================= */}
      <section id="features" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#781019]">
              Enterprise Breadth & Usability
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              Complete Accounting Engine Built for Precision
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Designed with the breadth of Zoho Books and QuickBooks, but architected with strict financial controls, tamper-evident audit trails, and multi-entity consolidation.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#C58B3E] hover:shadow-md transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#260002] text-[#E6B676] flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Multi-Entity Management</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Consolidate multiple legal entities across India, the US, and the UK with independent GSTINs, jurisdictions, and currencies.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#C58B3E] hover:shadow-md transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#260002] text-[#E6B676] flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Double-Entry Accounting</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Zero tolerance for unbalanced vouchers. Mathematically enforces Total Debit = Total Credit before saving, submitting, or posting.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#C58B3E] hover:shadow-md transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#260002] text-[#E6B676] flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Multi-Line Journal Entries</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dynamic multi-row voucher drafting with real-time balance calculations, line-level narrations, and reference document linking.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#C58B3E] hover:shadow-md transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#260002] text-[#E6B676] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Role-Based Access Control</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enterprise security with strict separation of duties between Admins (CFO), Accountants, and Supervisory Reviewers.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#C58B3E] hover:shadow-md transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#260002] text-[#E6B676] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Review & Approval Workflow</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Maker-checker verification ensures that accountants submit draft journals, while reviewers approve or reject with mandatory reasons.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#C58B3E] hover:shadow-md transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#260002] text-[#E6B676] flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">General Ledger & Statements</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Continuous dynamic running balances, opening balances, closing balances, and one-click voucher drill-downs with CSV export.
              </p>
            </div>

            {/* Feature 7 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#C58B3E] hover:shadow-md transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#260002] text-[#E6B676] flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Secure JWT Authentication</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Industry-standard bcrypt password hashing, encrypted tokens, session management, and granular permission checks on every API.
              </p>
            </div>

            {/* Feature 8 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#C58B3E] hover:shadow-md transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#260002] text-[#E6B676] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Centralized Business Ops</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Switch entities instantly without logging out. Maintain separate books, tax records, and fiscal years under one unified login.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. MULTI-ENTITY MANAGEMENT SHOWCASE */}
      {/* ========================================================================= */}
      <section id="multi-entity" className="py-20 bg-slate-100 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-5">
              <span className="text-xs font-bold uppercase tracking-widest text-[#781019]">
                Enterprise Multi-Entity Architecture
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                One Platform. Multiple Entities. Zero Data Mixing.
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Modern organizations run multiple companies, international subsidiaries, and special purpose entities. RicozBooks allows you to manage all your entities from a single unified workspace while maintaining strict data separation.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start space-x-3">
                  <div className="p-1 rounded-md bg-emerald-100 text-emerald-800 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Independent Chart of Accounts & Ledgers</h4>
                    <p className="text-xs text-slate-500">Each entity has its own isolated accounts, opening balances, and fiscal close schedule.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-1 rounded-md bg-emerald-100 text-emerald-800 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Statutory Tax Identification</h4>
                    <p className="text-xs text-slate-500">Dedicated GSTIN for India, EIN for US entities, and VAT for UK subsidiaries.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-1 rounded-md bg-emerald-100 text-emerald-800 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Multi-Currency Base Support</h4>
                    <p className="text-xs text-slate-500">Transact in INR (₹), USD ($), GBP (£), or EUR (€) with real-time base currency conversion.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Hierarchy Diagram */}
            <div className="lg:col-span-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                
                {/* Organization Node */}
                <div className="p-3.5 rounded-xl bg-[#260002] text-white flex items-center justify-between border border-[#390003]">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-[#390003] text-[#E6B676] flex items-center justify-center font-black text-sm">
                      R
                    </div>
                    <div>
                      <div className="text-xs font-bold">Ricoz Global Organization</div>
                      <div className="text-[10px] text-slate-300">Parent Consolidated Enterprise</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#390003] text-[#EEC68B] font-mono font-bold">
                    Multi-Tenant
                  </span>
                </div>

                <div className="pl-6 border-l-2 border-dashed border-[#C58B3E]/60 space-y-3 my-2">
                  
                  {/* Entity 1 */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Ricoz Technologies Pvt. Ltd.</div>
                      <div className="text-[10px] text-slate-500 font-mono">GSTIN: 27AABCR1234F1Z5 • Currency: INR (₹)</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      India
                    </span>
                  </div>

                  {/* Entity 2 */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Ricoz Innovations Inc.</div>
                      <div className="text-[10px] text-slate-500 font-mono">EIN: 12-3456789 • Currency: USD ($)</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
                      United States
                    </span>
                  </div>

                  {/* Entity 3 */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">BookMyWarehouse Ltd.</div>
                      <div className="text-[10px] text-slate-500 font-mono">VAT: GB987654321 • Currency: GBP (£)</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                      United Kingdom
                    </span>
                  </div>

                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. ROLE-BASED ACCESS (RBAC) SECTION */}
      {/* ========================================================================= */}
      <section id="roles" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#781019]">
              Maker-Checker Governance
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              Role-Based Access for Accounting Integrity
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Enforce statutory segregation of duties. Ensure that no individual can draft and unilaterally post entries to the general ledger without supervisory sign-off.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Role 1: Admin / CFO */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#260002] text-[#E6B676] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Admin / CFO</h3>
                  <span className="text-[11px] font-semibold text-[#781019] uppercase tracking-wider">
                    Full Enterprise Control
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ultimate financial authority over all entities, fiscal period closing, and operational settings.
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#781019]" />
                    <span>Create & manage all legal entities</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#781019]" />
                    <span>Post approved journals to General Ledger</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#781019]" />
                    <span>Generate atomic reversal vouchers</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#781019]" />
                    <span>Full immutable audit trail access</span>
                  </li>
                </ul>
              </div>
              <div className="pt-4 border-t border-slate-200 text-[11px] font-mono text-slate-400">
                Demo: admin@ricozbooks.com
              </div>
            </div>

            {/* Role 2: Accountant */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#260002] text-[#E6B676] flex items-center justify-center font-bold">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Accountant</h3>
                  <span className="text-[11px] font-semibold text-[#781019] uppercase tracking-wider">
                    Day-to-Day Operations
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Responsible for recording transactions, managing the Chart of Accounts, and submitting vouchers for review.
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#781019]" />
                    <span>Create and manage Chart of Accounts</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#781019]" />
                    <span>Draft multi-line double-entry vouchers</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#781019]" />
                    <span>Submit balanced entries for review</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#781019]" />
                    <span>Inspect account general ledgers</span>
                  </li>
                </ul>
              </div>
              <div className="pt-4 border-t border-slate-200 text-[11px] font-mono text-slate-400">
                Demo: accountant@ricozbooks.com
              </div>
            </div>

            {/* Role 3: Reviewer */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#260002] text-[#E6B676] flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Reviewer / Controller</h3>
                  <span className="text-[11px] font-semibold text-[#781019] uppercase tracking-wider">
                    Supervisory Verification
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Supervises the accounting queue, verifying debit/credit balance, tax compliance, and business purposes.
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#781019]" />
                    <span>Dedicated Approvals review queue</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#781019]" />
                    <span>Inspect line accounts & descriptions</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#781019]" />
                    <span>Approve or reject with mandatory reason</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#781019]" />
                    <span>Authorize vouchers for final ledger post</span>
                  </li>
                </ul>
              </div>
              <div className="pt-4 border-t border-slate-200 text-[11px] font-mono text-slate-400">
                Demo: reviewer@ricozbooks.com
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. ACCOUNTING WORKFLOW PIPELINE */}
      {/* ========================================================================= */}
      <section id="workflow" className="py-20 bg-slate-100 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#781019]">
              Strict Accounting Lifecycle
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              From Draft to Immutable Ledger Post
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Every financial transaction follows a predictable, audit-proof lifecycle with real-time double-entry verification.
            </p>
          </div>

          {/* Workflow Steps */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2 relative shadow-xs">
              <span className="text-[10px] font-mono font-bold text-slate-400">STEP 01</span>
              <h4 className="text-sm font-bold text-slate-900">1. Draft Voucher</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Accountant creates entry, assigns accounts, and inputs debits and credits.
              </p>
              <div className="pt-2">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700">
                  Status: DRAFT
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2 relative shadow-xs">
              <span className="text-[10px] font-mono font-bold text-slate-400">STEP 02</span>
              <h4 className="text-sm font-bold text-slate-900">2. Submit for Review</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Backend strictly validates Total Debit == Total Credit and open period before queueing.
              </p>
              <div className="pt-2">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-800 border border-amber-200">
                  Status: SUBMITTED
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2 relative shadow-xs">
              <span className="text-[10px] font-mono font-bold text-slate-400">STEP 03</span>
              <h4 className="text-sm font-bold text-slate-900">3. Review & Verify</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Reviewer inspects line items, tax IDs, and commercial supporting documents.
              </p>
              <div className="pt-2">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-800 border border-blue-200">
                  UNDER REVIEW
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2 relative shadow-xs">
              <span className="text-[10px] font-mono font-bold text-slate-400">STEP 04</span>
              <h4 className="text-sm font-bold text-slate-900">4. Approve or Reject</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Reviewer signs off or returns with a mandatory written justification.
              </p>
              <div className="pt-2">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                  APPROVED / REJECTED
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border-2 border-[#781019] space-y-2 relative shadow-md">
              <span className="text-[10px] font-mono font-bold text-[#781019]">STEP 05</span>
              <h4 className="text-sm font-bold text-slate-900">5. Posted to Ledger</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Voucher becomes strictly immutable. Reversal requires a formal reversing voucher.
              </p>
              <div className="pt-2">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Status: POSTED
                </span>
              </div>
            </div>

          </div>

          {/* Golden Rule Callout */}
          <div className="mt-8 p-4 rounded-xl bg-[#260002] border border-[#C58B3E]/40 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Scale className="w-6 h-6 text-[#E6B676] shrink-0" />
              <div>
                <h5 className="text-sm font-bold">The Golden Double-Entry Invariant</h5>
                <p className="text-xs text-slate-300">
                  RicozBooks rejects any voucher where Total Debit ≠ Total Credit. Your books stay 100% mathematically balanced at all times.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#390003] text-[#EEC68B] text-xs font-mono font-bold border border-[#C58B3E]/30 whitespace-nowrap">
              Σ Debit ≡ Σ Credit
            </span>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. SECURITY & COMPLIANCE */}
      {/* ========================================================================= */}
      <section id="security" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#781019]">
                Enterprise Trust & Compliance
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                Bank-Grade Security Architecture
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Financial data requires zero compromise. RicozBooks is engineered with relational ACID reliability, encrypted data in transit and at rest, and forensic operational audit logs.
              </p>

              <div className="pt-2">
                <Link
                  to="/get-started"
                  className="inline-flex items-center space-x-2 text-xs font-bold text-[#781019] hover:text-[#260002]"
                >
                  <span>Explore security specifications</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <Lock className="w-5 h-5 text-[#781019]" />
                <h4 className="text-sm font-bold text-slate-900">JWT & Bcrypt Encryption</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Cryptographically signed JSON Web Tokens with per-endpoint role validation and secure expiration.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <Database className="w-5 h-5 text-[#781019]" />
                <h4 className="text-sm font-bold text-slate-900">PostgreSQL ACID Transactions</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Atomic row-level locking ensures journals and ledgers are posted simultaneously without race conditions.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <ShieldCheck className="w-5 h-5 text-[#781019]" />
                <h4 className="text-sm font-bold text-slate-900">Forensic Audit Trail</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Every user login, journal submission, approval, rejection, and export is recorded with IP and timestamp.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <Building2 className="w-5 h-5 text-[#781019]" />
                <h4 className="text-sm font-bold text-slate-900">Entity-Level Isolation</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Multi-tenant architecture guarantees users only view records for entities they are explicitly assigned to.
                </p>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. FINAL CTA SECTION */}
      {/* ========================================================================= */}
      <section className="py-20 bg-[#260002] text-white relative overflow-hidden text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative z-10">
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
            Start Managing Your Business Finances with <span className="text-[#E6B676]">RicozBooks</span>
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Experience the power of double-entry accounting, multi-entity financial management, and maker-checker governance today.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/get-started"
              className="w-full sm:w-auto px-8 py-3.5 bg-[#E6B676] hover:bg-[#EEC68B] text-[#260002] text-sm font-black rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 bg-[#390003] hover:bg-[#4E0004] text-white text-sm font-bold rounded-xl border border-[#C58B3E]/30 transition-all"
            >
              Sign In to Your Account
            </Link>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. FOOTER */}
      {/* ========================================================================= */}
      <footer className="bg-[#180002] border-t border-[#390003] text-slate-400 py-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-white/10">
            
            {/* Brand column */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2.5">
                <img src="/logo.jpg" alt="RicozBooks" className="w-8 h-8 rounded-lg object-cover" />
                <span className="font-bold text-lg text-white">Ricoz<span className="text-[#E6B676]">Books</span></span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Accurate Books. Stronger Decisions. Built by <strong>ricoz</strong> for high-growth enterprises worldwide.
              </p>
            </div>

            {/* Product Links */}
            <div className="space-y-2">
              <div className="font-bold text-white uppercase tracking-wider text-[11px]">Product</div>
              <ul className="space-y-1.5">
                <li><a href="#features" className="hover:text-white transition-colors">Core Features</a></li>
                <li><a href="#multi-entity" className="hover:text-white transition-colors">Multi-Entity Architecture</a></li>
                <li><a href="#roles" className="hover:text-white transition-colors">Maker-Checker RBAC</a></li>
                <li><a href="#workflow" className="hover:text-white transition-colors">Double-Entry Engine</a></li>
              </ul>
            </div>

            {/* Platform Links */}
            <div className="space-y-2">
              <div className="font-bold text-white uppercase tracking-wider text-[11px]">Platform</div>
              <ul className="space-y-1.5">
                <li><Link to="/login" className="hover:text-white transition-colors">Sign In / Demo Login</Link></li>
                <li><Link to="/get-started" className="hover:text-white transition-colors">Get Started</Link></li>
                <li><a href="#security" className="hover:text-white transition-colors">Security & Compliance</a></li>
                <li><span className="text-slate-600">API Documentation (Swagger)</span></li>
              </ul>
            </div>

            {/* Contact & Parent Brand */}
            <div className="space-y-2">
              <div className="font-bold text-white uppercase tracking-wider text-[11px]">Parent Brand</div>
              <p className="text-[11px] text-slate-400">
                A member of the <strong>ricoz</strong> product family.
              </p>
              <div className="pt-2 text-[10px] text-slate-500">
                Local Environment • Enterprise v1.0.0
              </div>
            </div>

          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <div>
              © 2026 RicozBooks by ricoz. All rights reserved.
            </div>
            <div className="flex space-x-4">
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Service</span>
              <span>•</span>
              <span>Statutory Accounting Compliance</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};

