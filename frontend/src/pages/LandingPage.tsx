import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Scale, 
  Receipt, 
  FileSpreadsheet, 
  Boxes, 
  FileCheck, 
  ShieldCheck, 
  Building2, 
  Lock, 
  CheckCircle2, 
  ArrowRight, 
  ChevronRight, 
  ChevronDown,
  Users, 
  BarChart3, 
  Database, 
  Check, 
  Menu, 
  X, 
  Clock, 
  Landmark, 
  LineChart, 
  Server, 
  Activity, 
  UserCheck, 
  Briefcase, 
  DollarSign 
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  // Navigation scroll state
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Interactive Multi-Entity Switcher state
  const [selectedEntity, setSelectedEntity] = useState<'ricoz' | 'bmw' | 'techcorp'>('ricoz');

  // Interactive Modules Tab state
  const [activeModuleTab, setActiveModuleTab] = useState<string>('accounting');

  // Interactive Dashboard Date Range Filter
  const [dashboardRange, setDashboardRange] = useState<'Q3_2026' | 'MTD' | 'YTD'>('Q3_2026');

  // FAQ Accordion open state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Scroll listener for sticky navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  // Sample dynamic data per entity
  const entityData = {
    ricoz: {
      name: 'Ricoz Innovation Pvt Ltd',
      code: 'RICOZ_HQ',
      gstin: '27AABCR1234F1Z5',
      currency: 'INR',
      symbol: '₹',
      revenue: '₹ 84,20,500',
      expenses: '₹ 51,10,200',
      grossProfit: '₹ 33,10,300',
      netProfit: '₹ 24,80,000',
      cashBank: '₹ 42,90,000',
      receivables: '₹ 14,30,000',
      payables: '₹ 8,90,000',
      growth: '+28.4%',
      pendingApprovals: 3,
      healthScore: '99.4% Balanced',
      recentTx: [
        { desc: 'TechCorp Cloud Retainer Invoice', type: 'INVOICE', amount: '+₹ 3,54,000', status: 'PAID' },
        { desc: 'AWS Infrastructure Hosting', type: 'BILL', amount: '-₹ 88,400', status: 'APPROVED' },
        { desc: 'GSTR-3B Tax Offset Settlement', type: 'JOURNAL', amount: '-₹ 1,12,000', status: 'POSTED' }
      ]
    },
    bmw: {
      name: 'BookMyWarehouse Logistics Ltd',
      code: 'BMW_LOGISTICS',
      gstin: '29AABCB5678G2Z1',
      currency: 'INR',
      symbol: '₹',
      revenue: '₹ 1,42,80,000',
      expenses: '₹ 98,20,400',
      grossProfit: '₹ 44,59,600',
      netProfit: '₹ 31,40,000',
      cashBank: '₹ 68,15,000',
      receivables: '₹ 22,40,000',
      payables: '₹ 19,10,000',
      growth: '+34.1%',
      pendingApprovals: 5,
      healthScore: '100% Balanced',
      recentTx: [
        { desc: 'Hub Logistics 3PL Service Fee', type: 'INVOICE', amount: '+₹ 6,40,000', status: 'PAID' },
        { desc: 'Fleet Fuel & Transit Fleet Bill', type: 'BILL', amount: '-₹ 2,15,000', status: 'APPROVED' },
        { desc: 'Cold Storage Equipment Depreciation', type: 'JOURNAL', amount: '-₹ 95,000', status: 'POSTED' }
      ]
    },
    techcorp: {
      name: 'Company 03 — Global Ventures',
      code: 'CORP_03',
      gstin: '33AABCT9988H3Z9',
      currency: 'INR',
      symbol: '₹',
      revenue: '₹ 38,90,000',
      expenses: '₹ 21,30,000',
      grossProfit: '₹ 17,60,000',
      netProfit: '₹ 12,90,000',
      cashBank: '₹ 18,40,000',
      receivables: '₹ 6,80,000',
      payables: '₹ 4,20,000',
      growth: '+19.2%',
      pendingApprovals: 1,
      healthScore: '99.8% Balanced',
      recentTx: [
        { desc: 'SaaS License Enterprise Tier', type: 'INVOICE', amount: '+₹ 1,80,000', status: 'PAID' },
        { desc: 'Professional Legal & Audit Retainer', type: 'BILL', amount: '-₹ 65,000', status: 'APPROVED' },
        { desc: 'Intercompany Service Reimbursement', type: 'JOURNAL', amount: '+₹ 45,000', status: 'POSTED' }
      ]
    }
  };

  const currentEnt = entityData[selectedEntity];

  // Core Product Modules Definition
  const coreModules = [
    {
      id: 'accounting',
      title: 'Accounting',
      icon: Scale,
      color: 'indigo',
      badge: 'Core Ledger',
      desc: 'The bedrock of your financial operations with balanced double-entry validation.',
      items: ['Chart of Accounts (5-tier COA)', 'Journal Entries & Voucher Drafts', 'General Ledger Drilldown', 'Real-Time Trial Balance', 'Dynamic Balance Sheet', 'Profit & Loss Statement']
    },
    {
      id: 'sales',
      title: 'Sales & Invoicing',
      icon: Receipt,
      color: 'blue',
      badge: 'Receivables',
      desc: 'Issue audit-ready GST invoices, track aged receivables, and collect payments.',
      items: ['Customer Directory & Credit Terms', 'Automated GST Invoices (B2B & B2C)', 'Aged Receivables (30/60/90 Days)', 'Live Payment Portal & Dynamic UPI QR']
    },
    {
      id: 'purchases',
      title: 'Purchases & AP',
      icon: FileSpreadsheet,
      color: 'emerald',
      badge: 'Payables',
      desc: 'Streamline vendor procurement, bill verification, and cash disbursements.',
      items: ['Vendor Profiles & GSTIN Lookup', 'Vendor Bills & Three-Way Matching', 'Accounts Payable Aging Schedules', 'Vendor Payments & Settlement Journals']
    },
    {
      id: 'expenses',
      title: 'Expenses',
      icon: DollarSign,
      color: 'amber',
      badge: 'Disbursements',
      desc: 'Employee expense claims, categorized disbursement, and approval controls.',
      items: ['Categorized Expense Claims', 'Multi-Level Approval Rules', 'Direct Bank Reimbursements', 'Cost Center & Department Tracking']
    },
    {
      id: 'inventory',
      title: 'Inventory & COGS',
      icon: Boxes,
      color: 'indigo',
      badge: 'FIFO Valuation',
      desc: 'Keep physical stock aligned with continuous accounting ledger valuations.',
      items: ['SKU & Product Master with HSN/SAC', 'FIFO Stock Valuation Batches', 'Real-Time COGS Ledger Sync', 'Audit-Logged Stock Adjustments']
    },
    {
      id: 'banking',
      title: 'Banking & Cash',
      icon: Landmark,
      color: 'blue',
      badge: 'Reconciliation',
      desc: 'Centralize corporate bank accounts, import statements, and match transactions.',
      items: ['Corporate Bank Accounts', 'CSV/OFX Statement Import', 'Automated Transaction Matching', 'Reconciliation Percentage Tracking']
    },
    {
      id: 'gst',
      title: 'Indian GST Suite',
      icon: FileCheck,
      color: 'emerald',
      badge: 'Statutory Compliance',
      desc: 'Automated GSTR-1 outward filing and GSTR-3B input credit waterfall offset.',
      items: ['GSTR-1 Outward Supplies & HSN Summary', 'GSTR-3B Table 4 Eligible ITC Waterfall', '1-Click Statutory GL Settlement', 'Official JSON Export for GST Portal']
    },
    {
      id: 'reports',
      title: 'Financial Reports',
      icon: BarChart3,
      color: 'indigo',
      badge: 'Intelligence',
      desc: 'Instant financial statements and executive dashboards across all entities.',
      items: ['Multi-Entity Consolidated Trial Balance', 'Comparative Income Statements', 'Cash Flow & Runway Predictor', 'Audit Trail Logs & Voucher History']
    }
  ];

  // FAQ Items
  const faqList = [
    {
      q: 'What is RicozBooks?',
      a: 'RicozBooks is a Financial Operating Platform designed for growing multi-entity businesses, SMEs, CFOs, and CA firms. It unifies complete double-entry general ledger accounting, Indian GST return generation, four-eyes financial approvals, FIFO inventory valuation, and multi-entity operations in one enterprise cloud application.'
    },
    {
      q: 'Who is RicozBooks designed for?',
      a: 'RicozBooks is built for business owners, CFOs, in-house accountants, financial reviewers, SMEs, and Chartered Accountant (CA) firms managing multiple legal entities who require stronger financial governance, audit trails, and automated compliance.'
    },
    {
      q: 'Can I manage multiple legal entities?',
      a: 'Yes. RicozBooks has native multi-entity architecture. Each company organization can create and manage multiple legal entities with independent GSTINs, currencies, charts of accounts, and fiscal years, while allowing centralized administrative control and consolidated reporting.'
    },
    {
      q: 'What user roles are supported?',
      a: 'RicozBooks implements granular Role-Based Access Control (RBAC) with five standard roles: Admin (CFO/Owner with full authority), Org Admin, Accountant (creates vouchers, invoices, bills), Reviewer (authorized to approve vouchers and close periods), and Employee.'
    },
    {
      q: 'What is the Four-Eyes Financial Approval Workflow?',
      a: 'The Four-Eyes Principle ensures that no high-impact financial transaction is posted to the ledger by a single person. An Accountant drafts a voucher, which is submitted to a Reviewer or CFO for formal validation and approval before it is immutably committed to the General Ledger.'
    },
    {
      q: 'Does RicozBooks support Indian GST?',
      a: 'Yes. RicozBooks includes a dedicated Indian GST Center that auto-populates GSTR-1 (B2B invoices and HSN Table 12 summaries) and GSTR-3B (Table 3.1 outward tax liability and Table 4 eligible Input Tax Credit). It supports 1-click statutory settlement with automatic double-entry journal posting and official JSON export.'
    },
    {
      q: 'Does RicozBooks support inventory and COGS?',
      a: 'Yes. RicozBooks tracks physical stock using First-In, First-Out (FIFO) batch valuation. Whenever a sales invoice is finalized, the platform automatically calculates the exact cost of goods sold and posts a real-time COGS journal entry (Debit COGS 5000 / Credit Inventory 1300).'
    },
    {
      q: 'Can I reconcile bank statements?',
      a: 'Yes. You can manage multiple bank accounts, import electronic bank statements (CSV/OFX), match bank transactions with ledger receipts and disbursements, and track your reconciled percentage with audit timestamps.'
    },
    {
      q: 'Does RicozBooks provide financial reports?',
      a: 'Yes. RicozBooks generates real-time Trial Balance, Profit & Loss Statements (Income Statement), Balance Sheet (Assets = Liabilities + Equity), General Ledger transaction drilldowns, and Cash Flow metrics for any date range or accounting period.'
    },
    {
      q: 'How does RicozBooks protect financial data?',
      a: 'RicozBooks enforces strict tenant isolation, JWT encrypted session tokens, hard fiscal period close locks (preventing retroactive tampering), and an immutable append-only audit trail that logs every financial transaction, approval, and entity configuration change.'
    },
    {
      q: 'Is pricing available?',
      a: 'Pricing is currently under market and customer validation. During this rollout phase, organizations can request early access or schedule an interactive live walkthrough with our solutions team.'
    },
    {
      q: 'Is RicozBooks available as a cloud application?',
      a: 'Yes. RicozBooks is 100% cloud-native, deployed on modern high-availability infrastructure with 99.99% uptime, accessible securely from any web browser on desktop and mobile devices.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-indigo-500/20 selection:text-indigo-900 font-sans antialiased overflow-x-hidden">

      {/* ========================================================= */}
      {/* 2. NAVBAR                                                 */}
      {/* ========================================================= */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs py-3.5' 
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Left: Brand Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-white shadow-sm ring-1 ring-white/10 group-hover:bg-indigo-600 transition-colors">
              <Scale className="w-5 h-5 text-indigo-400 group-hover:text-white transition-colors" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-1">
                <span className="text-xl font-extrabold tracking-tight text-slate-950">Ricoz</span>
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">Books</span>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                By Ricoz Innovation
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
            <a href="#product" className="hover:text-slate-950 transition-colors">Product</a>
            <a href="#solutions" className="hover:text-slate-950 transition-colors">Solutions</a>
            <a href="#modules" className="hover:text-slate-950 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-slate-950 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-slate-950 transition-colors">Resources</a>
          </nav>

          {/* Right: Actions */}
          <div className="hidden sm:flex items-center space-x-3">
            <Link 
              to="/login"
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 transition-colors rounded-lg hover:bg-slate-100"
            >
              Sign In
            </Link>
            <Link 
              to="/login"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-950 text-white hover:bg-indigo-600 shadow-sm transition-all flex items-center space-x-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Hamburger Toggle */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Toggle Navigation"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 shadow-lg animate-in fade-in slide-in-from-top-2">
            <nav className="flex flex-col space-y-2 text-sm font-medium text-slate-700">
              <a 
                href="#product" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-100"
              >
                Product
              </a>
              <a 
                href="#solutions" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-100"
              >
                Solutions
              </a>
              <a 
                href="#modules" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-100"
              >
                Features & Modules
              </a>
              <a 
                href="#pricing" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-100"
              >
                Pricing
              </a>
              <a 
                href="#faq" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-100"
              >
                FAQ & Resources
              </a>
            </nav>
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link 
                to="/login"
                className="w-full text-center py-2 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg"
              >
                Sign In
              </Link>
              <Link 
                to="/login"
                className="w-full text-center py-2 text-xs font-semibold bg-slate-950 text-white rounded-lg shadow-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================= */}
      {/* 3. HERO SECTION                                           */}
      {/* ========================================================= */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        {/* Subtle background radial light glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-gradient-to-tr from-indigo-500/10 via-blue-500/10 to-emerald-500/5 blur-3xl rounded-full pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            <span>RICOZBOOKS CLOUD</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-slate-950 tracking-tight leading-[1.1] max-w-5xl mx-auto">
            Accounting. Control. Intelligence.
          </h1>

          {/* Alternative supporting headline */}
          <h2 className="mt-4 text-xl sm:text-2xl font-bold text-slate-700 max-w-3xl mx-auto">
            The Financial Operating Platform for Growing Multi-Entity Businesses
          </h2>

          {/* Description */}
          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Manage accounting, GST, financial controls, reporting, and multi-entity operations in one powerful cloud platform.
          </p>

          {/* Primary & Secondary CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              to="/login"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-950 hover:bg-indigo-600 text-white font-semibold text-sm shadow-md hover:shadow-indigo-500/20 transition-all flex items-center justify-center space-x-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#dashboard-preview"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm border border-slate-300 shadow-xs transition-all flex items-center justify-center space-x-2"
            >
              <Activity className="w-4 h-4 text-indigo-600" />
              <span>Book a Demo</span>
            </a>
          </div>

          {/* Trust / Status Badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5 text-xs font-semibold text-slate-600">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Complete Double-Entry Ledger</span>
            </div>
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <span>Indian GST Return Suite</span>
            </div>
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Four-Eyes Financial Governance</span>
            </div>
          </div>

          {/* Small Credibility Indicators */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>49/49 Tests Passing</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>GSTN / E-Invoice Ready</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>Live on Render Cloud</span>
            </span>
          </div>

          {/* HERO VISUAL: Realistic RicozBooks Application Dashboard */}
          <div id="dashboard-preview" className="mt-14 max-w-6xl mx-auto scroll-mt-24">
            <div className="relative rounded-2xl bg-slate-900 p-2 sm:p-3 shadow-2xl ring-1 ring-slate-800/80">
              {/* Window Title Bar */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-950 rounded-xl mb-2 text-xs border border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-400 font-mono text-[11px] ml-2 hidden sm:inline">app.ricozbooks.com/dashboard</span>
                </div>
                {/* Interactive Entity Selector inside Dashboard Mockup */}
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 text-[11px] hidden sm:inline">Active Entity:</span>
                  <div className="bg-slate-800 text-white font-semibold text-[11px] px-2.5 py-1 rounded-md border border-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{currentEnt.name.split(' ')[0]}</span>
                    <span className="text-slate-400 font-mono text-[10px]">({currentEnt.code})</span>
                  </div>
                </div>
              </div>

              {/* Inside Dashboard Application Body */}
              <div className="bg-white rounded-xl p-4 sm:p-6 text-left border border-slate-200">
                {/* Dashboard Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div>
                    <h3 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                      <span>Executive Financial Overview</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                        {currentEnt.healthScore}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Consolidated double-entry records for <strong className="text-slate-800">{currentEnt.name}</strong> • GSTIN: <span className="font-mono text-slate-700">{currentEnt.gstin}</span>
                    </p>
                  </div>
                  
                  {/* Date range filter */}
                  <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold text-slate-600">
                    {(['Q3_2026', 'MTD', 'YTD'] as const).map((range) => (
                      <button
                        key={range}
                        onClick={() => setDashboardRange(range)}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          dashboardRange === range 
                            ? 'bg-white text-slate-900 shadow-xs' 
                            : 'hover:text-slate-950'
                        }`}
                      >
                        {range.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dashboard Metric Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-5">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Revenue</span>
                    <div className="text-base sm:text-lg font-extrabold text-slate-950 font-mono mt-1">{currentEnt.revenue}</div>
                    <span className="text-[10px] text-emerald-600 font-semibold">{currentEnt.growth} vs prior</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Expenses</span>
                    <div className="text-base sm:text-lg font-extrabold text-slate-950 font-mono mt-1">{currentEnt.expenses}</div>
                    <span className="text-[10px] text-slate-500">COGS + OpEx</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Net Profit</span>
                    <div className="text-base sm:text-lg font-extrabold text-emerald-700 font-mono mt-1">{currentEnt.netProfit}</div>
                    <span className="text-[10px] text-emerald-600 font-semibold">29.4% Margin</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cash & Bank</span>
                    <div className="text-base sm:text-lg font-extrabold text-blue-700 font-mono mt-1">{currentEnt.cashBank}</div>
                    <span className="text-[10px] text-blue-600 font-semibold">3 Accounts</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Receivables</span>
                    <div className="text-base sm:text-lg font-extrabold text-amber-700 font-mono mt-1">{currentEnt.receivables}</div>
                    <span className="text-[10px] text-amber-600 font-semibold">Current (0-30d)</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Payables</span>
                    <div className="text-base sm:text-lg font-extrabold text-slate-900 font-mono mt-1">{currentEnt.payables}</div>
                    <span className="text-[10px] text-slate-500 font-semibold">Scheduled</span>
                  </div>
                </div>

                {/* Dashboard Chart & Pending Approvals Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-5">
                  {/* Revenue vs Expense Bar Representation */}
                  <div className="lg:col-span-2 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-900">Revenue & Expense Cash Flow Distribution</span>
                      <span className="text-[11px] font-mono text-slate-500">Debit = Credit Ledger Verified</span>
                    </div>

                    {/* Progress bars visualizing inflow vs outflow */}
                    <div className="space-y-3 pt-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-700">Gross Inflow (Invoices & Receipts)</span>
                          <span className="font-mono font-bold text-slate-950">{currentEnt.revenue}</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: '85%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-700">Cost of Goods Sold (FIFO Synchronized)</span>
                          <span className="font-mono font-bold text-slate-950">₹ 28,50,000</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: '42%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-700">Operating Expenses & Vendor Bills</span>
                          <span className="font-mono font-bold text-slate-950">{currentEnt.expenses}</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: '60%' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Approvals & Health Widget */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900">Four-Eyes Governance</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {currentEnt.pendingApprovals} Pending Review
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-3">
                        Vouchers submitted by accountants awaiting CFO authorization before ledger posting.
                      </p>

                      <div className="space-y-2 text-xs">
                        {currentEnt.recentTx.map((tx, idx) => (
                          <div key={idx} className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                            <div className="truncate pr-2">
                              <div className="font-semibold text-slate-900 truncate">{tx.desc}</div>
                              <span className="text-[10px] text-slate-400 font-mono">{tx.type}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-mono font-bold text-slate-900 text-xs">{tx.amount}</div>
                              <span className="text-[10px] text-emerald-600 font-semibold">{tx.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-200 flex items-center justify-between text-xs text-indigo-700 font-semibold">
                      <span>Live Double-Entry Balance</span>
                      <span className="font-mono">Δ 0.00 (Balanced)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. PRODUCT INTRODUCTION                                   */}
      {/* ========================================================= */}
      <section id="product" className="py-20 bg-white border-t border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              One platform for your financial operations.
            </h2>
            <p className="mt-3 text-base text-slate-600">
              RicozBooks connects accounting, financial control, compliance, reporting, and business operations into one centralized platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Multi-Entity */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-950">Multi-Entity Finance</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Manage multiple legal entities, branch offices, and business units from a single centralized platform with isolated records and unified oversight.
              </p>
            </div>

            {/* Card 2: Double-Entry Controls */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-950">Double-Entry Controls</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Maintain structured financial records with strict debit = credit validation across all journals, invoices, bills, and expense disbursements.
              </p>
            </div>

            {/* Card 3: GST & Reporting */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <FileCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-950">GST & Reporting</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Support Indian GST workflows including automated GSTR-1, GSTR-3B ITC waterfall calculation, and real-time statutory ledger settlement.
              </p>
            </div>

            {/* Card 4: Audit-Ready Governance */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-950">Audit-Ready Governance</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Maintain controlled four-eyes approval workflows, hard fiscal period locks to prevent retroactive tampering, and immutable audit trails.
              </p>
            </div>

            {/* Card 5: Role-Based Access */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-950">Role-Based Access</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Give users access strictly based on their responsibilities: CFOs, accountants, reviewers, and team members operate in segregated workspaces.
              </p>
            </div>

            {/* Card 6: Financial Intelligence */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <LineChart className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-950">Financial Intelligence</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Turn transactional data into clear business visibility with instant balance sheets, P&L statements, aged AR/AP, and cash runway projections.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. PROBLEM SECTION (Dark Premium Section #09090B)         */}
      {/* ========================================================= */}
      <section className="py-24 bg-[#09090B] text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 block mb-2">
              The Reality of Growing Businesses
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
              Business finance shouldn't be complicated.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-400">
              Growing businesses need more than billing. They need financial control, reliable accounting, and clear visibility.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4 font-mono font-bold">
                01
              </div>
              <h3 className="text-lg font-bold text-white">Scattered Financial Data</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Different entities, separate bank accounts, unorganized spreadsheets, and disparate reports make unified visibility nearly impossible.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 font-mono font-bold">
                02
              </div>
              <h3 className="text-lg font-bold text-white">Manual Accounting</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Repetitive data entry, manual GST tax calculations, and disjointed bank reconciliation consume valuable accounting team hours.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 font-mono font-bold">
                03
              </div>
              <h3 className="text-lg font-bold text-white">Weak Financial Controls</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Without structured four-eyes approvals, unchecked modifications and unauthorized adjustments move silently into the general ledger.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 font-mono font-bold">
                04
              </div>
              <h3 className="text-lg font-bold text-white">Limited Business Visibility</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Business leaders and CFOs wait weeks for month-end close to understand true cash positions, gross margins, and tax liabilities.
              </p>
            </div>
          </div>

          {/* Transition Banner */}
          <div className="mt-14 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-blue-950/80 border border-indigo-500/30 text-center max-w-3xl mx-auto shadow-xl">
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              RicozBooks brings everything together.
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-indigo-200">
              A single platform designed to give growing organizations real financial control and reliable, audit-proof books.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. CORE PRODUCT MODULES                                   */}
      {/* ========================================================= */}
      <section id="modules" className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-2">
              Comprehensive Financial Engine
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Everything your finance team needs.
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Explore 8 fully integrated modules built to standard double-entry specifications.
            </p>
          </div>

          {/* Interactive Module Tabs */}
          <div className="flex items-center justify-center flex-wrap gap-2 mb-10">
            {coreModules.map((mod) => {
              const Icon = mod.icon;
              const isActive = activeModuleTab === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModuleTab(mod.id)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-slate-950 text-white shadow-md' 
                      : 'bg-white text-slate-700 hover:text-slate-950 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span>{mod.title}</span>
                </button>
              );
            })}
          </div>

          {/* Active Module Showcase Card */}
          {(() => {
            const currentMod = coreModules.find((m) => m.id === activeModuleTab) || coreModules[0];
            const Icon = currentMod.icon;
            return (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10 transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                  <div className="flex items-start sm:items-center space-x-4">
                    <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600">
                      <Icon className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-2xl font-bold text-slate-950">{currentMod.title}</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {currentMod.badge}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1 max-w-xl">{currentMod.desc}</p>
                    </div>
                  </div>
                  <Link
                    to="/login"
                    className="inline-flex items-center space-x-2 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>Launch {currentMod.title} Console</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
                  {currentMod.items.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center space-x-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-semibold text-slate-800">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. MULTI-ENTITY SECTION (Major Differentiator)            */}
      {/* ========================================================= */}
      <section id="solutions" className="py-24 bg-white border-t border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-2">
              Enterprise Multi-Entity Architecture
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight">
              One platform. Every entity. Complete control.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600">
              Manage multiple legal entities without losing visibility or control over individual financial records.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Visual Architecture Hierarchy */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 text-white border border-slate-800 shadow-md">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-indigo-600/30 text-indigo-400">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">RicozBooks Cloud Tenant</h4>
                    <p className="text-[11px] text-slate-400">Isolated Organization Database & RBAC Layer</p>
                  </div>
                </div>
              </div>

              <div className="pl-6 border-l-2 border-indigo-200 ml-6 space-y-3 py-1">
                {/* Switcher Buttons for Interactive Preview */}
                {(['ricoz', 'bmw', 'techcorp'] as const).map((key) => {
                  const ent = entityData[key];
                  const isSelected = selectedEntity === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedEntity(key)}
                      className={`w-full p-3.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? 'bg-indigo-50 border-indigo-400 shadow-sm ring-2 ring-indigo-500/20' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Building2 className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{ent.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">GSTIN: {ent.gstin}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isSelected ? 'Active Preview' : 'Switch'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-600">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Granular Entity-Level Segregation</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Accounts, users, vouchers, tax liabilities, and statutory statements remain completely isolated per legal entity while providing executive consolidation.
                </p>
              </div>
            </div>

            {/* Interactive Live Entity Dashboard Preview */}
            <div className="lg:col-span-7 bg-[#F8FAFC] rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                    Selected Entity Profile
                  </span>
                  <h3 className="text-lg font-bold text-slate-950">{currentEnt.name}</h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                  {currentEnt.code}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4">
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Revenue</span>
                  <div className="font-mono font-bold text-sm text-slate-900 mt-1">{currentEnt.revenue}</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Expenses</span>
                  <div className="font-mono font-bold text-sm text-slate-900 mt-1">{currentEnt.expenses}</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Net Profit</span>
                  <div className="font-mono font-bold text-sm text-emerald-700 mt-1">{currentEnt.netProfit}</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Bank Balance</span>
                  <div className="font-mono font-bold text-sm text-blue-700 mt-1">{currentEnt.cashBank}</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-900 block">Five Core Multi-Entity Capabilities</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 pt-1">
                  <div className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Multi-entity management</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Tenant data isolation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Centralized admin access</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Entity-level GST reporting</span>
                  </div>
                  <div className="flex items-center space-x-2 col-span-1 sm:col-span-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Role-based permissions per business unit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 8. FOUR-EYES FINANCIAL GOVERNANCE                         */}
      {/* ========================================================= */}
      <section className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-2">
              Four-Eyes Approval Workflow
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight">
              Every important transaction deserves a second set of eyes.
            </h2>
            <p className="mt-4 text-base text-slate-600">
              Separate preparation from approval to strengthen financial governance and reduce the risk of unauthorized changes.
            </p>
          </div>

          {/* Process Timeline Diagram */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs relative">
              <span className="text-[11px] font-mono font-bold text-indigo-600 block mb-1">01 — PREPARATION</span>
              <div className="flex items-center space-x-2 mb-3">
                <Users className="w-5 h-5 text-slate-900" />
                <h3 className="font-bold text-base text-slate-900">Accountant</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Drafts balanced journal entry, invoice, or vendor bill. Double-entry validation ensures debit equals credit.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Status:</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">DRAFT / SUBMITTED</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-white border border-indigo-300 shadow-sm ring-2 ring-indigo-500/10 relative">
              <span className="text-[11px] font-mono font-bold text-indigo-600 block mb-1">02 — VERIFICATION</span>
              <div className="flex items-center space-x-2 mb-3">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">Reviewer / CFO</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Reviews supporting attachments, tax codes, and amounts. Authorized to formally approve or reject with audit notes.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Status:</span>
                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">APPROVED</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs relative">
              <span className="text-[11px] font-mono font-bold text-emerald-600 block mb-1">03 — EXECUTION</span>
              <div className="flex items-center space-x-2 mb-3">
                <Scale className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900">Ledger Posting</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                System commits the transaction to the General Ledger. The posted record becomes completely immutable to retroactive edits.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Status:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">POSTED (IMMUTABLE)</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs relative">
              <span className="text-[11px] font-mono font-bold text-blue-600 block mb-1">04 — PROTECTION</span>
              <div className="flex items-center space-x-2 mb-3">
                <Lock className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900">Period Close Lock</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                CFO locks the completed month. System rejects any retrospective journal additions, ensuring pristine statutory audits.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Status:</span>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">HARD LOCKED</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 9. DOUBLE-ENTRY ACCOUNTING                                */}
      {/* ========================================================= */}
      <section className="py-24 bg-white border-t border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-2">
              Real Accounting Principles
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Built on real accounting principles.
            </h2>
            <p className="mt-3 text-base text-slate-600">
              RicozBooks uses structured double-entry accounting to maintain reliable financial records across your business.
            </p>
          </div>

          {/* Animated Flow: Transaction -> Journal -> Ledger -> Trial Balance -> Financial Statements */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-14 text-xs font-bold">
            {['Transaction', 'Journal', 'Ledger', 'Trial Balance', 'Financial Statements'].map((step, idx) => (
              <React.Fragment key={step}>
                <div className="px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 flex items-center space-x-1.5 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-slate-950 text-white flex items-center justify-center text-[10px] font-mono">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </div>
                {idx < 4 && <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
              </React.Fragment>
            ))}
          </div>

          {/* Sample Balanced Journal Entry Mockup */}
          <div className="max-w-4xl mx-auto bg-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-mono font-bold text-base text-white">JE-2026-09-0012</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                    BALANCED & POSTED
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">SaaS Platform Outward Invoice Settlement • Ref: INV-2026-0901</p>
              </div>
              {/* Debit = Credit Highlight */}
              <div className="px-3.5 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-right">
                <span className="text-[10px] uppercase font-bold text-indigo-400 block">Balanced Invariant</span>
                <span className="text-sm font-mono font-extrabold text-white">Debit = Credit</span>
              </div>
            </div>

            {/* Lines Table */}
            <div className="overflow-x-auto pt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
                    <th className="pb-3">Account Code & Name</th>
                    <th className="pb-3">Description</th>
                    <th className="pb-3 text-right">Debit (INR)</th>
                    <th className="pb-3 text-right">Credit (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  <tr>
                    <td className="py-2.5 font-bold text-slate-200">1200 — Accounts Receivable</td>
                    <td className="py-2.5 text-slate-400">TechCorp Solutions Pvt Ltd</td>
                    <td className="py-2.5 text-right font-bold text-emerald-400">₹ 1,18,000.00</td>
                    <td className="py-2.5 text-right text-slate-500">—</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-slate-200">4000 — SaaS Subscription Revenue</td>
                    <td className="py-2.5 text-slate-400">Enterprise Cloud Annual Plan</td>
                    <td className="py-2.5 text-right text-slate-500">—</td>
                    <td className="py-2.5 text-right font-bold text-indigo-400">₹ 1,00,000.00</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-slate-200">2110 — Output CGST Payable (9%)</td>
                    <td className="py-2.5 text-slate-400">Central Statutory GST Outward</td>
                    <td className="py-2.5 text-right text-slate-500">—</td>
                    <td className="py-2.5 text-right font-bold text-indigo-400">₹ 9,000.00</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-slate-200">2120 — Output SGST Payable (9%)</td>
                    <td className="py-2.5 text-slate-400">State Statutory GST Outward</td>
                    <td className="py-2.5 text-right text-slate-500">—</td>
                    <td className="py-2.5 text-right font-bold text-indigo-400">₹ 9,000.00</td>
                  </tr>
                  <tr className="border-t-2 border-slate-700 bg-slate-950/60 font-bold">
                    <td colSpan={2} className="py-3 text-right font-sans uppercase text-slate-400">Total Verification:</td>
                    <td className="py-3 text-right text-emerald-400 font-extrabold">₹ 1,18,000.00</td>
                    <td className="py-3 text-right text-indigo-400 font-extrabold">₹ 1,18,000.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 10. FINANCIAL CONTROL (Dark Premium Section #09090B)       */}
      {/* ========================================================= */}
      <section className="py-24 bg-[#09090B] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block mb-2">
              Financial Controls & Security
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
              Stronger control. Cleaner books.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-400">
              Institutional-grade safeguards engineered to protect company finances from human error and unauthorized changes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">RBAC</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Role-based access for every team member. Restrict viewing, drafting, or approval powers per individual responsibility.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Period Lock</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Protect finalized financial periods from accidental changes. Hard closing prevents retroactive ledger entries.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Immutable Audit Trail</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Track every important financial action and change with user IDs, timestamps, IP records, and pre/post values.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Tenant Isolation</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Keep company financial data separated and controlled with multi-tenant database constraints and encrypted authentication.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 11. GST SECTION                                           */}
      {/* ========================================================= */}
      <section className="py-24 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block mb-2">
              Indian Statutory Compliance
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Indian GST, built into your financial workflow.
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Manage GST-related accounting and reporting as part of your broader financial operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-colors">
              <div className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded inline-block mb-3">
                TABLE 4 & 12
              </div>
              <h3 className="font-bold text-lg text-slate-950">GSTR-1</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Consolidated B2B customer invoices, place of supply classifications, and mandatory HSN/SAC chapter summaries.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-colors">
              <div className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded inline-block mb-3">
                OFFSET MATRIX
              </div>
              <h3 className="font-bold text-lg text-slate-950">GSTR-3B</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Automated monthly return calculation with Table 4 Input Tax Credit (ITC) offsetting and cash payable calculation.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-colors">
              <div className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded inline-block mb-3">
                STATUTORY GL
              </div>
              <h3 className="font-bold text-lg text-slate-950">GST Reports</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Drill-down reports for IGST, CGST, and SGST output liabilities against input tax ledger pools.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-colors">
              <div className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded inline-block mb-3">
                1-CLICK DISBURSE
              </div>
              <h3 className="font-bold text-lg text-slate-950">GST-Ready Workflows</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Execute statutory settlement with automatic double-entry voucher posting clearing liability accounts to bank.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between flex-wrap gap-3 max-w-4xl mx-auto">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold text-emerald-950">
                GSTN / E-Invoice Ready architecture with standard JSON export payloads.
              </span>
            </div>
            <Link to="/login" className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline">
              Explore GST Center →
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 12. INVENTORY SECTION                                     */}
      {/* ========================================================= */}
      <section className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-2">
              Continuous Inventory Accounting
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Connect inventory with accounting.
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Keep inventory and financial records aligned as your business grows.
            </p>
          </div>

          {/* Animated Flow: Purchase -> Inventory -> Sale -> COGS -> Financial Reports */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-12 text-xs font-bold">
            {['Purchase', 'Inventory', 'Sale', 'COGS Sync', 'Financial Reports'].map((step, idx) => (
              <React.Fragment key={step}>
                <div className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 flex items-center space-x-2 shadow-2xs">
                  <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{step}</span>
                </div>
                {idx < 4 && <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
              </React.Fragment>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200">
              <h3 className="font-bold text-base text-slate-950">FIFO Inventory</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                First-In, First-Out lot batch tracking ensures cost accuracy across all stock movements and purchase orders.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200">
              <h3 className="font-bold text-base text-slate-950">COGS Sync</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Whenever a sales invoice is created, the system auto-debits Account 5000 (COGS) and credits Account 1300 (Inventory).
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200">
              <h3 className="font-bold text-base text-slate-950">Stock Visibility</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Track quantity on hand, reorder alerts, average unit cost, and total asset valuation per SKU in real time.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200">
              <h3 className="font-bold text-base text-slate-950">Product Management</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Configure HSN/SAC statutory codes, unit of measurement (UQC), default sales price, and tax slabs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 13. BANK RECONCILIATION                                   */}
      {/* ========================================================= */}
      <section className="py-24 bg-white border-t border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block mb-2">
              Banking & Cash Control
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Know where your money is.
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Bank statement reconciliation that directly verifies your general ledger cash accounts.
            </p>
          </div>

          <div className="max-w-5xl mx-auto bg-slate-50 rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            {/* Banking Stats Header */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pb-6 border-b border-slate-200">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Bank Balance</span>
                <div className="font-mono font-bold text-base text-slate-900 mt-0.5">₹ 42,90,000</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Transactions</span>
                <div className="font-mono font-bold text-base text-slate-900 mt-0.5">148 Total</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Matched</span>
                <div className="font-mono font-bold text-base text-emerald-700 mt-0.5">146 Matched</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Unmatched</span>
                <div className="font-mono font-bold text-amber-700 mt-0.5">2 Pending</div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Reconciled</span>
                <div className="font-mono font-bold text-indigo-700 mt-0.5">98.6%</div>
              </div>
            </div>

            {/* Reconciliation Flow Indicator */}
            <div className="py-6 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-bold text-slate-800">
              <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200">Bank Statement</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200">Match</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700">Reconcile</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">Updated Ledger</span>
            </div>

            <div className="text-center text-xs text-slate-500 font-medium">
              Highlighted Capability: <strong className="text-slate-800">Bank Statement Reconciliation & Instant Journal Match</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 14. REAL-TIME FINANCIAL DASHBOARD (Visual Showcase)       */}
      {/* ========================================================= */}
      <section className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-2">
              Executive Visibility
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              See the financial health of your business at a glance.
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Interactive financial intelligence with real-time updates and multi-entity filters.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm">
            {/* Top Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
              {[
                { label: 'Revenue', val: '₹ 84.2L', sub: '+28.4%' },
                { label: 'Expenses', val: '₹ 51.1L', sub: 'OpEx + COGS' },
                { label: 'Gross Profit', val: '₹ 33.1L', sub: '39.3%' },
                { label: 'Net Profit', val: '₹ 24.8L', sub: '29.4%' },
                { label: 'Cash & Bank', val: '₹ 42.9L', sub: 'Liquid' },
                { label: 'Receivables', val: '₹ 14.3L', sub: 'Aged AR' },
                { label: 'Payables', val: '₹ 8.9L', sub: 'Current AP' },
              ].map((c, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500">{c.label}</span>
                  <div className="text-sm sm:text-base font-extrabold text-slate-900 font-mono mt-1">{c.val}</div>
                  <span className="text-[10px] font-semibold text-indigo-600">{c.sub}</span>
                </div>
              ))}
            </div>

            {/* Simulated Analytical Trends */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-900 block mb-1">Revenue vs Expenses</span>
                <p className="text-[11px] text-slate-500 mb-4">Quarterly operating margin analysis</p>
                <div className="flex items-end space-x-3 h-32 pt-4">
                  {[
                    { m: 'May', r: 60, e: 40 },
                    { m: 'Jun', r: 75, e: 48 },
                    { m: 'Jul', r: 85, e: 52 },
                    { m: 'Aug', r: 92, e: 55 },
                    { m: 'Sep', r: 100, e: 60 },
                  ].map((bar, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full flex items-end gap-1 h-24">
                        <div className="w-1/2 bg-indigo-600 rounded-t" style={{ height: `${bar.r}%` }} />
                        <div className="w-1/2 bg-amber-500 rounded-t" style={{ height: `${bar.e}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{bar.m}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-900 block mb-1">Cash Runway & Flow</span>
                <p className="text-[11px] text-slate-500 mb-4">Estimated 18.4 months runway</p>
                <div className="space-y-3 pt-3 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-600 mb-1">
                      <span>Monthly Net Inflow</span>
                      <span className="font-mono font-bold text-emerald-600">+₹ 9.8L</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '75%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-600 mb-1">
                      <span>Burn Rate Ratio</span>
                      <span className="font-mono font-bold text-slate-800">22.4%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: '22%' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-900 block mb-1">Receivables Aging</span>
                <p className="text-[11px] text-slate-500 mb-4">91.4% collections on schedule</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 rounded bg-white border border-slate-200">
                    <span className="text-slate-600">0 - 30 Days (Current)</span>
                    <span className="font-mono font-bold text-slate-900">₹ 11,20,000</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-white border border-slate-200">
                    <span className="text-slate-600">31 - 60 Days</span>
                    <span className="font-mono font-bold text-amber-600">₹ 2,30,000</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-white border border-slate-200">
                    <span className="text-slate-600">&gt; 60 Days</span>
                    <span className="font-mono font-bold text-slate-400">₹ 80,000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 15. ROLE-BASED EXPERIENCE                                 */}
      {/* ========================================================= */}
      <section className="py-24 bg-white border-t border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-2">
              Tailored Workspaces
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              One platform. Different responsibilities.
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Segregated tools and views empowering each financial stakeholder.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* CFO Card */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mb-4">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-950">CFO & Business Owner</h3>
              <p className="text-xs font-semibold text-indigo-600 mt-0.5">See the bigger picture.</p>
              <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Business performance & executive dashboard</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Consolidated multi-entity financial reports</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Entity overview and quota governance</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Final transaction sign-offs & period locks</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Enterprise financial controls</span>
                </li>
              </ul>
            </div>

            {/* Accountant Card */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-4">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-950">Accountant</h3>
              <p className="text-xs font-semibold text-blue-600 mt-0.5">Do the work efficiently.</p>
              <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Draft journal entries and vouchers</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Generate customer invoices & enter vendor bills</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>General Ledger account lookup & maintenance</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Bank statement matching & reconciliation</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Export Trial Balance & statutory returns</span>
                </li>
              </ul>
            </div>

            {/* Reviewer Card */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-950">Reviewer</h3>
              <p className="text-xs font-semibold text-emerald-600 mt-0.5">Review with confidence.</p>
              <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Pending approval queue monitoring</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Transaction verification & line item audit</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Financial validation against tax laws</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Rejection note issuance with correction guidelines</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Comprehensive approval log history</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center font-mono text-xs font-bold text-slate-600 flex items-center justify-center gap-3">
            <span>Accountant</span>
            <ArrowRight className="w-4 h-4 text-indigo-600" />
            <span>Reviewer</span>
            <ArrowRight className="w-4 h-4 text-indigo-600" />
            <span className="text-slate-950">Ledger</span>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 16. BUSINESS MODEL / PRICING                              */}
      {/* ========================================================= */}
      <section id="pricing" className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-2">
              Transparent Tiered Access
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight">
              Plans that grow with your business.
            </h2>
            <p className="mt-4 text-base text-slate-600">
              Pricing is currently under validation and will be finalized after market and customer validation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter Plan */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">STARTER</span>
                <h3 className="text-2xl font-bold text-slate-950 mt-1">Single Entity</h3>
                <p className="text-xs text-slate-500 mt-2">For single-entity businesses building structured financial books.</p>
                <div className="my-6">
                  <span className="text-lg font-bold text-slate-800 font-mono">Pricing under validation</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-700">
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>1 Legal Business Entity</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Single-user access</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Standard Chart of Accounts</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Basic Invoicing & Expenses</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Trial Balance & Balance Sheet</span>
                  </li>
                </ul>
              </div>
              <Link
                to="/login"
                className="mt-8 w-full py-3 rounded-xl text-center text-xs font-bold border border-slate-300 text-slate-800 hover:bg-slate-50 transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Professional Plan (Highlighted) */}
            <div className="p-8 rounded-3xl bg-white border-2 border-indigo-600 shadow-xl flex flex-col justify-between relative ring-4 ring-indigo-500/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-600 text-white font-mono text-[10px] font-bold uppercase tracking-wider">
                MOST POPULAR
              </div>
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600">PROFESSIONAL</span>
                <h3 className="text-2xl font-bold text-slate-950 mt-1">Growing Businesses</h3>
                <p className="text-xs text-slate-500 mt-2">For growing organizations requiring structured governance and GST.</p>
                <div className="my-6">
                  <span className="text-lg font-bold text-slate-800 font-mono">Pricing under validation</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-700">
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Up to 3 Legal Entities</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Up to 5 Users with RBAC</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Four-Eyes Approval Workflow</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Indian GST Suite (GSTR-1 & 3B)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>FIFO Inventory & COGS Sync</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Bank Statement Reconciliation</span>
                  </li>
                </ul>
              </div>
              <Link
                to="/login"
                className="mt-8 w-full py-3 rounded-xl text-center text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">ENTERPRISE</span>
                <h3 className="text-2xl font-bold text-slate-950 mt-1">Multi-Entity Scale</h3>
                <p className="text-xs text-slate-500 mt-2">For multi-entity organizations and CA advisory networks.</p>
                <div className="my-6">
                  <span className="text-lg font-bold text-slate-800 font-mono">Pricing under validation</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-700">
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Unlimited Legal Entities</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Unlimited Users & Custom Roles</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Hard Fiscal Period Close Locks</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Multi-Currency FX Revaluation</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Developer REST API & Webhooks</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Dedicated CA Advisory SLA</span>
                  </li>
                </ul>
              </div>
              <a
                href="#dashboard-preview"
                className="mt-8 w-full py-3 rounded-xl text-center text-xs font-bold border border-slate-300 text-slate-800 hover:bg-slate-50 transition-colors"
              >
                Talk to Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 17. WHO IS RICOZBOOKS FOR?                                */}
      {/* ========================================================= */}
      <section className="py-24 bg-white border-t border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-2">
              Target Audience
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Built for businesses that are ready to grow.
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Purpose-built tooling designed for key operational stakeholders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <h3 className="font-bold text-base text-slate-950">Business Owners</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Gain real-time visibility into actual operating margins, tax liabilities, and cash flow without waiting for month-end summaries.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <h3 className="font-bold text-base text-slate-950">CFOs & Financial Directors</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Enforce strict period closes, monitor multi-entity consolidation, and ensure every posted voucher has institutional sign-off.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <h3 className="font-bold text-base text-slate-950">Accountants</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Work faster with balanced double-entry vouchers, automated invoice-to-COGS postings, and instant statement matching.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <h3 className="font-bold text-base text-slate-950">Reviewers & Auditors</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Review pending transaction batches with clear attachment trails and complete audit history before approving to the ledger.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <h3 className="font-bold text-base text-slate-950">Growing SMEs</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Graduate beyond simple billing apps to institutional financial operating infrastructure with scalable entity additions.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <h3 className="font-bold text-base text-slate-950">CA Firms</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Manage multiple client entities with centralized financial workflows, streamlined GST returns, and immutable audit logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 18. CONVERSION FUNNEL                                     */}
      {/* ========================================================= */}
      <section className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-2">
              Customer Journey
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              From first conversation to financial operations.
            </h2>
            <p className="mt-3 text-base text-slate-600">
              A structured onboarding path engineered for smooth financial migration.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-bold">
            {[
              'Lead',
              'CA + SME',
              'Sandbox',
              'Live Demo',
              '14-Day Trial',
              'Onboarding',
              'Team Setup',
              'Paid Annual Plan'
            ].map((step, idx) => (
              <React.Fragment key={step}>
                <div className="px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs text-slate-900">
                  {step}
                </div>
                {idx < 7 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 19. FUTURE / INTELLIGENCE SECTION                         */}
      {/* ========================================================= */}
      <section className="py-24 bg-white border-t border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-2">
              Roadmap & Intelligence
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              The next generation of financial operations.
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Forward-looking intelligence capabilities currently in active engineering.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 font-mono block w-fit mb-3">
                Coming Soon / Roadmap
              </span>
              <h3 className="font-bold text-base text-slate-950">AI-Driven Automated Bookkeeping</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Smart OCR invoice and receipt ingestion with auto-suggested account classifications.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 font-mono block w-fit mb-3">
                Coming Soon / Roadmap
              </span>
              <h3 className="font-bold text-base text-slate-950">Direct Bank Feeds</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Automated continuous sync with Indian corporate banking APIs for zero-touch statement pull.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 font-mono block w-fit mb-3">
                Coming Soon / Roadmap
              </span>
              <h3 className="font-bold text-base text-slate-950">ML Bank Classification</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Machine learning reconciliation engine that learns vendor patterns over time.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 font-mono block w-fit mb-3">
                Coming Soon / Roadmap
              </span>
              <h3 className="font-bold text-base text-slate-950">Anomaly Detection</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Automated flags for abnormal vendor billing spikes, duplicate transactions, and tax discrepancies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 20. TRUST / TECHNOLOGY                                    */}
      {/* ========================================================= */}
      <section className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-2">
              Architecture & Reliability
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Built with modern technology.
            </h2>
            <p className="mt-3 text-base text-slate-600">
              High-throughput backend engineering paired with mathematical accounting precision.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-10 text-xs font-mono font-bold">
            <div className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 shadow-2xs">
              Frontend: React 18
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <div className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 shadow-2xs">
              Backend: FastAPI
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <div className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 shadow-2xs">
              Logic: SQLAlchemy + Rules
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <div className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 shadow-2xs">
              Database: PostgreSQL
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-700">
            <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800">
              JWT Auth • RBAC • Tenant Isolation
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
              Debit = Credit Strict Validation
            </span>
            <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800">
              Hard Period Lock Enforcement
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
              Immutable Audit Trail
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 21. FINAL CTA (Dark Premium Section #09090B)              */}
      {/* ========================================================= */}
      <section className="py-24 bg-[#09090B] text-white text-center relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block mb-3">
            RicozBooks Cloud
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Build smarter financial operations with RicozBooks.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Accounting, compliance, control, and growth — simplified for modern businesses.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#dashboard-preview"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-200 font-semibold text-sm border border-zinc-700 transition-all"
            >
              Book a Demo
            </a>
          </div>

          <p className="mt-8 text-xs text-slate-500 font-semibold tracking-wide">
            Accounting • Control • Intelligence
          </p>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 22. FAQ ACCORDION                                         */}
      {/* ========================================================= */}
      <section id="faq" className="py-24 bg-white border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-2">
              Frequently Asked Questions
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Clear answers regarding capabilities, architecture, and deployment.
            </p>
          </div>

          <div className="space-y-3">
            {faqList.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-[#F8FAFC] overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full p-5 text-left flex items-center justify-between font-bold text-sm text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-200/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 23. FOOTER                                                */}
      {/* ========================================================= */}
      <footer className="bg-slate-950 text-slate-400 py-16 border-t border-slate-900 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
            {/* Brand column */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Scale className="w-4 h-4" />
                </div>
                <span className="text-lg font-extrabold text-white tracking-tight">RicozBooks</span>
              </div>
              <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
                The Financial Operating Platform for growing multi-entity businesses. Complete double-entry accounting, four-eyes governance, and Indian GST.
              </p>
              <div className="text-[11px] text-slate-500">
                A Product of <strong className="text-slate-300">Ricoz Innovation</strong>
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">Product</h4>
              <ul className="space-y-2">
                <li><a href="#modules" className="hover:text-white transition-colors">Accounting</a></li>
                <li><a href="#modules" className="hover:text-white transition-colors">Sales & Invoicing</a></li>
                <li><a href="#modules" className="hover:text-white transition-colors">Purchases & AP</a></li>
                <li><a href="#modules" className="hover:text-white transition-colors">Inventory</a></li>
                <li><a href="#modules" className="hover:text-white transition-colors">Banking</a></li>
                <li><a href="#modules" className="hover:text-white transition-colors">GST Center</a></li>
                <li><a href="#modules" className="hover:text-white transition-colors">Reports</a></li>
              </ul>
            </div>

            {/* Solutions Column */}
            <div>
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">Solutions</h4>
              <ul className="space-y-2">
                <li><a href="#solutions" className="hover:text-white transition-colors">Business Owners</a></li>
                <li><a href="#solutions" className="hover:text-white transition-colors">CFOs</a></li>
                <li><a href="#solutions" className="hover:text-white transition-colors">Accountants</a></li>
                <li><a href="#solutions" className="hover:text-white transition-colors">CA Firms</a></li>
                <li><a href="#solutions" className="hover:text-white transition-colors">Multi-Entity Businesses</a></li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">Company</h4>
              <ul className="space-y-2">
                <li><span className="text-slate-500">About Ricoz</span></li>
                <li><span className="text-slate-500">Contact</span></li>
                <li><span className="text-slate-500">Careers</span></li>
              </ul>
            </div>

            {/* Resources & Legal Column */}
            <div>
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">Resources</h4>
              <ul className="space-y-2">
                <li><Link to="/login" className="hover:text-white transition-colors">Cloud Login</Link></li>
                <li><a href="#faq" className="hover:text-white transition-colors">Documentation & FAQ</a></li>
                <li><span className="text-slate-500">Privacy Policy</span></li>
                <li><span className="text-slate-500">Security Invariants</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-slate-500 text-[11px] gap-4">
            <p>© 2026 Ricoz Innovation. All rights reserved.</p>
            <p className="font-mono">RicozBooks v2.4 • Render Cloud Verified</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
