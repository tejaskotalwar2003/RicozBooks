import React from 'react';
import { Building2, Globe, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const EntitiesPage: React.FC = () => {
  const { entities, activeEntity, switchEntity } = useAuth();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Multi-Entity Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure legal entities, statutory tax jurisdictions, and base reporting currencies.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
            Parent: Ricoz Technologies Global
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {entities.map((entity) => {
          const isSelected = activeEntity?.id === entity.id;
          return (
            <div 
              key={entity.id}
              className={`bg-white rounded-xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                isSelected 
                  ? 'border-[#781019] ring-2 ring-[#781019]/20' 
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-[#FAF5EE] border border-[#E6B676]/50 flex items-center justify-center text-[#781019]">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{entity.name}</h3>
                      <span className="font-mono text-[10px] text-slate-400 uppercase">{entity.code}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="px-2 py-0.5 bg-[#390003] text-[#EEC68B] text-[10px] font-bold rounded-full flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Active</span>
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Legal Name</span>
                    <span className="font-medium text-slate-800 text-right truncate max-w-[160px]" title={entity.legal_name}>
                      {entity.legal_name || entity.name}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Jurisdiction</span>
                    <span className="font-medium text-slate-800">{entity.jurisdiction || entity.country}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Tax Identifier</span>
                    <span className="font-mono font-semibold text-[#781019]">{entity.tax_identifier || 'N/A'}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Base Currency</span>
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {entity.base_currency}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="inline-flex items-center text-[10px] text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                  Statutory Double-Entry
                </span>
                
                <button
                  onClick={() => switchEntity(entity.id)}
                  disabled={isSelected}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    isSelected
                      ? 'bg-slate-100 text-slate-400 cursor-default'
                      : 'bg-[#390003] text-white hover:bg-[#55080E]'
                  }`}
                >
                  {isSelected ? 'Selected' : 'Switch Workspace'}
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};

