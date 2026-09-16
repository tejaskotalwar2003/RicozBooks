import React from 'react';
import { Layers, ArrowRight, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  moduleName: string;
  description: string;
  phase: number;
}

export const ModulePlaceholder: React.FC<Props> = ({ moduleName, description, phase }) => {
  const { activeEntity } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6">
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FAF5EE] border border-[#E6B676]/60 flex items-center justify-center text-[#781019] shadow-xs">
          <Layers className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
            Target Phase {phase}
          </span>
          <h1 className="text-2xl font-bold text-slate-900">{moduleName}</h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto">{description}</p>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 max-w-lg mx-auto text-left space-y-2">
          <div className="flex items-center space-x-2 text-[#781019] font-bold">
            <ShieldAlert className="w-4 h-4" />
            <span>Database Schema Ready in PostgreSQL</span>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            The underlying database tables for <strong>{moduleName}</strong> in <strong>{activeEntity?.name}</strong> are created and populated in PostgreSQL (`ricozbooks_db`). Complete UI workflows and CRUD APIs are scheduled for immediate activation in <strong>Phase {phase}</strong> per the incremental implementation roadmap.
          </p>
        </div>
      </div>
    </div>
  );
};

