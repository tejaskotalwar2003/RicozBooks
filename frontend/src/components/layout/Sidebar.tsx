import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Layers, 
  FileText, 
  CheckSquare, 
  CalendarCheck, 
  BarChart3, 
  Building2, 
  ShieldCheck, 
  Settings, 
  LogOut,
  ChevronDown,
  X,
  Receipt,
  Users,
  FileSpreadsheet,
  Building,
  CreditCard,
  Landmark,
  Boxes,
  FileCheck,
  FolderKanban,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { user, activeEntity, entities, switchEntity, logout } = useAuth();
  const navigate = useNavigate();

  const salesItems = [
    { to: '/invoices', label: 'Invoices', icon: Receipt },
    { to: '/customers', label: 'Customers', icon: Users },
  ];

  const purchasesItems = [
    { to: '/bills', label: 'Bills', icon: FileSpreadsheet },
    { to: '/vendors', label: 'Vendors', icon: Building },
  ];

  const expenseBankingItems = [
    { to: '/expenses', label: 'Expenses & Claims', icon: CreditCard },
    { to: '/banking', label: 'Banking & Recon', icon: Landmark },
  ];

  const taxInventoryItems = [
    { to: '/inventory', label: 'Inventory & Stock', icon: Boxes },
    { to: '/gst', label: 'GST & Tax Center', icon: FileCheck },
    { to: '/projects', label: 'Projects & Billing', icon: FolderKanban },
  ];

  const financeItems = [
    { to: '/ledger', label: 'General Ledger', icon: BookOpen },
    { to: '/chart-of-accounts', label: 'Chart of Accounts', icon: Layers },
    { to: '/journals', label: 'Journal Entries', icon: FileText },
    { to: '/approvals', label: 'Approvals', icon: CheckSquare, badge: '3' },
    { to: '/close-manager', label: 'Close Manager', icon: CalendarCheck, badge: 'Sep' },
    { to: '/reports', label: 'Reports', icon: BarChart3 },
  ];

  const adminItems = [
    { to: '/entities', label: 'Entities', icon: Building2 },
    { to: '/subscription', label: 'SaaS Billing & Plans', icon: Sparkles },
    { to: '/audit-log', label: 'Audit Log', icon: ShieldCheck },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = () => {
    if (onClose) onClose();
    logout();
    navigate('/login');
  };

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 w-64 bg-[#260002] text-slate-200 flex flex-col justify-between 
      border-r border-[#390003] shrink-0 h-screen select-none transition-transform duration-300 ease-in-out
      md:static md:translate-x-0
      ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
    `}>
      <div className="flex flex-col flex-1 overflow-y-auto">
        
        {/* LOGO & BRAND HEADER */}
        <div className="p-4 border-b border-[#390003]/90 bg-[#1E0002]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/logo.jpg" 
                alt="RicozBooks Logo" 
                className="h-10 w-10 rounded-lg object-cover shadow-sm border border-[#C58B3E]/30 shrink-0" 
              />
              <div className="leading-tight">
                <div className="flex items-center space-x-1">
                  <span className="font-bold text-lg tracking-tight text-white">
                    Ricoz<span className="text-[#E6B676]">Books</span>
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="text-[10px] uppercase tracking-widest text-[#EEC68B] font-semibold">
                    by ricoz
                  </span>
                  <span className="text-[10px] text-slate-500">•</span>
                  <span className="text-[10px] text-slate-400">Enterprise</span>
                </div>
              </div>
            </div>

            {/* Mobile close button */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 md:hidden"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* ACTIVE ENTITY PICKER IN SIDEBAR */}
          <div className="mt-3.5 relative">
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
              Active Legal Entity
            </label>
            <div className="relative">
              <select
                aria-label="Active Legal Entity"
                value={activeEntity?.id || ''}
                onChange={(e) => switchEntity(Number(e.target.value))}
                className="w-full appearance-none bg-[#2D0205] text-white text-xs font-semibold rounded-lg border border-[#55080E] px-2.5 py-2 pr-7 hover:border-[#C58B3E]/50 focus:outline-none focus:ring-1 focus:ring-[#C58B3E] cursor-pointer"
              >
                {entities.map((ent) => (
                  <option key={ent.id} value={ent.id} className="bg-[#1E0002] text-white">
                    {ent.name} ({ent.base_currency})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#E6B676] absolute right-2.5 top-3 pointer-events-none" />
            </div>
            {activeEntity?.tax_identifier && (
              <div className="mt-1 text-[10px] text-slate-400 font-mono truncate px-1">
                GSTIN/Tax: {activeEntity.tax_identifier}
              </div>
            )}
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="p-3 space-y-1 text-xs">
          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            onClick={() => onClose && onClose()}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all ${
                isActive
                  ? 'bg-[#390003] text-white border-l-4 border-[#E6B676] shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-[#390003]/60'
              }`
            }
          >
            <div className="flex items-center space-x-2.5">
              <LayoutDashboard className="w-4 h-4 text-slate-300" />
              <span>Dashboard</span>
            </div>
          </NavLink>

          {/* Sales & Receivables */}
          <div className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-wider text-[#E6B676] uppercase">
            Sales & Receivables
          </div>
          {salesItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-[#390003] text-white border-l-4 border-[#E6B676] shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-[#390003]/60'
                  }`
                }
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-4 h-4 text-slate-300" />
                  <span>{item.label}</span>
                </div>
              </NavLink>
            );
          })}

          {/* Purchases & Payables */}
          <div className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-wider text-[#E6B676] uppercase">
            Purchases & Payables
          </div>
          {purchasesItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-[#390003] text-white border-l-4 border-[#E6B676] shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-[#390003]/60'
                  }`
                }
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-4 h-4 text-slate-300" />
                  <span>{item.label}</span>
                </div>
              </NavLink>
            );
          })}

          {/* Expenses & Banking */}
          <div className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-wider text-[#E6B676] uppercase">
            Expenses & Banking
          </div>
          {expenseBankingItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-[#390003] text-white border-l-4 border-[#E6B676] shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-[#390003]/60'
                  }`
                }
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-4 h-4 text-slate-300" />
                  <span>{item.label}</span>
                </div>
              </NavLink>
            );
          })}

          {/* Taxes & Inventory */}
          <div className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-wider text-[#E6B676] uppercase">
            Taxes & Inventory
          </div>
          {taxInventoryItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-[#390003] text-white border-l-4 border-[#E6B676] shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-[#390003]/60'
                  }`
                }
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-4 h-4 text-slate-300" />
                  <span>{item.label}</span>
                </div>
              </NavLink>
            );
          })}

          {/* Finance & General Ledger */}
          <div className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Finance & Ledger
          </div>
          {financeItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-[#390003] text-white border-l-4 border-[#E6B676] shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-[#390003]/60'
                  }`
                }
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-4 h-4 text-slate-300" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#55080E] text-[#EEC68B] font-mono border border-[#C58B3E]/20">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}

          {/* Administration */}
          <div className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Administration
          </div>
          {adminItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-[#390003] text-white border-l-4 border-[#E6B676] shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-[#390003]/60'
                  }`
                }
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-4 h-4 text-slate-300" />
                  <span>{item.label}</span>
                </div>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* FOOTER: RICOZBOOKS INFO & USER PROFILE */}
      <div className="border-t border-[#390003] bg-[#1E0002]/90 p-3 shrink-0">
        <div className="mb-2 px-1 text-[10px] text-slate-400 flex items-center justify-between">
          <span className="font-semibold text-slate-300">RicozBooks</span>
          <span className="text-[9px] uppercase tracking-wider text-[#EEC68B]">Finance & Accounting</span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2.5 min-w-0">
            {user?.profile_photo_url ? (
              <img
                src={user.profile_photo_url}
                alt={user.first_name || 'User'}
                className="w-8 h-8 rounded-full object-cover border border-[#E6B676]/40 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#E6B676] text-[#260002] font-bold text-xs flex items-center justify-center shrink-0">
                {user?.first_name ? user.first_name[0] : 'U'}
                {user?.last_name ? user.last_name[0] : ''}
              </div>
            )}
            <div className="text-[11px] leading-tight min-w-0 truncate">
              <div className="font-bold text-white truncate">
                {user?.first_name} {user?.last_name}
              </div>
              <div className="text-slate-400 text-[10px] truncate">
                {user?.job_title || user?.roles[0] || 'Finance'}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="text-slate-400 hover:text-rose-400 p-1.5 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
