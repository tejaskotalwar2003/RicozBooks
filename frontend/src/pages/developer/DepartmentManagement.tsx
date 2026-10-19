import React, { useEffect, useState } from 'react';
import { 
  api, 
  DepartmentItem, 
  DepartmentMemberSummary, 
  CandidateUserItem 
} from '../../services/api';
import { 
  Building2, 
  Search, 
  UserCheck, 
  Users, 
  Edit3, 
  Power, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  RefreshCw, 
  ShieldAlert, 
  UserPlus, 
  Check, 
  ChevronRight, 
  Briefcase, 
  Mail, 
  UserX 
} from 'lucide-react';

export const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals state
  const [selectedDeptForHead, setSelectedDeptForHead] = useState<DepartmentItem | null>(null);
  const [candidates, setCandidates] = useState<CandidateUserItem[]>([]);
  const [selectedHeadUserId, setSelectedHeadUserId] = useState<number | null>(null);
  const [isAssigningHead, setIsAssigningHead] = useState(false);

  // View Members Modal
  const [viewMembersDept, setViewMembersDept] = useState<DepartmentItem | null>(null);
  const [deptMembers, setDeptMembers] = useState<DepartmentMemberSummary[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Edit Department Details Modal
  const [editDept, setEditDept] = useState<DepartmentItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Toggle Confirm Modal
  const [toggleDept, setToggleDept] = useState<DepartmentItem | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const fetchDepartments = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getDepartments();
      setDepartments(data);
    } catch (err: any) {
      console.error('Failed to fetch departments:', err);
      setErrorMessage(err.message || 'Unable to load platform departments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleOpenAssignHead = async (dept: DepartmentItem) => {
    setSelectedDeptForHead(dept);
    setSelectedHeadUserId(dept.head_user_id || null);
    try {
      const userList = await api.getCandidateUsers();
      setCandidates(userList);
    } catch (err) {
      console.error('Failed to load candidate users:', err);
    }
  };

  const handleSaveHead = async () => {
    if (!selectedDeptForHead) return;
    setIsAssigningHead(true);
    try {
      await api.assignDepartmentHead(selectedDeptForHead.id, selectedHeadUserId);
      setSuccessMessage(`Department head updated for ${selectedDeptForHead.name}.`);
      setSelectedDeptForHead(null);
      await fetchDepartments();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update department head.');
    } finally {
      setIsAssigningHead(false);
    }
  };

  const handleOpenViewMembers = async (dept: DepartmentItem) => {
    setViewMembersDept(dept);
    setIsLoadingMembers(true);
    try {
      const members = await api.getDepartmentMembers(dept.id);
      setDeptMembers(members);
    } catch (err: any) {
      console.error('Failed to load department members:', err);
      setDeptMembers([]);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleOpenEdit = (dept: DepartmentItem) => {
    setEditDept(dept);
    setEditName(dept.name);
    setEditDesc(dept.description || '');
  };

  const handleSaveEdit = async () => {
    if (!editDept || !editName.trim()) return;
    setIsSavingEdit(true);
    try {
      await api.updateDepartment(editDept.id, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
      });
      setSuccessMessage(`Department '${editDept.code}' details updated.`);
      setEditDept(null);
      await fetchDepartments();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update department.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmToggle = async () => {
    if (!toggleDept) return;
    setIsTogglingStatus(true);
    try {
      await api.toggleDepartmentStatus(toggleDept.id);
      setSuccessMessage(
        `Department '${toggleDept.name}' ${toggleDept.is_active ? 'deactivated' : 'activated'} successfully.`
      );
      setToggleDept(null);
      await fetchDepartments();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to toggle department status.');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Filtered departments
  const filteredDepartments = departments.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.head && d.head.full_name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (statusFilter === 'ACTIVE') return matchesSearch && d.is_active;
    if (statusFilter === 'INACTIVE') return matchesSearch && !d.is_active;
    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-[#3B0006]/40 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#781019] to-[#3B0006] border border-[#C58B3E]/40 flex items-center justify-center shadow-lg shadow-[#3B0006]/50 shrink-0">
            <Building2 className="w-6 h-6 text-[#E6B676]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Department Management
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Five Core Departments
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Assign departmental heads, review active team memberships, and manage departmental operational status.
            </p>
          </div>
        </div>

        <button
          onClick={fetchDepartments}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700 disabled:opacity-50 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#E6B676]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/80 flex items-center gap-3 text-emerald-300 text-xs shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/80 flex items-center justify-between gap-3 text-red-300 text-xs shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-lg">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by department name, code, or head..."
            className="w-full h-10 pl-10 pr-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/60 focus:border-amber-500/60"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                statusFilter === s
                  ? 'bg-amber-600/20 text-[#E6B676] border border-amber-500/40 shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {s === 'ALL' ? 'All (5)' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Departments List / Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 sm:px-6">Department</th>
                <th className="py-3.5 px-4">Stable Code</th>
                <th className="py-3.5 px-4">Department Head</th>
                <th className="py-3.5 px-4 text-center">Active Members</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading && departments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading platform departments...</span>
                  </td>
                </tr>
              ) : filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No departments match your search query.
                  </td>
                </tr>
              ) : (
                filteredDepartments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Name & Description */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="font-bold text-white text-sm">{dept.name}</div>
                      <div className="text-slate-400 text-[11px] line-clamp-1 max-w-sm mt-0.5">
                        {dept.description || 'No description provided.'}
                      </div>
                    </td>

                    {/* Stable Code */}
                    <td className="py-4 px-4 font-mono text-[11px] text-[#E6B676]">
                      {dept.code}
                    </td>

                    {/* Department Head */}
                    <td className="py-4 px-4">
                      {dept.head ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white">
                            {dept.head.full_name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-200 block text-xs">
                              {dept.head.full_name}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {dept.head.email}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-400/80 italic font-medium">
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Members Count */}
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleOpenViewMembers(dept)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold cursor-pointer transition-colors"
                        title="Click to view all department members"
                      >
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{dept.active_member_count}</span>
                      </button>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          dept.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${dept.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        <span>{dept.is_active ? 'Active' : 'Inactive'}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenAssignHead(dept)}
                          title="Assign or replace department head"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-[#E6B676]" />
                          <span className="hidden lg:inline">Head</span>
                        </button>

                        <button
                          onClick={() => handleOpenEdit(dept)}
                          title="Edit department name & description"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setToggleDept(dept)}
                          title={dept.is_active ? 'Deactivate department' : 'Activate department'}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            dept.is_active
                              ? 'bg-red-950/30 hover:bg-red-950/60 text-red-400 border-red-800/40'
                              : 'bg-emerald-950/30 hover:bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: Assign Department Head */}
      {/* ============================================================== */}
      {selectedDeptForHead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#E6B676]">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Assign Department Head</h3>
                  <p className="text-xs text-slate-400">{selectedDeptForHead.name} ({selectedDeptForHead.code})</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDeptForHead(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Select an active platform user to lead this department. The appointed user will oversee departmental coordination and team task assignment without receiving automatic Super Admin access.
            </p>

            {/* Candidates Selection List */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 mb-6 pr-1 divide-y divide-slate-800/40">
              {/* Option to unassign */}
              <div
                onClick={() => setSelectedHeadUserId(null)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  selectedHeadUserId === null
                    ? 'bg-amber-600/15 border-amber-500/50 text-white'
                    : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:bg-slate-800/40'
                }`}
              >
                <div>
                  <span className="font-semibold text-xs text-amber-400 block">No Department Head</span>
                  <span className="text-[10px] text-slate-500">Leave position unassigned</span>
                </div>
                {selectedHeadUserId === null && <Check className="w-4 h-4 text-amber-400" />}
              </div>

              {candidates.map((cand) => (
                <div
                  key={cand.id}
                  onClick={() => setSelectedHeadUserId(cand.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedHeadUserId === cand.id
                      ? 'bg-gradient-to-r from-[#781019]/40 to-[#3B0006]/40 border-[#C58B3E]/60 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-[#E6B676]">
                      {cand.full_name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-semibold text-xs block text-slate-200">{cand.full_name}</span>
                      <span className="text-[10px] text-slate-400 block">{cand.email}</span>
                      {cand.job_title && (
                        <span className="text-[10px] text-slate-500 block italic">{cand.job_title}</span>
                      )}
                    </div>
                  </div>
                  {selectedHeadUserId === cand.id && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedDeptForHead(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveHead}
                disabled={isAssigningHead}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#781019] to-[#3B0006] text-white border border-[#C58B3E]/40 hover:from-[#8E141F] hover:to-[#4A0008] shadow-lg shadow-[#3B0006]/50 cursor-pointer disabled:opacity-50"
              >
                {isAssigningHead ? 'Saving...' : 'Confirm Head Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: View Department Members */}
      {/* ============================================================== */}
      {viewMembersDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Department Members</h3>
                  <p className="text-xs text-slate-400">{viewMembersDept.name} &bull; {deptMembers.length} staff</p>
                </div>
              </div>
              <button
                onClick={() => setViewMembersDept(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingMembers ? (
              <div className="py-12 text-center text-slate-500">
                <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Loading department members...</span>
              </div>
            ) : deptMembers.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <p className="text-xs">No users are currently assigned to this department.</p>
                <p className="text-[11px] text-slate-600 mt-1">Users will be assigned during account invitation in Phase 3.</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-800/40">
                {deptMembers.map((member) => (
                  <div key={member.id} className="pt-2 pb-1 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white">
                        {member.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-200">{member.full_name}</span>
                          {member.is_head && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-[#E6B676] border border-amber-500/40">
                              Head
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block">{member.email}</span>
                        {member.job_title && (
                          <span className="text-[10px] text-slate-500 block italic">{member.job_title}</span>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      member.is_active ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                    }`}>
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end pt-4 border-t border-slate-800 mt-4">
              <button
                type="button"
                onClick={() => setViewMembersDept(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: Edit Department Details */}
      {/* ============================================================== */}
      {editDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit Department</h3>
                  <p className="text-xs text-slate-400">Code: {editDept.code}</p>
                </div>
              </div>
              <button
                onClick={() => setEditDept(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Department Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500/60"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500/60"
                  placeholder="Outline departmental responsibilities..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
              <button
                type="button"
                onClick={() => setEditDept(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit || !editName.trim()}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#781019] to-[#3B0006] text-white border border-[#C58B3E]/40 hover:from-[#8E141F] hover:to-[#4A0008] shadow-lg shadow-[#3B0006]/50 cursor-pointer disabled:opacity-50"
              >
                {isSavingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: Confirm Toggle Department Status */}
      {/* ============================================================== */}
      {toggleDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border ${
              toggleDept.is_active
                ? 'bg-red-950/50 border-red-800/60 text-red-400'
                : 'bg-emerald-950/50 border-emerald-800/60 text-emerald-400'
            }`}>
              <Power className="w-7 h-7" />
            </div>

            <h3 className="text-base font-bold text-white mb-2">
              {toggleDept.is_active ? 'Deactivate Department?' : 'Activate Department?'}
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Are you sure you want to {toggleDept.is_active ? 'deactivate' : 'activate'} department <strong className="text-white">{toggleDept.name} ({toggleDept.code})</strong>?
              {toggleDept.is_active && ' Deactivated departments cannot receive new staff members or process new task assignments until reactivated.'}
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setToggleDept(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                disabled={isTogglingStatus}
                className={`px-4 py-2 text-xs font-bold rounded-xl border text-white cursor-pointer ${
                  toggleDept.is_active
                    ? 'bg-red-700 hover:bg-red-600 border-red-500/40 shadow-lg shadow-red-950/50'
                    : 'bg-emerald-700 hover:bg-emerald-600 border-emerald-500/40 shadow-lg shadow-emerald-950/50'
                }`}
              >
                {isTogglingStatus ? 'Processing...' : (toggleDept.is_active ? 'Deactivate' : 'Activate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

