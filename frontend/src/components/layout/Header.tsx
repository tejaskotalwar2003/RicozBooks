import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Bell, 
  Plus, 
  Building, 
  Calendar, 
  Globe,
  Menu,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ArrowRight,
  Sparkles
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

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, activeEntity, entities, companies, switchEntity } = useAuth();
  const navigate = useNavigate();
  const activeCompany = companies[0] || { name: 'Ricoz Technologies' };

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeEntity?.id) {
      loadNotifs();
    }
  }, [activeEntity?.id]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between shrink-0 shadow-xs sticky top-0 z-30">
      
      {/* LEFT: HAMBURGER & COMPANY/ENTITY SWITCHER */}
      <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
        
        {/* Mobile Hamburger Toggle Button */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-[#390003] transition-colors focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5 text-[#390003]" />
          </button>
        )}

        {/* Company Badge (Hidden on mobile, visible on sm and up) */}
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-semibold border border-slate-200">
          <Building className="w-3.5 h-3.5 text-slate-500" />
          <span className="truncate max-w-[120px]">{activeCompany.name}</span>
        </div>

        {/* Entity Selector */}
        <div className="flex items-center space-x-1.5 bg-[#FAF5EE] border border-[#E6B676]/60 rounded-md px-2 sm:px-2.5 py-1 text-slate-800">
          <Globe className="w-3.5 h-3.5 text-[#C58B3E] shrink-0" />
          <select
            aria-label="Select Entity"
            value={activeEntity?.id || ''}
            onChange={(e) => switchEntity(Number(e.target.value))}
            className="bg-transparent text-xs font-bold text-[#390003] focus:outline-none cursor-pointer pr-1 max-w-[130px] sm:max-w-none truncate"
          >
            {entities.map((ent) => (
              <option key={ent.id} value={ent.id}>
                {ent.name} ({ent.base_currency})
              </option>
            ))}
          </select>
        </div>

        {/* Fiscal Year Indicator (Hidden on small & medium screens) */}
        <div className="hidden lg:flex items-center space-x-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span>FY 2026-27 (Active)</span>
        </div>
      </div>

      {/* RIGHT: SEARCH, ACTIONS, NOTIFICATIONS, USER */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        
        {/* Global Omni-Search (Desktop only) */}
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="Search accounts, journals, entities (Ctrl+K)..."
            className="w-48 lg:w-64 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#781019] focus:border-[#781019] bg-slate-50 text-slate-800"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>

        {/* Quick Action Button */}
        <button 
          onClick={() => navigate('/journals')}
          className="px-2.5 sm:px-3 py-1.5 bg-[#390003] hover:bg-[#55080E] text-white text-xs font-semibold rounded-lg shadow-sm border border-[#781019] flex items-center space-x-1 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 text-[#E6B676]" />
          <span className="hidden sm:inline">+ New Transaction</span>
          <span className="sm:hidden">New</span>
        </button>

        {/* NOTIFICATIONS DROPDOWN CONTAINER */}
        <div className="relative" ref={notifRef}>
          <button 
            aria-label="Notifications"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors relative cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#C58B3E] text-[#260002] text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
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
                    onClick={handleTriggerChecks}
                    disabled={isChecking}
                    title="Run automation scan for overdue invoices & approvals"
                    className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-[#E6B676]' : ''}`} />
                  </button>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-[#EEC68B] hover:underline px-1 py-0.5"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              {/* LIST */}
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

              {/* FOOTER */}
              <div className="p-2.5 bg-[#260002] border-t border-[#390003] text-center">
                <button
                  onClick={() => {
                    setIsNotifOpen(false);
                    navigate('/invoices');
                  }}
                  className="text-[11px] font-semibold text-[#E6B676] hover:underline flex items-center justify-center gap-1 mx-auto"
                >
                  <span>View Operations Dashboard</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Pill with Role */}
        <div className="flex items-center space-x-2 pl-1 sm:pl-2 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[100px]">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="text-[10px] uppercase font-semibold text-[#781019] tracking-wider">
              {user?.roles[0] || 'User'}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#260002] text-[#E6B676] font-bold text-xs flex items-center justify-center border border-[#C58B3E]/40 shadow-xs shrink-0">
            {user?.first_name ? user.first_name[0] : 'U'}
          </div>
        </div>

      </div>

    </header>
  );
};
