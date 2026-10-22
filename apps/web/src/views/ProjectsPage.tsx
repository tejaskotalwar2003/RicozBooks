import React, { useState, useEffect } from 'react';
import { 
  FolderKanban, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Calendar, 
  User, 
  Building2, 
  RefreshCw, 
  X, 
  ChevronRight,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getProjects, 
  createProject, 
  getProjectProfitability, 
  createProjectTask, 
  getProjectTimesheets, 
  logTimesheet, 
  getCustomers,
  ProjectDetail, 
  ProjectProfitability, 
  ProjectTask, 
  TimesheetEntry, 
  Customer 
} from '../services/accountingApi';

export const ProjectsPage: React.FC = () => {
  const { activeEntity } = useAuth();

  const [projects, setProjects] = useState<ProjectDetail[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null);
  const [projectProfitability, setProjectProfitability] = useState<ProjectProfitability | null>(null);
  const [projectTimesheets, setProjectTimesheets] = useState<TimesheetEntry[]>([]);
  const [isDrawerLoading, setIsDrawerLoading] = useState<boolean>(false);

  // Form states
  const [newCode, setNewCode] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newCustomerId, setNewCustomerId] = useState<number | ''>('');
  const [newBillingType, setNewBillingType] = useState<'TIME_AND_MATERIALS' | 'FIXED_COST' | 'NON_BILLABLE'>('TIME_AND_MATERIALS');
  const [newBudget, setNewBudget] = useState<number>(10000);
  const [newRate, setNewRate] = useState<number>(150);
  const [newStartDate, setNewStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newDescription, setNewDescription] = useState<string>('');

  // Timesheet Logger Form
  const [tsHours, setTsHours] = useState<number>(8);
  const [tsBillRate, setTsBillRate] = useState<number>(150);
  const [tsCostRate, setTsCostRate] = useState<number>(50);
  const [tsDate, setTsDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [tsNotes, setTsNotes] = useState<string>('');
  const [isLoggingTs, setIsLoggingTs] = useState<boolean>(false);

  // Feedback states
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (activeEntity?.id) {
      loadData();
    }
  }, [activeEntity?.id]);

  const loadData = async () => {
    if (!activeEntity?.id) return;
    setIsLoading(true);
    setActionError(null);
    try {
      const [projRes, custRes] = await Promise.all([
        getProjects(activeEntity.id),
        getCustomers(activeEntity.id)
      ]);
      setProjects(projRes);
      setCustomers(custRes);
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      setActionError(err.message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setNewCode(`PRJ-${randomSuffix}`);
    setNewName('');
    setNewCustomerId(customers.length > 0 ? customers[0].id : '');
    setNewBillingType('TIME_AND_MATERIALS');
    setNewBudget(10000);
    setNewRate(150);
    setNewStartDate(new Date().toISOString().split('T')[0]);
    setNewDescription('');
    setIsCreateModalOpen(true);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntity?.id) return;

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const proj = await createProject({
        entity_id: activeEntity.id,
        customer_id: newCustomerId ? Number(newCustomerId) : undefined,
        code: newCode,
        name: newName,
        billing_type: newBillingType,
        budget_amount: Number(newBudget),
        default_hourly_rate: Number(newRate),
        start_date: newStartDate,
        description: newDescription
      });

      setActionSuccess(`Project '${proj.name}' (${proj.code}) created successfully!`);
      setIsCreateModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Create project failed:', err);
      setActionError(err.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectProject = async (proj: ProjectDetail) => {
    setSelectedProject(proj);
    setIsDrawerLoading(true);
    try {
      const [prof, tsList] = await Promise.all([
        getProjectProfitability(proj.id),
        getProjectTimesheets(proj.id)
      ]);
      setProjectProfitability(prof);
      setProjectTimesheets(tsList);
      setTsBillRate(Number(proj.default_hourly_rate) || 150);
    } catch (err: any) {
      console.error('Failed to load project details:', err);
    } finally {
      setIsDrawerLoading(false);
    }
  };

  const handleLogTimesheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntity?.id || !selectedProject) return;

    setIsLoggingTs(true);
    setActionError(null);
    try {
      await logTimesheet({
        entity_id: activeEntity.id,
        project_id: selectedProject.id,
        entry_date: tsDate,
        hours: Number(tsHours),
        hourly_billable_rate: Number(tsBillRate),
        hourly_cost_rate: Number(tsCostRate),
        notes: tsNotes
      });

      setTsNotes('');
      // Refresh drawer
      const [prof, tsList] = await Promise.all([
        getProjectProfitability(selectedProject.id),
        getProjectTimesheets(selectedProject.id)
      ]);
      setProjectProfitability(prof);
      setProjectTimesheets(tsList);
      setActionSuccess('Timesheet hours logged successfully!');
      await loadData();
    } catch (err: any) {
      console.error('Log timesheet failed:', err);
      setActionError(err.message || 'Failed to record timesheet entry');
    } finally {
      setIsLoggingTs(false);
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.customer_name && p.customer_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate high-level aggregates
  const totalActive = projects.filter(p => p.status === 'IN_PROGRESS').length;
  const totalRevenue = projects.reduce((acc, p) => acc + Number(p.profitability?.total_recognized_revenue || 0), 0);
  const totalCost = projects.reduce((acc, p) => acc + Number(p.profitability?.total_project_cost || 0), 0);
  const avgMargin = totalRevenue > 0 ? (((totalRevenue - totalCost) / totalRevenue) * 100).toFixed(1) : '0.0';

  const currency = activeEntity?.base_currency || 'INR';
  const currencySymbol = currency === 'USD' ? '$' : (currency === 'EUR' ? '€' : (currency === 'GBP' ? '£' : '₹'));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C58B3E]">Projects & Engagements</span>
            <span className="text-slate-400">•</span>
            <span className="text-xs text-slate-500">Time & Billing Analytics</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            Projects & Profitability
          </h1>
          <p className="text-sm text-slate-600">
            Client project billing, timesheet labor tracking, and real-time gross margin analytics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
            title="Refresh Projects"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center space-x-2 px-4 py-2 bg-[#260002] hover:bg-[#390003] text-[#EEC68B] font-semibold text-sm rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Project</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK ALERTS */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-sm">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-sm">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Projects</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-700">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {totalActive}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Total {projects.length} recorded projects
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recognized Revenue</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-700 tracking-tight">
              {currencySymbol}{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-emerald-600 mt-1 font-medium">
              Invoiced & billable work-in-progress
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Labor Cost Burn</span>
            <div className="p-2 bg-rose-50 rounded-lg text-rose-700">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {currencySymbol}{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Timesheet hours × employee cost rate
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Margin %</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-700">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {avgMargin}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Overall portfolio profitability
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search code, project name, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#C58B3E] cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PLANNING">Planning</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* PROJECTS TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Code & Project</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Billing Model</th>
                <th className="py-3 px-4 text-right">Budget</th>
                <th className="py-3 px-4 text-right">Hours Logged</th>
                <th className="py-3 px-4 text-right">Revenue</th>
                <th className="py-3 px-4 text-right">Gross Margin</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <FolderKanban className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <span>No projects found. Click "Create New Project" to get started.</span>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p) => {
                  const prof = p.profitability;
                  const marginPct = Number(prof?.gross_margin_pct || 0);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{p.code}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {p.customer_name || 'Internal'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {p.billing_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {currencySymbol}{Number(p.budget_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {Number(p.total_hours_logged).toFixed(1)} hrs
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700 font-bold">
                        {currencySymbol}{Number(prof?.total_recognized_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <span className={`font-bold ${marginPct >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {marginPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          p.status === 'IN_PROGRESS'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : p.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleSelectProject(p)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
                        >
                          <span>Manage</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE NEW PROJECT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <FolderKanban className="w-5 h-5 text-[#C58B3E]" />
                <h2 className="text-base font-bold text-slate-900">Create Client Project</h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Project Code *
                  </label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Customer Client
                  </label>
                  <select
                    value={newCustomerId}
                    onChange={(e) => setNewCustomerId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  >
                    <option value="">Internal Non-Client Project</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Enterprise Cloud ERP Migration"
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Billing Model *
                  </label>
                  <select
                    value={newBillingType}
                    onChange={(e) => setNewBillingType(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  >
                    <option value="TIME_AND_MATERIALS">T&M (Hourly)</option>
                    <option value="FIXED_COST">Fixed Cost</option>
                    <option value="NON_BILLABLE">Non-Billable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Budget ({currency})
                  </label>
                  <input
                    type="number"
                    value={newBudget}
                    onChange={(e) => setNewBudget(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hourly Rate ({currency})
                  </label>
                  <input
                    type="number"
                    value={newRate}
                    onChange={(e) => setNewRate(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Scope
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Deliverables and milestones..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-[#260002] hover:bg-[#390003] text-[#EEC68B] disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
                >
                  {isSubmitting ? 'Creating Project...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROJECT DETAILS & TIMESHEET DRAWER */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-end p-0">
          <div className="bg-white border-l border-slate-200 w-full max-w-2xl h-full flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200 shadow-2xl">
            {/* DRAWER HEADER */}
            <div>
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white rounded-lg border border-slate-200 text-[#C58B3E]">
                    <FolderKanban className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{selectedProject.name}</h2>
                    <span className="text-xs font-mono text-slate-500">{selectedProject.code}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* PROFITABILITY METRICS BREAKDOWN */}
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-semibold text-slate-500">Revenue Recognized</span>
                    <div className="text-base font-mono font-bold text-emerald-700 mt-1">
                      {currencySymbol}{Number(projectProfitability?.total_recognized_revenue || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-semibold text-slate-500">Labor Cost Burn</span>
                    <div className="text-base font-mono font-bold text-slate-900 mt-1">
                      {currencySymbol}{Number(projectProfitability?.total_labor_cost || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-semibold text-slate-500">Gross Margin</span>
                    <div className="text-base font-mono font-bold text-[#781019] mt-1">
                      {Number(projectProfitability?.gross_margin_pct || 0).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* LOG TIMESHEET FORM */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-[#C58B3E]" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Log Billable Labor Hours</h3>
                  </div>

                  <form onSubmit={handleLogTimesheet} className="space-y-3">
                    <div className="grid grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Date</label>
                        <input
                          type="date"
                          value={tsDate}
                          onChange={(e) => setTsDate(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Hours</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          value={tsHours}
                          onChange={(e) => setTsHours(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Bill Rate</label>
                        <input
                          type="number"
                          value={tsBillRate}
                          onChange={(e) => setTsBillRate(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Cost Rate</label>
                        <input
                          type="number"
                          value={tsCostRate}
                          onChange={(e) => setTsCostRate(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Timesheet notes / work summary..."
                        value={tsNotes}
                        onChange={(e) => setTsNotes(e.target.value)}
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                      />
                      <button
                        type="submit"
                        disabled={isLoggingTs}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#260002] hover:bg-[#390003] text-[#EEC68B] disabled:opacity-50 shrink-0 cursor-pointer shadow-xs transition-colors"
                      >
                        {isLoggingTs ? 'Saving...' : 'Log Hours'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* TIMESHEET LOG AUDIT TABLE */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-900">
                    <span>Logged Timesheets ({projectTimesheets.length})</span>
                    <span className="font-mono text-slate-700">
                      Total: {projectTimesheets.reduce((acc, t) => acc + Number(t.hours), 0)} hrs
                    </span>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Resource</th>
                          <th className="py-2.5 px-3 text-right">Hours</th>
                          <th className="py-2.5 px-3 text-right">Bill Value</th>
                          <th className="py-2.5 px-3 text-right">Labor Cost</th>
                          <th className="py-2.5 px-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {projectTimesheets.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                              No hours logged yet for this project.
                            </td>
                          </tr>
                        ) : (
                          projectTimesheets.map((ts) => (
                            <tr key={ts.id} className="hover:bg-slate-50/70">
                              <td className="py-2.5 px-3 text-slate-600">{ts.entry_date}</td>
                              <td className="py-2.5 px-3 text-slate-900 font-sans font-medium">{ts.user_name || 'Staff'}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">{Number(ts.hours).toFixed(1)}</td>
                              <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">{currencySymbol}{Number(ts.total_billable_amount).toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right text-slate-600">{currencySymbol}{Number(ts.total_cost_amount).toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-slate-500 font-sans truncate max-w-[150px]">{ts.notes || '—'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* DRAWER FOOTER */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProjectsPage;
