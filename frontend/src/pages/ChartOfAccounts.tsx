import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  CheckCircle2, 
  XCircle, 
  FolderTree, 
  X 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountingApi, Account, AccountType, NormalBalance } from '../services/accountingApi';

const CATEGORIES: { label: string; value: AccountType | 'ALL' }[] = [
  { label: 'All Accounts', value: 'ALL' },
  { label: 'Assets (1000s)', value: 'ASSET' },
  { label: 'Liabilities (2000s)', value: 'LIABILITY' },
  { label: 'Equity (3000s)', value: 'EQUITY' },
  { label: 'Revenue (4000s)', value: 'REVENUE' },
  { label: 'Expenses (5000s)', value: 'EXPENSE' },
];

export const ChartOfAccounts: React.FC = () => {
  const { activeEntity, user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<AccountType | 'ALL'>('ALL');
  const [search, setSearch] = useState<string>('');
  
  // Create Account Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<AccountType>('EXPENSE');
  const [newBalance, setNewBalance] = useState<NormalBalance>('DEBIT');
  const [newDesc, setNewDesc] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Account Modal state
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editActive, setEditActive] = useState(true);

  const canManage = user?.roles.includes('ADMIN') || user?.roles.includes('ACCOUNTANT');

  const loadAccounts = async () => {
    if (!activeEntity) return;
    setLoading(true);
    try {
      const data = await accountingApi.getAccounts({
        entity_id: activeEntity.id,
        account_type: activeTab === 'ALL' ? undefined : activeTab,
        search: search.trim() || undefined,
      });
      setAccounts(data);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [activeEntity?.id, activeTab, search]);

  const handleTypeChange = (type: AccountType) => {
    setNewType(type);
    if (type === 'ASSET' || type === 'EXPENSE') {
      setNewBalance('DEBIT');
    } else {
      setNewBalance('CREDIT');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntity) return;

    setCreateError(null);
    setIsSubmitting(true);
    try {
      await accountingApi.createAccount({
        entity_id: activeEntity.id,
        code: newCode.trim(),
        name: newName.trim(),
        account_type: newType,
        normal_balance: newBalance,
        description: newDesc.trim() || undefined,
        currency: activeEntity.base_currency,
        is_active: true,
      });
      setIsCreateOpen(false);
      setNewCode('');
      setNewName('');
      setNewDesc('');
      loadAccounts();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    try {
      await accountingApi.updateAccount(editingAccount.id, {
        name: editName.trim(),
        description: editDesc.trim(),
        is_active: editActive,
      });
      setEditingAccount(null);
      loadAccounts();
    } catch (err: any) {
      alert(err.message || 'Failed to update account.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <FolderTree className="w-6 h-6 text-[#781019]" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Chart of Accounts
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Hierarchical structure of prime accounts for <strong className="text-slate-800">{activeEntity?.name}</strong>.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-[#781019] hover:bg-[#600C13] text-white text-xs font-semibold rounded-lg shadow-sm border border-[#781019] flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>+ New Account</span>
          </button>
        )}
      </div>

      {/* CATEGORY TABS & SEARCH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        
        {/* Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveTab(cat.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === cat.value
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search code or account name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#781019] bg-slate-50 text-slate-800"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>

      </div>

      {/* ACCOUNTS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-3 px-4 w-28">Code</th>
                <th className="py-3 px-4">Account Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Normal Balance</th>
                <th className="py-3 px-4">Currency</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Status</th>
                {canManage && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={canManage ? 8 : 7} className="py-8 text-center text-slate-400">
                    Loading accounts for {activeEntity?.name}...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 8 : 7} className="py-8 text-center text-slate-400">
                    No accounts found matching the criteria.
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-[#781019]">
                      {acc.code}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {acc.name}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                        acc.account_type === 'ASSET' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        acc.account_type === 'LIABILITY' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        acc.account_type === 'EQUITY' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                        acc.account_type === 'REVENUE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {acc.account_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-600">
                      {acc.normal_balance}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      {acc.currency}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate" title={acc.description}>
                      {acc.description || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {acc.is_active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          Inactive
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setEditingAccount(acc);
                            setEditName(acc.name);
                            setEditDesc(acc.description || '');
                            setEditActive(acc.is_active);
                          }}
                          className="p-1 text-slate-400 hover:text-[#781019] rounded hover:bg-slate-100 transition-colors"
                          title="Edit Account"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CREATE ACCOUNT */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-[#781019]" />
                <h3 className="text-base font-bold text-slate-900">Create New Account</h3>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5300"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-1 focus:ring-[#781019] font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Type *</label>
                  <select
                    value={newType}
                    onChange={(e) => handleTypeChange(e.target.value as AccountType)}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-1 focus:ring-[#781019] text-slate-800"
                  >
                    <option value="ASSET">Asset (1000s)</option>
                    <option value="LIABILITY">Liability (2000s)</option>
                    <option value="EQUITY">Equity (3000s)</option>
                    <option value="REVENUE">Revenue (4000s)</option>
                    <option value="EXPENSE">Expense (5000s)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Software Subscriptions"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-1 focus:ring-[#781019] text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Normal Balance *</label>
                  <select
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value as NormalBalance)}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-1 focus:ring-[#781019] text-slate-800"
                  >
                    <option value="DEBIT">Debit (Dr)</option>
                    <option value="CREDIT">Credit (Cr)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Currency</label>
                  <input
                    type="text"
                    disabled
                    value={activeEntity?.base_currency || 'INR'}
                    className="w-full px-3 py-2 border rounded-lg border-slate-200 bg-slate-100 font-mono text-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Operational purpose of this ledger account..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-1 focus:ring-[#781019] text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#781019] hover:bg-[#600C13] text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ACCOUNT */}
      {editingAccount && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Account {editingAccount.code}</h3>
                <span className="text-[10px] text-slate-400 font-mono">{editingAccount.account_type}</span>
              </div>
              <button onClick={() => setEditingAccount(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-1 focus:ring-[#781019] text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-1 focus:ring-[#781019] text-slate-800"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="rounded border-slate-300 text-[#781019] focus:ring-[#781019]"
                  />
                  <span className="font-semibold">Account is active for journal postings</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#781019] hover:bg-[#600C13] text-white rounded-lg font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

