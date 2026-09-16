import React from 'react';
import { 
  Search, 
  Bell, 
  Plus, 
  Building, 
  Calendar, 
  Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const Header: React.FC = () => {
  const { user, activeEntity, entities, companies, switchEntity } = useAuth();
  const navigate = useNavigate();
  const activeCompany = companies[0] || { name: 'Ricoz Technologies' };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-xs sticky top-0 z-30">
      
      {/* LEFT: COMPANY & ENTITY SWITCHER */}
      <div className="flex items-center space-x-3 text-xs">
        
        {/* Company Badge */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-semibold border border-slate-200">
          <Building className="w-3.5 h-3.5 text-slate-500" />
          <span>{activeCompany.name}</span>
        </div>

        {/* Entity Selector */}
        <div className="flex items-center space-x-1.5 bg-[#FAF5EE] border border-[#E6B676]/60 rounded-md px-2.5 py-1 text-slate-800">
          <Globe className="w-3.5 h-3.5 text-[#C58B3E]" />
          <select
            aria-label="Select Entity"
            value={activeEntity?.id || ''}
            onChange={(e) => switchEntity(Number(e.target.value))}
            className="bg-transparent text-xs font-bold text-[#390003] focus:outline-none cursor-pointer pr-1"
          >
            {entities.map((ent) => (
              <option key={ent.id} value={ent.id}>
                {ent.name} ({ent.base_currency})
              </option>
            ))}
          </select>
        </div>

        {/* Fiscal Year Indicator */}
        <div className="hidden lg:flex items-center space-x-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span>FY 2026-27 (Active)</span>
        </div>
      </div>

      {/* RIGHT: SEARCH, ACTIONS, NOTIFICATIONS, USER */}
      <div className="flex items-center space-x-3">
        
        {/* Global Omni-Search */}
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="Search accounts, journals, entities (Ctrl+K)..."
            className="w-64 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#781019] focus:border-[#781019] bg-slate-50 text-slate-800"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>

        {/* Quick Action Button */}
        <button 
          onClick={() => navigate('/journals')}
          className="px-3 py-1.5 bg-[#390003] hover:bg-[#55080E] text-white text-xs font-semibold rounded-lg shadow-sm border border-[#781019] flex items-center space-x-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-[#E6B676]" />
          <span>+ New Transaction</span>
        </button>

        {/* Notification Icon */}
        <button 
          aria-label="Notifications"
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 bg-[#E6B676] rounded-full absolute top-1 right-1 border-2 border-white"></span>
        </button>

        {/* User Pill with Role */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-900 leading-tight">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="text-[10px] uppercase font-semibold text-[#781019] tracking-wider">
              {user?.roles[0] || 'User'}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#260002] text-[#E6B676] font-bold text-xs flex items-center justify-center border border-[#C58B3E]/40 shadow-xs">
            {user?.first_name ? user.first_name[0] : 'U'}
          </div>
        </div>

      </div>

    </header>
  );
};

