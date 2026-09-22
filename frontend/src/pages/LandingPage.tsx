import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Scale, 
  Receipt, 
  FileSpreadsheet, 
  Boxes, 
  FileCheck, 
  FolderKanban, 
  Sparkles, 
  ShieldCheck, 
  Building2, 
  Scale, 
  BookOpen, 
  Lock, 
  CheckCircle2, 
  ArrowRight, 
  Lock, 
  ChevronRight, 
  Building2, 
  Users, 
  FileText, 
  BookOpen, 
  Layers, 
  BarChart3, 
  Layers, 
  Sparkles,
  ChevronRight,
  Database,
  ExternalLink,
  Landmark, 
  CreditCard,
  Menu,
  X
  X,
  CalendarCheck,
  Check,
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeWorkbenchTab, setActiveWorkbenchTab] = useState<'ledger' | 'invoice' | 'gst' | 'inventory' | 'close'>('ledger');
  const navigate = useNavigate();

  const handleDemoLogin = (email: string) => {
    navigate(`/login?demo=${encodeURIComponent(email)}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-[#E6B676]/30 selection:text-[#260002]">
    <div className="min-h-screen bg-[#FAF9F6] text-stone-900 selection:bg-[#E6B676]/30 selection:text-[#390003] font-sans antialiased">
      
      {/* ========================================================================= */}
      {/* 1. NAVBAR */}
      {/* 1. MINIMALIST TOP NOTIFICATION / SYSTEM BADGE */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 bg-[#260002]/95 backdrop-blur-md border-b border-[#390003] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
      <div className="bg-[#260002] text-stone-200 text-xs py-2 px-4 border-b border-[#390003] flex items-center justify-between">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-medium text-[11px] sm:text-xs text-stone-300">
              RicozBooks v1.0 Production Release — Full 22-Module Enterprise Cloud ERP
            </span>
          </div>
          <div className="hidden md:flex items-center space-x-4 text-[11px] text-stone-400">
            <span>Parent Brand: <strong className="text-[#EEC68B]">ricoz</strong></span>
            <span>•</span>
            <span className="text-stone-300">GAAP / IFRS Double-Entry Engine</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. REFINED NAVIGATION BAR */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 bg-[#FAF9F6]/90 backdrop-blur-md border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Logo */}
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <img 
              src="/logo.jpg" 
              alt="RicozBooks Logo" 
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover shadow-md border border-[#C58B3E]/40 group-hover:scale-105 transition-transform" 
              alt="RicozBooks" 
              className="w-9 h-9 rounded-xl object-cover shadow-sm border border-[#C58B3E]/30 group-hover:scale-105 transition-transform" 
            />
            <div>
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Ricoz<span className="text-[#E6B676]">Books</span>
              </span>
              <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#EEC68B] font-semibold -mt-1">
              <div className="flex items-center space-x-1">
                <span className="text-xl font-bold tracking-tight text-stone-900">
                  Ricoz<span className="text-[#781019]">Books</span>
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#390003] text-[#EEC68B] uppercase tracking-wider ml-1">
                  ERP
                </span>
              </div>
              <div className="text-[10px] tracking-widest text-stone-500 uppercase font-medium -mt-0.5">
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
          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-8 text-sm font-medium text-stone-600">
            <a href="#workbench" className="hover:text-[#781019] transition-colors">Live Workbench</a>
            <a href="#modules" className="hover:text-[#781019] transition-colors">22 Modules</a>
            <a href="#comparison" className="hover:text-[#781019] transition-colors">Why RicozBooks</a>
            <a href="#governance" className="hover:text-[#781019] transition-colors">Governance & Locks</a>
            <a href="#pricing" className="hover:text-[#781019] transition-colors">Plans</a>
          </nav>

          {/* Action CTAs (Desktop) */}
          {/* Actions */}
          <div className="hidden sm:flex items-center space-x-3">
            <Link
              to="/login"
              className="px-4 py-2 text-xs font-bold text-[#EEC68B] hover:text-white hover:bg-[#390003] rounded-lg transition-colors"
              className="px-4 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/get-started"
              className="px-4 py-2 text-xs font-bold bg-[#E6B676] hover:bg-[#EEC68B] text-[#260002] rounded-lg shadow-sm hover:shadow-md transition-all flex items-center space-x-1.5"
              to="/login"
              className="px-4 py-2 text-xs font-bold bg-[#390003] hover:bg-[#55080E] text-white rounded-lg shadow-sm hover:shadow transition-all flex items-center space-x-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Explore Live Sandbox</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#EEC68B]" />
            </Link>
          </div>

          {/* Mobile Hamburger Menu Toggle */}
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle Navigation Menu"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

        </div>

        {/* Mobile Navigation Dropdown */}
        {/* Mobile Dropdown */}
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
          <div className="lg:hidden bg-white border-b border-stone-200 px-4 py-4 space-y-3 shadow-lg">
            <nav className="flex flex-col space-y-2 text-sm font-medium text-stone-700">
              <a href="#workbench" onClick={() => setIsMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-stone-50">Live Workbench</a>
              <a href="#modules" onClick={() => setIsMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-stone-50">22 Modules</a>
              <a href="#comparison" onClick={() => setIsMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-stone-50">Why RicozBooks</a>
              <a href="#governance" onClick={() => setIsMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-stone-50">Governance</a>
              <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-stone-50">Plans</a>
            </nav>
            <div className="pt-3 border-t border-white/10 flex flex-col space-y-2">
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-xs font-bold text-[#EEC68B] bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
            <div className="pt-3 border-t border-stone-100 flex flex-col space-y-2">
              <Link to="/login" className="w-full text-center py-2 text-xs font-semibold text-stone-700 bg-stone-100 rounded-lg">
                Sign In
              </Link>
              <Link
                to="/get-started"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-xs font-bold bg-[#E6B676] hover:bg-[#EEC68B] text-[#260002] rounded-lg shadow-sm transition-all"
              >
                Get Started Free
              <Link to="/login" className="w-full text-center py-2 text-xs font-bold bg-[#390003] text-white rounded-lg shadow-sm">
                Explore Live Sandbox
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION */}
      {/* 3. HERO SECTION (EDITORIAL, CLEAN, PURPOSEFUL) */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#260002] via-[#2F0003] to-[#1A0002] text-white pt-16 pb-24 lg:pt-24 lg:pb-32">
        {/* Glow Highlights */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#E6B676]/10 blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-[#781019]/25 blur-3xl pointer-events-none"></div>
      <section className="pt-16 pb-20 lg:pt-24 lg:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-4xl mx-auto space-y-6">
          
          {/* Subtle Tagline Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-stone-100 border border-stone-300/80 text-xs font-medium text-stone-800 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#C58B3E]" />
            <span>Modern Double-Entry Accounting & Cloud ERP</span>
            <span className="text-stone-400">•</span>
            <span className="text-[#781019] font-bold">Zero AI Hype. Pure Ledger Precision.</span>
          </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Messaging */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#390003] text-[#EEC68B] border border-[#C58B3E]/30">
                <Sparkles className="w-3.5 h-3.5 text-[#E6B676]" />
                <span>Enterprise Finance & Accounting SaaS</span>
              </div>
          {/* Master Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-stone-900 leading-[1.12]">
            Accounting software that <br className="hidden sm:inline" />
            <span className="text-[#781019]">doesn’t compromise</span> on the math.
          </h1>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                Simplify Your Business Accounting with <span className="text-[#E6B676]">RicozBooks</span>
              </h1>
          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed font-normal">
            Every invoice, vendor bill, and stock movement mathematically balances down to the penny. Built for growing enterprises that have outgrown basic tools but refuse clunky legacy software.
          </p>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                A modern, production-grade accounting platform built for high-growth enterprises. Seamlessly manage multi-entity books, enforce strict double-entry ledger integrity, and automate supervisory maker-checker approvals.
              </p>
          {/* Direct CTA Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              to="/login"
              className="w-full sm:w-auto px-6 py-3.5 bg-[#390003] hover:bg-[#55080E] text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2"
            >
              <span>Launch Live Sandbox</span>
              <ArrowRight className="w-4 h-4 text-[#EEC68B]" />
            </Link>

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
              to="/register"
              className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-stone-50 text-stone-800 text-sm font-semibold rounded-xl border border-stone-300 shadow-xs hover:shadow transition-all flex items-center justify-center space-x-2"
            >
              <span>Create Company Workspace</span>
              <ArrowUpRight className="w-4 h-4 text-stone-500" />
            </Link>
          </div>

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

          {/* Micro Proof Points */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-stone-500">
            <div className="flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
              <span>Strict Debit = Credit Enforcement</span>
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
            <div className="flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
              <span>Indian GST (GSTR-1 & 3B) + Global FX</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
              <span>Four-Eyes Maker-Checker Approvals</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
              <span>Hard Ledger Locks on Period Close</span>
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
        {/* ========================================================================= */}
        {/* 4. INTERACTIVE LIVE PRODUCT WORKBENCH (REAL PRODUCT SHOWCASE) */}
        {/* ========================================================================= */}
        <div id="workbench" className="mt-14 rounded-2xl bg-white border border-stone-200 shadow-xl overflow-hidden">
          
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
          {/* Top Workbench Tab Selector */}
          <div className="bg-stone-100/90 border-b border-stone-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-stone-500">
              <span className="w-3 h-3 rounded-full bg-rose-400"></span>
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
              <span className="ml-2 font-mono text-stone-600 hidden sm:inline">ricozbooks-core-v1.0.prod</span>
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
            {/* Interactive Tab Buttons */}
            <div className="flex items-center space-x-1 bg-stone-200/80 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveWorkbenchTab('ledger')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeWorkbenchTab === 'ledger' 
                    ? 'bg-white text-[#781019] shadow-xs' 
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                1. General Ledger
              </button>
              <button
                onClick={() => setActiveWorkbenchTab('invoice')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeWorkbenchTab === 'invoice' 
                    ? 'bg-white text-[#781019] shadow-xs' 
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                2. Tax Invoicing & AR
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

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#C58B3E] hover:shadow-md transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#260002] text-[#E6B676] flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Multi-Line Journal Entries</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dynamic multi-row voucher drafting with real-time balance calculations, line-level narrations, and reference document linking.
              </p>
            <div className="hidden sm:flex items-center text-xs text-stone-500 space-x-2 font-mono">
              <span>Entity:</span>
              <span className="font-bold text-stone-800">Ricoz India Pvt Ltd (INR)</span>
            </div>
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
                      <span>Ledger Invariant Balanced (Δ = ₹0.00)</span>
                    </div>
                  </div>
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

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#C58B3E] hover:shadow-md transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#260002] text-[#E6B676] flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
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
              <h3 className="text-base font-bold text-slate-900">General Ledger & Statements</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Continuous dynamic running balances, opening balances, closing balances, and one-click voucher drill-downs with CSV export.
              </p>
            </div>
            )}

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

            {/* Feature 8 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#C58B3E] hover:shadow-md transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#260002] text-[#E6B676] flex items-center justify-center">
                <Layers className="w-5 h-5" />
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
              <h3 className="text-base font-bold text-slate-900">Centralized Business Ops</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Switch entities instantly without logging out. Maintain separate books, tax records, and fiscal years under one unified login.
              </p>
            </div>
            )}

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
            {/* TAB 3: GST RETURN FILING */}
            {activeWorkbenchTab === 'gst' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Independent Chart of Accounts & Ledgers</h4>
                    <p className="text-xs text-slate-500">Each entity has its own isolated accounts, opening balances, and fiscal close schedule.</p>
                    <span className="text-sm font-bold text-stone-900">STATUTORY GST FILING CENTER (Period: Sep 2026)</span>
                    <p className="text-xs text-stone-500">Automated GSTR-1, GSTR-3B, and Input Tax Credit (ITC) Offset Engine</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                    OFFICIAL JSON EXPORT READY
                  </span>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-1 rounded-md bg-emerald-100 text-emerald-800 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-1">
                    <span className="text-stone-500">Gross Output Tax (Sales)</span>
                    <div className="text-lg font-bold text-stone-900 font-mono">₹ 1,84,500.00</div>
                    <span className="text-[10px] text-stone-500">GSTR-3B Table 3.1 Outward Supplies</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Statutory Tax Identification</h4>
                    <p className="text-xs text-slate-500">Dedicated GSTIN for India, EIN for US entities, and VAT for UK subsidiaries.</p>
                  <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-1">
                    <span className="text-stone-500">Eligible ITC (Purchases)</span>
                    <div className="text-lg font-bold text-emerald-700 font-mono">₹ 1,22,300.00</div>
                    <span className="text-[10px] text-emerald-600">GSTR-3B Table 4 All other ITC</span>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-1">
                    <span className="text-stone-500">Net Tax Payable (Cash)</span>
                    <div className="text-lg font-bold text-[#781019] font-mono">₹ 62,200.00</div>
                    <span className="text-[10px] text-stone-500">Table 6 Offset settlement voucher</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-1 rounded-md bg-emerald-100 text-emerald-800 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
                  <span>Generates balanced settlement journal: Dr Output Liability, Cr Input Credit, Cr Bank.</span>
                  <Link to="/login" className="font-bold text-[#781019] hover:underline">Explore GST Module &rarr;</Link>
                </div>
              </div>
            )}

            {/* TAB 4: STOCK VALUATION */}
            {activeWorkbenchTab === 'inventory' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Multi-Currency Base Support</h4>
                    <p className="text-xs text-slate-500">Transact in INR (₹), USD ($), GBP (£), or EUR (€) with real-time base currency conversion.</p>
                    <span className="text-sm font-bold text-stone-900">PERPETUAL INVENTORY LEDGER & VALUATION</span>
                    <p className="text-xs text-stone-500">Weighted Average Cost (WAC) tracking with automatic gain/shrinkage GL adjustments</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    ASSET VALUE: ₹ 8,42,000
                  </span>
                </div>

                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                        <th className="py-2 px-3">Item / SKU</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3 text-right">In Stock</th>
                        <th className="py-2 px-3 text-right">Unit Cost (WAC)</th>
                        <th className="py-2 px-3 text-right">Valuation</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 font-mono">
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-stone-900">Precision Sensor Unit (SKU-PS-90)</td>
                        <td className="py-2.5 px-3 text-stone-500 font-sans">Goods</td>
                        <td className="py-2.5 px-3 text-right font-bold text-stone-900">450 PCS</td>
                        <td className="py-2.5 px-3 text-right">₹ 1,200.00</td>
                        <td className="py-2.5 px-3 text-right font-bold">₹ 5,40,000.00</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-sans font-semibold">Healthy</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-stone-900">Optical Transceiver (SKU-OT-12)</td>
                        <td className="py-2.5 px-3 text-stone-500 font-sans">Goods</td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-700">18 PCS</td>
                        <td className="py-2.5 px-3 text-right">₹ 3,500.00</td>
                        <td className="py-2.5 px-3 text-right font-bold">₹ 63,000.00</td>
                        <td className="py-2.5 px-3 text-amber-700 font-sans font-semibold">Low Stock Alert</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
                  <span>Stock adjustments automatically record Dr Shrinkage Expense / Cr Inventory Asset.</span>
                  <Link to="/login" className="font-bold text-[#781019] hover:underline">View Inventory Module &rarr;</Link>
                </div>
              </div>
            </div>
            )}

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
            {/* TAB 5: PERIOD CLOSE LOCK */}
            {activeWorkbenchTab === 'close' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                  <div>
                    <span className="text-sm font-bold text-stone-900">STATUTORY PERIOD-END CLOSE MANAGER</span>
                    <p className="text-xs text-stone-500">Enforce Hard Ledger Locks so back-dated entries cannot corrupt closed periods</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#390003] text-[#EEC68B] font-mono font-bold">
                    Multi-Tenant
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#390003] text-[#EEC68B] flex items-center space-x-1">
                    <Lock className="w-3 h-3 mr-1" />
                    <span>AUG 2026 HARD-LOCKED</span>
                  </span>
                </div>

                <div className="pl-6 border-l-2 border-dashed border-[#C58B3E]/60 space-y-3 my-2">
                  
                  {/* Entity 1 */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Ricoz Technologies Pvt. Ltd.</div>
                      <div className="text-[10px] text-slate-500 font-mono">GSTIN: 27AABCR1234F1Z5 • Currency: INR (₹)</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-stone-200">
                    <span className="text-stone-500">Bank Reconciliation</span>
                    <div className="text-xs font-bold text-emerald-700 mt-1 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>100% Reconciled</span>
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
                  <div className="p-3 bg-white rounded-xl border border-stone-200">
                    <span className="text-stone-500">Maker-Checker Queue</span>
                    <div className="text-xs font-bold text-emerald-700 mt-1 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>0 Pending Approvals</span>
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
                  <div className="p-3 bg-white rounded-xl border border-stone-200">
                    <span className="text-stone-500">Lock Enforcement</span>
                    <div className="text-xs font-bold text-[#781019] mt-1 flex items-center space-x-1">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Postings Blocked</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                      United Kingdom
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
                  <span>Emergency Reopening requires CFO authorization and is permanently logged in the audit trail.</span>
                  <Link to="/login" className="font-bold text-[#781019] hover:underline">Explore Governance &rarr;</Link>
                </div>

              </div>
            </div>
            )}

          </div>

        </div>

      </section>

      {/* ========================================================================= */}
      {/* 5. ROLE-BASED ACCESS (RBAC) SECTION */}
      {/* 5. THE 22 ENTERPRISE MODULES IN ONE CLEAR BENTO MATRIX */}
      {/* ========================================================================= */}
      <section id="roles" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <section id="modules" className="py-20 bg-white border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#781019]">
              Maker-Checker Governance
              Complete Platform Scope
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              Role-Based Access for Accounting Integrity
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900">
              All 22 Modules Built In. No Fragmented Plugins.
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Enforce statutory segregation of duties. Ensure that no individual can draft and unilaterally post entries to the general ledger without supervisory sign-off.
            <p className="text-stone-600 text-sm leading-relaxed">
              Every financial transaction flows naturally into the double-entry general ledger. Here is everything you get on day one:
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
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
            {/* SUITE 1 */}
            <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 hover:border-[#781019] transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-[#390003] text-[#EEC68B] flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="pt-4 border-t border-slate-200 text-[11px] font-mono text-slate-400">
                Demo: admin@ricozbooks.com
              <div>
                <h3 className="text-base font-bold text-stone-900">Core Accounting Suite</h3>
                <p className="text-xs text-stone-500 mt-1">GAAP & IFRS foundation</p>
              </div>
              <ul className="space-y-2 text-xs text-stone-700">
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-[#781019]" /><span>Chart of Accounts (5-tier)</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-[#781019]" /><span>Journal Entries (Total Debit = Total Credit)</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-[#781019]" /><span>General Ledger running balances</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-[#781019]" /><span>Trial Balance invariant checks</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-[#781019]" /><span>Period Close & Hard Locking</span></li>
              </ul>
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
            {/* SUITE 2 */}
            <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 hover:border-[#781019] transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-[#390003] text-[#EEC68B] flex items-center justify-center font-bold">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="pt-4 border-t border-slate-200 text-[11px] font-mono text-slate-400">
                Demo: accountant@ricozbooks.com
              <div>
                <h3 className="text-base font-bold text-stone-900">Sales & Receivables (AR)</h3>
                <p className="text-xs text-stone-500 mt-1">Order to cash cycle</p>
              </div>
              <ul className="space-y-2 text-xs text-stone-700">
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-[#781019]" /><span>Customers Master & Aging</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-[#781019]" /><span>Estimates with 1-click convert</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-[#781019]" /><span>Sales Orders management</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-[#781019]" /><span>Tax Invoices (Intra/Inter GST)</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-[#781019]" /><span>Recurring Invoices & Credit Notes</span></li>
              </ul>
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
            {/* SUITE 3 */}
            <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 hover:border-[#781019] transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-[#390003] text-[#EEC68B] flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="pt-4 border-t border-slate-200 text-[11px] font-mono text-slate-400">
                Demo: reviewer@ricozbooks.com
              <div>
                <h3 className="text-base font-bold text-stone-900">Procurement & Payables (AP)</h3>
                <p className="text-xs text-stone-500 mt-1">Procure to pay lifecycle</p>
              </div>
              <ul className="space-y-2 text-xs text-stone-700">
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-[#781019]" /><span>Vendors Master & AP balances</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-[#781019]" /><span>Purchase Orders &rarr; Bill conversion</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-[#781019]" /><span>Vendor Bills with tax lines</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-[#781019]" /><span>Debit Notes & Recurring Bills</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-[#781019]" /><span>Disbursements & Bank Reconciliation</span></li>
              </ul>
            </div>

            {/* SUITE 4 */}
            <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 hover:border-[#781019] transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-[#390003] text-[#EEC68B] flex items-center justify-center font-bold">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Operations, GST & SaaS</h3>
                <p className="text-xs text-stone-500 mt-1">Enterprise operations</p>
              </div>
              <ul className="space-y-2 text-xs text-stone-700">
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-[#781019]" /><span>Statutory GST (GSTR-1 & 3B JSON)</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-[#781019]" /><span>Perpetual Inventory & Shrinkage GL</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-[#781019]" /><span>Projects & Timesheet Profitability</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-[#781019]" /><span>Multi-Entity (INR, USD, GBP, EUR)</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-[#781019]" /><span>SaaS Quotas & Forensic Audit Trail</span></li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. ACCOUNTING WORKFLOW PIPELINE */}
      {/* 6. REAL COMPARISON (HONEST & CONVINCING) */}
      {/* ========================================================================= */}
      <section id="workflow" className="py-20 bg-slate-100 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <section id="comparison" className="py-20 bg-[#FAF9F6] border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#781019]">
              Strict Accounting Lifecycle
              The Right Architectural Fit
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              From Draft to Immutable Ledger Post
            <h2 className="text-3xl font-extrabold text-stone-900">
              Why Companies Switch to RicozBooks
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Every financial transaction follows a predictable, audit-proof lifecycle with real-time double-entry verification.
            <p className="text-stone-600 text-sm max-w-xl mx-auto">
              How RicozBooks compares to the two most common alternatives:
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
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-stone-100 text-stone-800 font-bold border-b border-stone-200">
                  <th className="py-3 px-4 w-1/3">Capability</th>
                  <th className="py-3 px-4 text-stone-500">Spreadsheets & Basic Apps</th>
                  <th className="py-3 px-4 text-stone-500">Legacy ERPs (SAP, NetSuite)</th>
                  <th className="py-3 px-4 bg-[#390003] text-[#EEC68B]">RicozBooks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-700">
                <tr>
                  <td className="py-3 px-4 font-semibold text-stone-900">Double-Entry Ledger Integrity</td>
                  <td className="py-3 px-4 text-rose-600">Manual (Formulas break)</td>
                  <td className="py-3 px-4 text-emerald-700 font-medium">Yes</td>
                  <td className="py-3 px-4 bg-[#FAF5EE] font-bold text-[#781019]">Strict Math Invariant (Total Debit = Total Credit)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-stone-900">Maker-Checker Approvals</td>
                  <td className="py-3 px-4 text-rose-600">None</td>
                  <td className="py-3 px-4 text-stone-700">Complex configuration</td>
                  <td className="py-3 px-4 bg-[#FAF5EE] font-bold text-[#781019]">Built-in Four-Eyes Governance</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-stone-900">Indian GST Return Filing</td>
                  <td className="py-3 px-4 text-rose-600">Requires third-party CA export</td>
                  <td className="py-3 px-4 text-stone-700">Heavy add-on costs</td>
                  <td className="py-3 px-4 bg-[#FAF5EE] font-bold text-[#781019]">Native GSTR-1 & 3B JSON + Settlement</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-stone-900">Period-End Hard Locks</td>
                  <td className="py-3 px-4 text-rose-600">None (Anyone can overwrite)</td>
                  <td className="py-3 px-4 text-stone-700">Yes</td>
                  <td className="py-3 px-4 bg-[#FAF5EE] font-bold text-[#781019]">Immutable Locks + Audit Trail</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-stone-900">Setup Time & Complexity</td>
                  <td className="py-3 px-4 text-stone-700">5 minutes (breaks at scale)</td>
                  <td className="py-3 px-4 text-rose-600">3 to 9 months (\$50k+ setup)</td>
                  <td className="py-3 px-4 bg-[#FAF5EE] font-bold text-[#781019]">Instant (Pre-seeded in 2 minutes)</td>
                </tr>
              </tbody>
            </table>
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
        </div>
      </section>

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
      {/* ========================================================================= */}
      {/* 7. DEMO SANDBOX 1-CLICK TESTER (PRACTICAL & IMMEDIATE) */}
      {/* ========================================================================= */}
      <section className="py-16 bg-[#260002] text-white border-b border-[#390003]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          
          <div className="space-y-2">
            <span className="text-xs uppercase font-bold tracking-widest text-[#EEC68B]">
              Ready To Test Right Now
            </span>
            <h2 className="text-3xl font-extrabold text-white">
              Instant 1-Click Sandbox Credentials
            </h2>
            <p className="text-stone-300 text-sm max-w-md mx-auto">
              No registration forms or credit cards required. Click any institutional role to test our live environment:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            
            <button
              onClick={() => handleDemoLogin('admin@ricozbooks.com')}
              className="p-5 rounded-xl bg-[#390003] hover:bg-[#4E0004] border border-[#C58B3E]/40 text-left transition-all hover:scale-[1.02] shadow-md group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#EEC68B] uppercase tracking-wider">Role 1: Executive</span>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </div>
              <div className="text-base font-bold text-white mt-1">Admin / CFO</div>
              <p className="text-xs text-stone-300 mt-1">Full control, hard period locks, SaaS upgrades, and system settings.</p>
              <div className="mt-3 text-[11px] font-mono text-stone-400">admin@ricozbooks.com</div>
            </button>

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
            <button
              onClick={() => handleDemoLogin('reviewer@ricozbooks.com')}
              className="p-5 rounded-xl bg-[#390003] hover:bg-[#4E0004] border border-[#C58B3E]/40 text-left transition-all hover:scale-[1.02] shadow-md group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#EEC68B] uppercase tracking-wider">Role 2: Supervisory</span>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </div>
              <div className="text-base font-bold text-white mt-1">Reviewer / Controller</div>
              <p className="text-xs text-stone-300 mt-1">Supervise voucher queue, review journals, approve or reject with reasons.</p>
              <div className="mt-3 text-[11px] font-mono text-stone-400">reviewer@ricozbooks.com</div>
            </button>

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
            <button
              onClick={() => handleDemoLogin('accountant@ricozbooks.com')}
              className="p-5 rounded-xl bg-[#390003] hover:bg-[#4E0004] border border-[#C58B3E]/40 text-left transition-all hover:scale-[1.02] shadow-md group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#EEC68B] uppercase tracking-wider">Role 3: Operations</span>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </div>
              <div className="text-base font-bold text-white mt-1">Senior Accountant</div>
              <p className="text-xs text-stone-300 mt-1">Draft vouchers, issue invoices, enter vendor bills, reconcile bank statements.</p>
              <div className="mt-3 text-[11px] font-mono text-stone-400">accountant@ricozbooks.com</div>
            </button>

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
      {/* 8. SIMPLE, TRANSPARENT PRICING */}
      {/* ========================================================================= */}
      <section id="security" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <section id="pricing" className="py-20 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#781019]">
              Predictable Pricing
            </span>
            <h2 className="text-3xl font-extrabold text-stone-900">
              Straightforward Plans for Growing Businesses
            </h2>
            <p className="text-stone-600 text-sm">
              All plans include complete double-entry accounting, GST compliance, and audit logs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
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
            {/* FREE */}
            <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
              <div>
                <span className="text-xs font-bold text-stone-500 uppercase">Starter Free</span>
                <div className="text-2xl font-extrabold text-stone-900 mt-1">₹ 0 <span className="text-xs text-stone-500 font-normal">/ mo</span></div>
                <p className="text-xs text-stone-600 mt-1">Solo founders and early businesses.</p>
              </div>
              <ul className="space-y-2 text-xs text-stone-600 border-t border-stone-200 pt-4">
                <li>• 1 Legal Entity</li>
                <li>• Up to 2 User Seats</li>
                <li>• 50 Invoices / mo</li>
                <li>• Core Double-Entry GL</li>
              </ul>
              <Link to="/register" className="block text-center py-2 px-3 text-xs font-bold bg-white border border-stone-300 text-stone-800 rounded-lg hover:bg-stone-100">
                Get Started
              </Link>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <Lock className="w-5 h-5 text-[#781019]" />
                <h4 className="text-sm font-bold text-slate-900">JWT & Bcrypt Encryption</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Cryptographically signed JSON Web Tokens with per-endpoint role validation and secure expiration.
                </p>
            {/* STARTER */}
            <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
              <div>
                <span className="text-xs font-bold text-stone-500 uppercase">Professional</span>
                <div className="text-2xl font-extrabold text-stone-900 mt-1">₹ 1,499 <span className="text-xs text-stone-500 font-normal">/ mo</span></div>
                <p className="text-xs text-stone-600 mt-1">Growing companies needing approvals.</p>
              </div>
              <ul className="space-y-2 text-xs text-stone-600 border-t border-stone-200 pt-4">
                <li>• 2 Legal Entities</li>
                <li>• Up to 5 User Seats</li>
                <li>• Unlimited Invoices</li>
                <li>• Maker-Checker Approvals</li>
                <li>• Indian GST GSTR-1 & 3B</li>
              </ul>
              <Link to="/register" className="block text-center py-2 px-3 text-xs font-bold bg-white border border-stone-300 text-stone-800 rounded-lg hover:bg-stone-100">
                Start Trial
              </Link>
            </div>

              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <Database className="w-5 h-5 text-[#781019]" />
                <h4 className="text-sm font-bold text-slate-900">PostgreSQL ACID Transactions</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Atomic row-level locking ensures journals and ledgers are posted simultaneously without race conditions.
                </p>
            {/* GROWTH */}
            <div className="p-6 rounded-2xl bg-white border-2 border-[#781019] shadow-md space-y-4 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#390003] text-[#EEC68B] text-[10px] font-bold uppercase tracking-wider">
                Most Popular
              </div>

              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <ShieldCheck className="w-5 h-5 text-[#781019]" />
                <h4 className="text-sm font-bold text-slate-900">Forensic Audit Trail</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Every user login, journal submission, approval, rejection, and export is recorded with IP and timestamp.
                </p>
              <div>
                <span className="text-xs font-bold text-[#781019] uppercase">Growth Tier</span>
                <div className="text-2xl font-extrabold text-stone-900 mt-1">₹ 3,999 <span className="text-xs text-stone-500 font-normal">/ mo</span></div>
                <p className="text-xs text-stone-600 mt-1">Scale-ups with multi-entity needs.</p>
              </div>
              <ul className="space-y-2 text-xs text-stone-700 border-t border-stone-200 pt-4">
                <li className="font-semibold">• 5 Legal Entities (Multi-Currency)</li>
                <li className="font-semibold">• Up to 15 User Seats</li>
                <li>• Perpetual Inventory & WAC</li>
                <li>• Period-End Hard Locks</li>
                <li>• Project Timesheet Profitability</li>
              </ul>
              <Link to="/register" className="block text-center py-2 px-3 text-xs font-bold bg-[#390003] hover:bg-[#55080E] text-white rounded-lg shadow-sm">
                Get Growth Plan
              </Link>
            </div>

              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <Building2 className="w-5 h-5 text-[#781019]" />
                <h4 className="text-sm font-bold text-slate-900">Entity-Level Isolation</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Multi-tenant architecture guarantees users only view records for entities they are explicitly assigned to.
                </p>
            {/* ENTERPRISE */}
            <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
              <div>
                <span className="text-xs font-bold text-stone-500 uppercase">Enterprise</span>
                <div className="text-2xl font-extrabold text-stone-900 mt-1">Custom</div>
                <p className="text-xs text-stone-600 mt-1">For multi-national conglomerates.</p>
              </div>

              <ul className="space-y-2 text-xs text-stone-600 border-t border-stone-200 pt-4">
                <li>• Unlimited Legal Entities</li>
                <li>• Unlimited Seats & RBAC</li>
                <li>• Custom Chart of Accounts</li>
                <li>• Dedicated Account Manager</li>
                <li>• 99.99% Uptime SLA</li>
              </ul>
              <Link to="/login" className="block text-center py-2 px-3 text-xs font-bold bg-white border border-stone-300 text-stone-800 rounded-lg hover:bg-stone-100">
                Contact Enterprise
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. FINAL CTA SECTION */}
      {/* 9. REFINED MODERN FOOTER */}
      {/* ========================================================================= */}
      <section className="py-20 bg-[#260002] text-white relative overflow-hidden text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative z-10">
      <footer className="bg-[#1C0002] text-stone-400 py-12 border-t border-[#390003]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
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
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <img src="/logo.jpg" alt="RicozBooks" className="w-8 h-8 rounded-lg object-cover border border-[#C58B3E]/40" />
              <div>
                <div className="text-white font-bold text-base tracking-tight">Ricoz<span className="text-[#E6B676]">Books</span></div>
                <div className="text-[10px] uppercase tracking-widest text-[#EEC68B]">by ricoz</div>
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
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-stone-400">
              <a href="#workbench" className="hover:text-white transition-colors">Workbench</a>
              <a href="#modules" className="hover:text-white transition-colors">All 22 Modules</a>
              <a href="#comparison" className="hover:text-white transition-colors">Comparison</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <Link to="/login" className="text-[#EEC68B] font-semibold hover:underline">Launch Sandbox</Link>
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
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400 gap-4">
            <div>
              © 2026 RicozBooks by ricoz. All rights reserved.
              &copy; {new Date().getFullYear()} Ricoz Global Holdings Inc. All rights reserved.
            </div>
            <div className="flex space-x-4">
              <span>Privacy Policy</span>
            <div className="flex items-center space-x-4 text-[11px]">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bank-Grade 256-Bit TLS Encryption</span>
              </span>
              <span>•</span>
              <span>Terms of Service</span>
              <span>•</span>
              <span>Statutory Accounting Compliance</span>
              <span>GAAP / IFRS Double-Entry Compliant</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
