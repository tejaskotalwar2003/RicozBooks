import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Bell, 
  Plus, 
  Building2, 
  Calendar, 
  Globe,
  Menu,
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  X, 
  ArrowRight, 
  Sparkles,
  ChevronDown,
  Check,
  Receipt,
  FolderKanban,
  FileSpreadsheet,
  CreditCard,
  BookOpen,
  Landmark
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  getNotifications, 
  markNotificationRead, 
  markAllNotificationsRead, 
  triggerAutomationChecks,
  AppNotification 
} from '../../services/accountingApi';
import { UserProfileDropdown } from './UserProfileDropdown';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

interface NewTransactionOption {
  id: string;
  label: string;
  description: string;
  category: 'sales' | 'purchases' | 'accounting';
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  badge?: string;
}

const NEW_TRANSACTION_OPTIONS: NewTransactionOption[] = [
  {
    id: 'tax_invoice',
    label: 'New Tax Invoice',
    description: 'GST-compliant sales invoice & billing',
    category: 'sales',
    icon: Receipt,
    route: '/invoices'
  },
  {
    id: 'sales_order',
    label: 'New Sales Order',
    description: 'Confirmed customer purchase order',
    category: 'sales',
    icon: FolderKanban,
    route: '/invoices'
  },
  {
    id: 'bill',
    label: 'New Bill',
    description: 'Vendor bill & purchase payable',
    category: 'purchases',
    icon: FileSpreadsheet,
    route: '/bills'
  },
  {
    id: 'expense',
    label: 'New Expense',
    description: 'Operational expense & employee claim',
    category: 'purchases',
    icon: CreditCard,
    route: '/expenses'
  },
  {
    id: 'journal',
    label: 'New Journal Entry',
    description: 'Manual double-entry ledger adjustment',
    category: 'accounting',
    icon: BookOpen,
    route: '/journals'
  },
  {
    id: 'payment',
    label: 'New Payment',
    description: 'Bank transfer, cash in/out, settlement',
    category: 'accounting',
    icon: Landmark,
    route: '/banking'
  }
];

interface QuickSearchResult {
  title: string;
  subtitle: string;
  route: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SEARCH_CATALOG: QuickSearchResult[] = [
  { title: 'Invoices & Billing', subtitle: 'Sales invoices, estimates, credit notes', route: '/invoices', icon: Receipt },
  { title: 'Bills & Payables', subtitle: 'Vendor purchases & bills payable', route: '/bills', icon: FileSpreadsheet },
  { title: 'Customers', subtitle: 'Accounts receivable client directory', route: '/customers', icon: Globe },
  { title: 'Vendors & Suppliers', subtitle: 'Accounts payable supplier directory', route: '/vendors', icon: Building2 },
  { title: 'Expenses & Claims', subtitle: 'Direct expenses, recurring claims', route: '/expenses', icon: CreditCard },
  { title: 'Banking & Recon', subtitle: 'Bank accounts, reconciliation, rules', route: '/banking', icon: Landmark },
  { title: 'Journal Entries', subtitle: 'General ledger adjustments & audit slips', route: '/journals', icon: BookOpen },
  { title: 'General Ledger', subtitle: 'Account trial balance & transaction registers', route: '/ledger', icon: BookOpen },
  { title: 'Chart of Accounts', subtitle: 'COA asset, liability, revenue & expense codes', route: '/chart-of-accounts', icon: Landmark },
  { title: 'Inventory & Items', subtitle: 'Products, stock valuation, movements', route: '/items', icon: FolderKanban },
  { title: 'Financial Reports', subtitle: 'P&L, Balance Sheet, GST summaries', route: '/reports', icon: FileSpreadsheet }
];

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, activeEntity, entities, companies, switchEntity } = useAuth();
  const navigate = useNavigate();

  // Active Company / Organization derivation
  const activeCompany = companies.find(c => c.id === activeEntity?.company_id) || companies[0] || { 
    id: 1, 
    name: 'Ricoz Technologies', 
    code: 'RICOZ' 
  };

  // Dynamic Financial Year calculation (avoids hardcoding)
  const dynamicCurrentFY = (() => {
    if (activeEntity?.financial_year) {
      return activeEntity.financial_year.startsWith('FY')
        ? activeEntity.financial_year
        : `FY ${activeEntity.financial_year}`;
    }
    const now = new Date();
    const currentYear = now.getFullYear();
    // In India/Commonwealth fiscal systems, the financial year starts in April (month 3 in JS 0-based index)
    const startYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
    const endYearSlice = String(startYear + 1).slice(-2);
    return `FY ${startYear}-${endYearSlice}`;
  })();

  const [selectedFY, setSelectedFY] = useState<string>(dynamicCurrentFY);

  // Synchronize dynamic FY if activeEntity updates
  useEffect(() => {
    setSelectedFY(dynamicCurrentFY);
  }, [activeEntity?.financial_year]);

  // Generate recent financial years list
  const availableFYs = (() => {
    const now = new Date();
    const baseYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return [
      { code: `FY ${baseYear}-${String(baseYear + 1).slice(-2)}`, isCurrent: true },
      { code: `FY ${baseYear - 1}-${String(baseYear).slice(-2)}`, isCurrent: false },
      { code: `FY ${baseYear - 2}-${String(baseYear - 1).slice(-2)}`, isCurrent: false }
    ];
  })();

  // Dropdown States
  const [isOrgOpen, setIsOrgOpen] = useState<boolean>(false);
  const [isEntityOpen, setIsEntityOpen] = useState<boolean>(false);
  const [isFYOpen, setIsFYOpen] = useState<boolean>(false);
  const [isNewTxOpen, setIsNewTxOpen] = useState<boolean>(false);
  const [selectedTxIndex, setSelectedTxIndex] = useState<number>(-1);

  // Notification States
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  // Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);

  // Refs for outside click handling
  const orgRef = useRef<HTMLDivElement>(null);
  const entityRef = useRef<HTMLDivElement>(null);
  const fyRef = useRef<HTMLDivElement>(null);
  const newTxRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  // Platform detection for keyboard shortcut hint
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  // Load notifications for active entity
  useEffect(() => {
    if (activeEntity?.id) {
      loadNotifs();
    }
  }, [activeEntity?.id]);

  // Click outside and global keyboard listener (Escape & Ctrl+K)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (orgRef.current && !orgRef.current.contains(target)) {
        setIsOrgOpen(false);
      }
      if (entityRef.current && !entityRef.current.contains(target)) {
        setIsEntityOpen(false);
      }
      if (fyRef.current && !fyRef.current.contains(target)) {
        setIsFYOpen(false);
      }
      if (newTxRef.current && !newTxRef.current.contains(target)) {
        setIsNewTxOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setIsNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(target)) {
        setIsSearchFocused(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape closes all dropdowns
      if (event.key === 'Escape') {
        setIsOrgOpen(false);
        setIsEntityOpen(false);
        setIsFYOpen(false);
        setIsNewTxOpen(false);
        setIsNotifOpen(false);
        setIsSearchFocused(false);
        setIsMobileSearchOpen(false);
        searchInputRef.current?.blur();
        mobileSearchInputRef.current?.blur();
      }

      // Ctrl+K / Cmd+K focuses global search
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (window.innerWidth < 768) {
          setIsMobileSearchOpen(true);
          setTimeout(() => mobileSearchInputRef.current?.focus(), 50);
        } else {
          searchInputRef.current?.focus();
          setIsSearchFocused(true);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const loadNotifs = async () => {
    if (!activeEntity?.id) return;
    try {
      const res = await getNotifications(activeEntity.id, 15);
      setNotifications(res.notifications);
      setUnreadCount(res.unread_count);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const handleMarkAsRead = async (id: number, link?: string) => {
    try {
      await markNotificationRead(id);
      await loadNotifs();
      if (link) {
        setIsNotifOpen(false);
        navigate(link);
      }
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!activeEntity?.id) return;
    try {
      await markAllNotificationsRead(activeEntity.id);
      await loadNotifs();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleTriggerChecks = async () => {
    if (!activeEntity?.id) return;
    setIsChecking(true);
    try {
      await triggerAutomationChecks(activeEntity.id);
      await loadNotifs();
    } catch (err) {
      console.error('Failed to run checks:', err);
    } finally {
      setIsChecking(false);
    }
  };

  // Handle Organization Selection
  const handleSelectCompany = (companyId: number) => {
    const comp = companies.find(c => c.id === companyId);
    if (!comp) return;
    // Find primary or first entity under this company
    const targetEntity = entities.find(e => e.company_id === comp.id) || (comp.entities && comp.entities[0]);
    if (targetEntity) {
      switchEntity(targetEntity.id);
    }
    setIsOrgOpen(false);
  };

  // Handle New Transaction Item Navigation
  const handleSelectTransaction = (option: NewTransactionOption) => {
    setIsNewTxOpen(false);
    setSelectedTxIndex(-1);
    navigate(option.route);
    // Dispatch extensible custom event in case current view listens
    window.dispatchEvent(new CustomEvent('open-new-transaction', { detail: { type: option.id } }));
  };

  // Keyboard navigation for New Transaction dropdown
  const handleNewTxKeyDown = (e: React.KeyboardEvent) => {
    if (!isNewTxOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsNewTxOpen(true);
        setSelectedTxIndex(0);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedTxIndex(prev => (prev < NEW_TRANSACTION_OPTIONS.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedTxIndex(prev => (prev > 0 ? prev - 1 : NEW_TRANSACTION_OPTIONS.length - 1));
    } else if (e.key === 'Enter' && selectedTxIndex >= 0) {
      e.preventDefault();
      handleSelectTransaction(NEW_TRANSACTION_OPTIONS[selectedTxIndex]);
    }
  };

  // Filtered search results
  const filteredSearch = searchQuery.trim()
    ? SEARCH_CATALOG.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : SEARCH_CATALOG.slice(0, 5);

  const handleSearchSelect = (route: string) => {
    setIsSearchFocused(false);
    setIsMobileSearchOpen(false);
    setSearchQuery('');
    navigate(route);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredSearch.length > 0) {
      handleSearchSelect(filteredSearch[0].route);
    } else if (searchQuery.trim()) {
      // Default fallback search navigate to invoices with query
      setIsSearchFocused(false);
      setIsMobileSearchOpen(false);
      navigate(`/invoices?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 lg:gap-3 shrink-0 shadow-xs sticky top-0 z-30 select-none">
      
      {/* ============================================================== */}
      {/* LEFT SECTION: MOBILE HAMBURGER/LOGO + SELECTORS                */}
      {/* ============================================================== */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
        
        {/* Mobile Hamburger & Brand Mark (Visible < md) */}
        <div className="flex items-center space-x-2 md:hidden shrink-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-[#390003] transition-colors focus:outline-none focus:ring-1 focus:ring-[#781019] shrink-0 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5 text-[#390003]" />
            </button>
          )}

          {/* Compact Mobile Logo */}
          <div 
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-1.5 cursor-pointer shrink-0"
          >
            <img 
              src="/logo.jpg" 
              alt="RicozBooks" 
              className="h-7 w-7 rounded-md object-cover border border-[#C58B3E]/40" 
            />
            <span className="font-bold text-sm tracking-tight text-[#390003] hidden xs:inline">
              Ricoz<span className="text-[#C58B3E]">Books</span>
            </span>
          </div>
        </div>

        {/* 1. ORGANIZATION SELECTOR (Desktop/Tablet) */}
        <div className="relative hidden sm:block shrink-0" ref={orgRef}>
          <button
            type="button"
            onClick={() => {
              setIsOrgOpen(!isOrgOpen);
              setIsEntityOpen(false);
              setIsFYOpen(false);
              setIsNewTxOpen(false);
            }}
            title={`Organization: ${activeCompany.name}`}
            className={`h-9 px-2.5 sm:px-3 rounded-lg bg-slate-50 hover:bg-slate-100/90 text-slate-800 font-medium text-xs border border-slate-200/90 flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#781019] whitespace-nowrap ${
              isOrgOpen ? 'bg-slate-100 border-slate-300 ring-1 ring-slate-300' : ''
            }`}
            aria-expanded={isOrgOpen}
            aria-haspopup="true"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate max-w-[110px] md:max-w-[140px] xl:max-w-[180px] font-semibold text-slate-800 text-left">
              {activeCompany.name}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 shrink-0 ${isOrgOpen ? 'rotate-180 text-slate-700' : ''}`} />
          </button>

          {/* Organization Dropdown Popover */}
          {isOrgOpen && (
            <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 border-b border-slate-100 font-bold uppercase tracking-wider text-[10px] text-slate-400">
                Switch Organization
              </div>
              <div className="max-h-56 overflow-y-auto py-1">
                {companies.length > 0 ? (
                  companies.map((comp) => {
                    const isSelected = comp.id === activeCompany.id;
                    return (
                      <button
                        key={comp.id}
                        type="button"
                        onClick={() => handleSelectCompany(comp.id)}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                          isSelected ? 'bg-slate-50 font-bold text-[#390003]' : 'text-slate-700 font-medium'
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0 pr-2">
                          <Building2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#781019]' : 'text-slate-400'}`} />
                          <div className="truncate">
                            <div className="truncate text-xs">{comp.name}</div>
                            {comp.code && (
                              <div className="text-[10px] text-slate-400 font-mono">{comp.code}</div>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#781019] shrink-0" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-2 text-slate-500 text-xs">
                    {activeCompany.name}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. LEGAL ENTITY SELECTOR (Separate & Visually Distinct) */}
        <div className="relative shrink-0" ref={entityRef}>
          <button
            type="button"
            onClick={() => {
              setIsEntityOpen(!isEntityOpen);
              setIsOrgOpen(false);
              setIsFYOpen(false);
              setIsNewTxOpen(false);
            }}
            title={activeEntity ? `${activeEntity.name} (${activeEntity.base_currency})` : 'Select Legal Entity'}
            className={`h-9 px-2.5 sm:px-3 rounded-lg bg-[#FAF5EE] hover:bg-[#F5EBDD] text-[#390003] font-bold text-xs border border-[#E6B676]/70 flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#781019] whitespace-nowrap ${
              isEntityOpen ? 'bg-[#F2E5D0] border-[#C58B3E] ring-1 ring-[#C58B3E]' : ''
            }`}
            aria-expanded={isEntityOpen}
            aria-haspopup="true"
          >
            <Globe className="w-3.5 h-3.5 text-[#C58B3E] shrink-0" />
            <span className="truncate max-w-[90px] sm:max-w-[120px] md:max-w-[150px] xl:max-w-[200px] text-left">
              {activeEntity ? activeEntity.name : 'Select Entity'}
            </span>
            {activeEntity?.base_currency && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#E6B676]/25 text-[#781019] border border-[#E6B676]/50 shrink-0 leading-tight">
                {activeEntity.base_currency}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-[#C58B3E] transition-transform duration-150 shrink-0 ${isEntityOpen ? 'rotate-180 text-[#390003]' : ''}`} />
          </button>

          {/* Legal Entity Dropdown Popover */}
          {isEntityOpen && (
            <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3.5 py-1.5 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
                  Select Legal Entity
                </span>
                <span className="text-[10px] text-[#C58B3E] font-semibold">
                  {entities.length} Available
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {entities.map((ent) => {
                  const isSelected = ent.id === activeEntity?.id;
                  return (
                    <button
                      key={ent.id}
                      type="button"
                      onClick={() => {
                        switchEntity(ent.id);
                        setIsEntityOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-[#FAF5EE]/70 transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#FAF5EE] font-bold text-[#390003]' : 'text-slate-700'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs truncate font-semibold">{ent.name}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#E6B676]/20 text-[#781019] border border-[#E6B676]/40 shrink-0">
                            {ent.base_currency}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center space-x-1.5 font-mono">
                          {ent.code && <span>{ent.code}</span>}
                          {ent.gstin && (
                            <>
                              <span>•</span>
                              <span>GST: {ent.gstin}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#781019] shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. FINANCIAL YEAR SELECTOR (Calendar icon + subtle green accent) */}
        <div className="relative hidden md:block shrink-0" ref={fyRef}>
          <button
            type="button"
            onClick={() => {
              setIsFYOpen(!isFYOpen);
              setIsOrgOpen(false);
              setIsEntityOpen(false);
              setIsNewTxOpen(false);
            }}
            title={`Financial Year: ${selectedFY} (Active)`}
            className={`h-9 px-2.5 sm:px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100/80 text-emerald-900 border border-emerald-200/90 flex items-center gap-2 transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-1 focus:ring-emerald-600 whitespace-nowrap ${
              isFYOpen ? 'bg-emerald-100 border-emerald-300 ring-1 ring-emerald-300' : ''
            }`}
            aria-expanded={isFYOpen}
            aria-haspopup="true"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <div className="flex flex-col text-left leading-none justify-center">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700">
                FY
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-bold text-emerald-950 whitespace-nowrap leading-none">
                  {selectedFY.replace(/^FY\s*/i, '')}
                </span>
                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/60 shrink-0 leading-tight">
                  Active
                </span>
              </div>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-emerald-600 transition-transform duration-150 shrink-0 ${isFYOpen ? 'rotate-180 text-emerald-900' : ''}`} />
          </button>

          {/* Financial Year Dropdown Popover */}
          {isFYOpen && (
            <div className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 border-b border-slate-100 font-bold uppercase tracking-wider text-[10px] text-slate-400">
                Accounting Period
              </div>
              <div className="py-1">
                {availableFYs.map((fy) => {
                  const isSelected = selectedFY === fy.code;
                  return (
                    <button
                      key={fy.code}
                      type="button"
                      onClick={() => {
                        setSelectedFY(fy.code);
                        setIsFYOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-emerald-50/60 font-bold text-emerald-900' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Calendar className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>{fy.code}</span>
                      </div>
                      {fy.isCurrent ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/40">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Archived</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ============================================================== */}
      {/* CENTER SECTION: 4. GLOBAL OMNI-SEARCH (Flexible width)         */}
      {/* ============================================================== */}
      <div className="flex-1 min-w-[140px] max-w-[320px] lg:max-w-[400px] xl:max-w-[480px] hidden md:block mx-1 lg:mx-2 relative" ref={searchRef}>
        <form onSubmit={handleSearchSubmit} className="relative w-full flex items-center">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search invoices, bills, customers, accounts..."
            className="h-9 w-full pl-8 pr-16 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#781019] focus:border-[#781019] bg-slate-50/80 hover:bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400 transition-all shadow-2xs truncate"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />

          {/* Clear button or Ctrl+K shortcut badge */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-white border border-slate-200 rounded shadow-2xs select-none">
                {isMac ? '⌘K' : 'Ctrl + K'}
              </kbd>
            )}
          </div>
        </form>

        {/* Quick Search Dropdown / Navigation Menu */}
        {isSearchFocused && (
          <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-1 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>{searchQuery ? 'Matching Workspaces' : 'Quick Navigation'}</span>
              <span>Press Enter ↵</span>
            </div>
            <div className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-50">
              {filteredSearch.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={() => handleSearchSelect(item.route)}
                    className="w-full text-left px-3 py-2 flex items-center space-x-2.5 hover:bg-[#FAF5EE] transition-colors cursor-pointer group"
                  >
                    <div className="p-1 rounded-md bg-slate-100 text-slate-600 group-hover:bg-[#E6B676]/20 group-hover:text-[#390003] transition-colors shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800 group-hover:text-[#390003] truncate">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {item.subtitle}
                      </div>
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-[#781019] group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* RIGHT SECTION: NEW TX, NOTIFICATIONS, PROFILE                  */}
      {/* ============================================================== */}
      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 shrink-0">
        
        {/* Mobile Search Toggle Icon (Visible < md) */}
        <button
          type="button"
          onClick={() => {
            setIsMobileSearchOpen(true);
            setTimeout(() => mobileSearchInputRef.current?.focus(), 50);
          }}
          className="md:hidden h-9 w-9 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
          title="Search"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* 5. NEW TRANSACTION DROPDOWN (Burgundy button with gold plus & downward chevron) */}
        <div className="relative shrink-0" ref={newTxRef} onKeyDown={handleNewTxKeyDown}>
          <button 
            type="button"
            onClick={() => {
              setIsNewTxOpen(!isNewTxOpen);
              setSelectedTxIndex(-1);
              setIsOrgOpen(false);
              setIsEntityOpen(false);
              setIsFYOpen(false);
              setIsNotifOpen(false);
            }}
            className="h-9 px-2.5 sm:px-3 bg-[#390003] hover:bg-[#55080E] active:bg-[#260002] text-white text-xs font-semibold rounded-lg shadow-sm border border-[#781019] flex items-center gap-1.5 transition-all cursor-pointer shrink-0 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#E6B676]/50"
            aria-expanded={isNewTxOpen}
            aria-haspopup="true"
          >
            <Plus className="w-3.5 h-3.5 text-[#E6B676] shrink-0" />
            <span className="hidden sm:inline">+ New Transaction</span>
            <span className="sm:hidden">+ New</span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#E6B676] transition-transform duration-150 shrink-0 ${isNewTxOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* New Transaction Dropdown Menu */}
          {isNewTxOpen && (
            <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white border border-slate-200/90 rounded-xl shadow-xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3.5 py-1.5 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <span>Create Transaction</span>
                <span className="font-mono">Esc to close</span>
              </div>

              {/* Group 1: Sales & Receivables */}
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60 mt-1">
                Sales & Receivables
              </div>
              <div className="py-0.5">
                {NEW_TRANSACTION_OPTIONS.filter(o => o.category === 'sales').map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectTransaction(opt)}
                      className="w-full text-left px-3.5 py-2 flex items-center space-x-2.5 hover:bg-[#FAF5EE] transition-colors cursor-pointer group"
                    >
                      <div className="p-1 rounded-md bg-[#FAF5EE] text-[#781019] group-hover:bg-[#E6B676]/30 transition-colors shrink-0">
                        <Icon className="w-3.5 h-3.5 text-[#781019]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-800 group-hover:text-[#390003] truncate">
                          {opt.label}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {opt.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Group 2: Purchases & Payables */}
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60 mt-1 border-t border-slate-100">
                Purchases & Expenses
              </div>
              <div className="py-0.5">
                {NEW_TRANSACTION_OPTIONS.filter(o => o.category === 'purchases').map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectTransaction(opt)}
                      className="w-full text-left px-3.5 py-2 flex items-center space-x-2.5 hover:bg-[#FAF5EE] transition-colors cursor-pointer group"
                    >
                      <div className="p-1 rounded-md bg-amber-50 text-amber-700 group-hover:bg-amber-100 transition-colors shrink-0">
                        <Icon className="w-3.5 h-3.5 text-amber-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-800 group-hover:text-[#390003] truncate">
                          {opt.label}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {opt.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Group 3: Accounting & Banking */}
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60 mt-1 border-t border-slate-100">
                Accounting & Banking
              </div>
              <div className="py-0.5">
                {NEW_TRANSACTION_OPTIONS.filter(o => o.category === 'accounting').map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectTransaction(opt)}
                      className="w-full text-left px-3.5 py-2 flex items-center space-x-2.5 hover:bg-[#FAF5EE] transition-colors cursor-pointer group"
                    >
                      <div className="p-1 rounded-md bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 transition-colors shrink-0">
                        <Icon className="w-3.5 h-3.5 text-emerald-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-800 group-hover:text-[#390003] truncate">
                          {opt.label}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {opt.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 6. NOTIFICATIONS BELL */}
        <div className="relative shrink-0" ref={notifRef}>
          <button 
            type="button"
            aria-label="Notifications"
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              setIsOrgOpen(false);
              setIsEntityOpen(false);
              setIsFYOpen(false);
              setIsNewTxOpen(false);
            }}
            className="h-9 w-9 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors relative cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-300 shrink-0"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-[#C58B3E] text-[#260002] text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* NOTIFICATION POPOVER */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#1E0002] border border-[#390003] rounded-2xl shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3.5 border-b border-[#390003] bg-[#260002] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white">Notifications & Alerts</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#390003] text-[#EEC68B] border border-[#C58B3E]/30">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={handleTriggerChecks}
                    disabled={isChecking}
                    title="Run automation scan for overdue invoices & approvals"
                    className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-[#E6B676]' : ''}`} />
                  </button>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-[#EEC68B] hover:underline px-1 py-0.5 cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              {/* NOTIFICATION LIST */}
              <div className="max-h-80 overflow-y-auto divide-y divide-[#390003]/60">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <CheckCircle2 className="w-7 h-7 mx-auto mb-2 text-slate-600" />
                    <span>All clear! No pending notifications.</span>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkAsRead(n.id, n.link_url)}
                      className={`p-3 transition-colors cursor-pointer flex gap-2.5 items-start ${
                        n.is_read 
                          ? 'opacity-60 hover:opacity-100 hover:bg-[#260002]/40' 
                          : 'bg-[#260002]/80 hover:bg-[#260002]'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {n.notification_type === 'INVOICE_OVERDUE' && (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        {n.notification_type === 'APPROVAL_REQUIRED' && (
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        {n.notification_type === 'LOW_STOCK_ALERT' && (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        {n.notification_type === 'RECURRING_PROCESSED' && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        {n.notification_type === 'SYSTEM_ALERT' && (
                          <Bell className="w-3.5 h-3.5 text-[#E6B676]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <span className={`font-semibold truncate ${n.is_read ? 'text-slate-300' : 'text-white'}`}>
                            {n.title}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono ml-2 shrink-0">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* NOTIFICATION FOOTER */}
              <div className="p-2.5 bg-[#260002] border-t border-[#390003] text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsNotifOpen(false);
                    navigate('/invoices');
                  }}
                  className="text-[11px] font-semibold text-[#E6B676] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  <span>View Operations Dashboard</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 7. USER PROFILE TRIGGER & DROPDOWN (Preserved exactly as specified) */}
        <div className="flex items-center shrink-0">
          <UserProfileDropdown onOpenNotifications={() => setIsNotifOpen(true)} />
        </div>

      </div>


      {/* ============================================================== */}
      {/* MOBILE SEARCH OVERLAY (Visible only when mobile search active) */}
      {/* ============================================================== */}
      {isMobileSearchOpen && (
        <div className="absolute inset-0 bg-white px-3 sm:px-6 flex items-center z-50 shadow-md">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              ref={mobileSearchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoices, bills, customers, accounts..."
              className="w-full h-10 pl-9 pr-10 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#781019] bg-slate-50 text-slate-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
          <button
            type="button"
            onClick={() => {
              setIsMobileSearchOpen(false);
              setSearchQuery('');
            }}
            className="ml-2 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
          >
            Cancel
          </button>
        </div>
      )}

    </header>
  );
};
