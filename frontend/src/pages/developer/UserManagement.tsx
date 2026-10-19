import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  api, 
  UserDetailItem, 
  InvitationDetailItem, 
  DepartmentItem 
} from '../../services/api';
import { 
  Users, 
  Search, 
  Filter, 
  UserCheck, 
  UserX, 
  Mail, 
  Shield, 
  ShieldAlert, 
  Crown, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  RefreshCw, 
  Send, 
  Copy, 
  Check, 
  UserPlus, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export const UserManagement: React.FC<{ defaultTab?: 'users' | 'invitations' }> = ({ defaultTab = 'users' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'invitations' || defaultTab === 'invitations' ? 'invitations' : 'users';
  const [activeTab, setActiveTab] = useState<'users' | 'invitations'>(initialTab);

  // User list state
  const [users, setUsers] = useState<UserDetailItem[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isHeadFilter, setIsHeadFilter] = useState<boolean | undefined>(undefined);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Invitations state
  const [invitations, setInvitations] = useState<InvitationDetailItem[]>([]);
  const [totalInvitations, setTotalInvitations] = useState(0);
  const [invStatusFilter, setInvStatusFilter] = useState<string>('');
  const [invDeptFilter, setInvDeptFilter] = useState<string>('');
  const [invSearchQuery, setInvSearchQuery] = useState<string>('');
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(true);

  // Departments list for dropdowns
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);

  // Modals & Drawers
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserDetailItem | null>(null);
  const [targetDeptId, setTargetDeptId] = useState<number | null>(null);
  const [targetRole, setTargetRole] = useState<string>('TEAM_MEMBER');

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDeptId, setInviteDeptId] = useState<number | ''>('');
  const [inviteRole, setInviteRole] = useState('TEAM_MEMBER');
  const [inviteIsHead, setInviteIsHead] = useState(false);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [inviteResult, setInviteResult] = useState<InvitationDetailItem | null>(null);

  // Feedback notifications
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load departments once
  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const depts = await api.getDepartments();
      setDepartments(depts);
      if (depts.length > 0 && inviteDeptId === '') {
        setInviteDeptId(depts[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load departments:', err);
    }
  };

  // Load users when filters or page change
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab, page, selectedDeptId, selectedRole, selectedStatus, isHeadFilter]);

  // Load invitations when filters change
  useEffect(() => {
    if (activeTab === 'invitations') {
      loadInvitations();
    }
  }, [activeTab, invStatusFilter, invDeptFilter]);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await api.getUsers({
        search: searchQuery.trim() || undefined,
        department_id: selectedDeptId ? parseInt(selectedDeptId) : undefined,
        role: selectedRole || undefined,
        status: selectedStatus || undefined,
        is_head: isHeadFilter,
        page,
        limit: 15
      });
      setUsers(res.items);
      setTotalUsers(res.total);
      setTotalPages(res.pages);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load user directory.' });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadInvitations = async () => {
    setIsLoadingInvitations(true);
    try {
      const res = await api.getInvitations({
        department_id: invDeptFilter ? parseInt(invDeptFilter) : undefined,
        status: invStatusFilter || undefined,
        search: invSearchQuery.trim() || undefined
      });
      setInvitations(res.items);
      setTotalInvitations(res.total);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load invitations.' });
    } finally {
      setIsLoadingInvitations(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    if (activeTab === 'users') {
      loadUsers();
    } else {
      loadInvitations();
    }
  };

  // User Actions
  const handleOpenDeptModal = (user: UserDetailItem) => {
    setSelectedUser(user);
    setTargetDeptId(user.department_id || null);
    setIsDeptModalOpen(true);
  };

  const handleUpdateDepartment = async () => {
    if (!selectedUser) return;
    try {
      await api.updateUserDepartment(selectedUser.id, targetDeptId);
      setFeedback({ type: 'success', message: `Department updated for ${selectedUser.email}.` });
      setIsDeptModalOpen(false);
      loadUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update department.' });
    }
  };

  const handleOpenRoleModal = (user: UserDetailItem) => {
    setSelectedUser(user);
    setTargetRole(user.roles[0] || 'TEAM_MEMBER');
    setIsRoleModalOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    try {
      await api.updateUserRole(selectedUser.id, targetRole);
      setFeedback({ type: 'success', message: `Role updated for ${selectedUser.email}.` });
      setIsRoleModalOpen(false);
      loadUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update user role.' });
    }
  };

  const handleOpenSuspendModal = (user: UserDetailItem) => {
    setSelectedUser(user);
    setIsSuspendModalOpen(true);
  };

  const handleToggleSuspend = async () => {
    if (!selectedUser) return;
    try {
      if (selectedUser.is_active) {
        await api.suspendUser(selectedUser.id);
        setFeedback({ type: 'success', message: `Account ${selectedUser.email} has been suspended.` });
      } else {
        await api.reactivateUser(selectedUser.id);
        setFeedback({ type: 'success', message: `Account ${selectedUser.email} has been reactivated.` });
      }
      setIsSuspendModalOpen(false);
      loadUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to change account status.' });
    }
  };

  // Invitation Actions
  const handleOpenInviteModal = () => {
    setInviteEmail('');
    if (departments.length > 0) setInviteDeptId(departments[0].id);
    setInviteRole('TEAM_MEMBER');
    setInviteIsHead(false);
    setInviteResult(null);
    setIsInviteModalOpen(true);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || inviteDeptId === '') return;
    setIsSubmittingInvite(true);
    try {
      const res = await api.createDepartmentInvitation({
        email: inviteEmail.trim(),
        department_id: Number(inviteDeptId),
        role: inviteRole,
        is_department_head: inviteIsHead
      });
      setInviteResult(res);
      setFeedback({
        type: 'success',
        message: `Invitation generated for ${res.email} (${res.email_status === 'SENT' ? 'Email delivered' : 'Link ready'}).`
      });
      loadInvitations();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create invitation.' });
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleResendInvite = async (invitationId: number) => {
    try {
      const res = await api.resendInvitation(invitationId);
      setFeedback({
        type: 'success',
        message: `Invitation resent to ${res.email} (${res.email_status === 'SENT' ? 'Delivered' : 'Refreshed'}).`
      });
      loadInvitations();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to resend invitation.' });
    }
  };

  const handleRevokeInvite = async (invitationId: number) => {
    try {
      await api.revokeInvitation(invitationId);
      setFeedback({ type: 'success', message: 'Invitation has been revoked.' });
      loadInvitations();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to revoke invitation.' });
    }
  };

  const handleCopyLink = (url: string | null | undefined, token: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-600" />
            User Management & Departmental Access
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Centrally manage user directories, assign departments and roles, control account lifecycles, and issue departmental invitations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenInviteModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <UserPlus className="w-4 h-4" />
            Invite User / Head
          </button>
        </div>
      </div>

      {/* Global Feedback Alert */}
      {feedback && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-sm ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button 
            onClick={() => setFeedback(null)} 
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => {
              setActiveTab('users');
              setSearchParams({});
            }}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === 'users'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4" />
            Users & Access Directory
            <span className="ml-1.5 py-0.5 px-2 rounded-full text-xs bg-gray-100 text-gray-600 font-semibold">
              {totalUsers}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('invitations');
              setSearchParams({ tab: 'invitations' });
            }}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === 'invitations'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Mail className="w-4 h-4" />
            Departmental Invitations
            <span className="ml-1.5 py-0.5 px-2 rounded-full text-xs bg-gray-100 text-gray-600 font-semibold">
              {totalInvitations}
            </span>
          </button>
        </nav>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: USERS DIRECTORY                                               */}
      {/* ==================================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Search
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Department Filter */}
              <select
                value={selectedDeptId}
                onChange={(e) => {
                  setSelectedDeptId(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              {/* Role Filter */}
              <select
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Roles</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                <option value="DEPARTMENT_HEAD">DEPARTMENT_HEAD</option>
                <option value="TEAM_MEMBER">TEAM_MEMBER</option>
                <option value="MANAGER">MANAGER</option>
                <option value="ACCOUNTANT">ACCOUNTANT</option>
                <option value="REVIEWER">REVIEWER</option>
                <option value="ORG_ADMIN">ORG_ADMIN</option>
                <option value="ADMIN">ADMIN</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>

              {/* Reset Filters */}
              {(searchQuery || selectedDeptId || selectedRole || selectedStatus || isHeadFilter !== undefined) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDeptId('');
                    setSelectedRole('');
                    setSelectedStatus('');
                    setIsHeadFilter(undefined);
                    setPage(1);
                  }}
                  className="px-3 py-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {isLoadingUsers ? (
              <div className="p-12 flex flex-col items-center justify-center text-gray-500">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                <p className="text-sm font-medium">Loading platform user directory...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <h3 className="text-base font-semibold text-gray-800">No users found</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                  No user accounts match the selected search terms or filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-gray-700 uppercase font-semibold text-xs border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3.5">User</th>
                      <th className="px-6 py-3.5">Department</th>
                      <th className="px-6 py-3.5">Role</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Last Active</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                              {u.first_name?.[0] || u.email[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                                {u.full_name || u.email}
                                {u.is_superuser && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                                    <Shield className="w-3 h-3 text-amber-600" />
                                    Super Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {u.department_name ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
                              <Building2 className="w-3.5 h-3.5 text-blue-600" />
                              {u.department_name}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Unassigned</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {u.is_department_head && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                                <Crown className="w-3 h-3 text-purple-600" />
                                Head
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                              {u.roles[0] || 'VIEWER'}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {u.is_active ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <UserX className="w-3 h-3 text-rose-500" />
                              Suspended
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-xs text-gray-500">
                          {u.last_active_at ? new Date(u.last_active_at).toLocaleDateString() : 'Never'}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenDeptModal(u)}
                              className="px-2.5 py-1 text-xs font-medium rounded border border-gray-300 hover:bg-gray-100 text-gray-700 transition-colors"
                              title="Assign Department"
                            >
                              Dept
                            </button>
                            <button
                              onClick={() => handleOpenRoleModal(u)}
                              className="px-2.5 py-1 text-xs font-medium rounded border border-gray-300 hover:bg-gray-100 text-gray-700 transition-colors"
                              title="Change Role"
                            >
                              Role
                            </button>
                            <button
                              onClick={() => handleOpenSuspendModal(u)}
                              className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                                u.is_active
                                  ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={u.is_active ? 'Suspend account' : 'Reactivate account'}
                            >
                              {u.is_active ? 'Suspend' : 'Reactivate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!isLoadingUsers && totalPages > 1 && (
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Showing page {page} of {totalPages} ({totalUsers} total users)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="text-xs font-semibold text-gray-700 px-2">{page}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: INVITATIONS                                                   */}
      {/* ==================================================================== */}
      {activeTab === 'invitations' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search invitations by email..."
                value={invSearchQuery}
                onChange={(e) => setInvSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={invDeptFilter}
                onChange={(e) => setInvDeptFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                value={invStatusFilter}
                onChange={(e) => setInvStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="REVOKED">REVOKED</option>
              </select>

              {(invSearchQuery || invDeptFilter || invStatusFilter) && (
                <button
                  onClick={() => {
                    setInvSearchQuery('');
                    setInvDeptFilter('');
                    setInvStatusFilter('');
                    loadInvitations();
                  }}
                  className="px-3 py-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Invitations Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {isLoadingInvitations ? (
              <div className="p-12 flex flex-col items-center justify-center text-gray-500">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                <p className="text-sm font-medium">Loading departmental invitations...</p>
              </div>
            ) : invitations.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Mail className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <h3 className="text-base font-semibold text-gray-800">No invitations found</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                  Click "+ Invite User / Head" above to issue a new departmental invitation.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-gray-700 uppercase font-semibold text-xs border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3.5">Recipient</th>
                      <th className="px-6 py-3.5">Department</th>
                      <th className="px-6 py-3.5">Role</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Delivery</th>
                      <th className="px-6 py-3.5">Expires</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {inv.email}
                          <div className="text-xs text-gray-400 font-normal">
                            Invited by: {inv.invited_by_name || 'Admin'}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {inv.department_name ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
                              <Building2 className="w-3.5 h-3.5 text-blue-600" />
                              {inv.department_name}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">General</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            {inv.is_department_head && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                                <Crown className="w-3 h-3 text-purple-600" />
                                Head
                              </span>
                            )}
                            <span className="text-xs text-gray-700 font-medium">{inv.role}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {inv.status === 'PENDING' && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              PENDING
                            </span>
                          )}
                          {inv.status === 'ACCEPTED' && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ACCEPTED
                            </span>
                          )}
                          {inv.status === 'REVOKED' && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              REVOKED
                            </span>
                          )}
                          {inv.status === 'EXPIRED' && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                              EXPIRED
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {inv.email_status === 'SENT' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Delivered
                            </span>
                          ) : inv.email_status === 'NOT_CONFIGURED' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium" title="SMTP not configured. Share link manually.">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Link Only
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-medium" title={inv.email_error || 'Delivery failed'}>
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Failed
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-xs text-gray-500">
                          {new Date(inv.expires_at).toLocaleDateString()}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {inv.invite_url && inv.status === 'PENDING' && (
                              <button
                                onClick={() => handleCopyLink(inv.invite_url, String(inv.id))}
                                className="px-2.5 py-1 text-xs font-medium rounded border border-gray-300 hover:bg-gray-100 text-gray-700 transition-colors inline-flex items-center gap-1"
                                title="Copy invitation link"
                              >
                                {copiedToken === String(inv.id) ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-gray-500" />
                                    Copy Link
                                  </>
                                )}
                              </button>
                            )}

                            {inv.status !== 'ACCEPTED' && (
                              <>
                                <button
                                  onClick={() => handleResendInvite(inv.id)}
                                  className="px-2.5 py-1 text-xs font-medium rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors inline-flex items-center gap-1"
                                  title="Resend invitation"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Resend
                                </button>

                                {inv.status !== 'REVOKED' && (
                                  <button
                                    onClick={() => handleRevokeInvite(inv.id)}
                                    className="px-2.5 py-1 text-xs font-medium rounded border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center gap-1"
                                    title="Revoke invitation"
                                  >
                                    <X className="w-3 h-3" />
                                    Revoke
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: INVITE USER / DEPARTMENT HEAD                               */}
      {/* ==================================================================== */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Send Departmental Invitation</h3>
                  <p className="text-xs text-gray-500">Issue an invitation for a department member or department head</p>
                </div>
              </div>
              <button 
                onClick={() => setIsInviteModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteResult ? (
              <div className="p-6 space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-emerald-900 text-sm">Invitation Generated Successfully!</h4>
                    <p className="text-xs text-emerald-700 mt-1">
                      {inviteResult.email_status === 'SENT'
                        ? `An invitation email has been delivered to ${inviteResult.email}.`
                        : `Invitation active. SMTP is unconfigured; please copy and share the invitation link below.`}
                    </p>
                  </div>
                </div>

                {inviteResult.invite_url && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Invitation Link:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteResult.invite_url}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono text-gray-800"
                      />
                      <button
                        onClick={() => handleCopyLink(inviteResult.invite_url, 'modal')}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors inline-flex items-center gap-1"
                      >
                        {copiedToken === 'modal' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setInviteResult(null);
                      setIsInviteModalOpen(false);
                    }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Recipient Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="colleague@ricozbooks.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Target Department *</label>
                    <select
                      value={inviteDeptId}
                      onChange={(e) => setInviteDeptId(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned Role *</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="TEAM_MEMBER">TEAM_MEMBER</option>
                      <option value="DEPARTMENT_HEAD">DEPARTMENT_HEAD</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="ACCOUNTANT">ACCOUNTANT</option>
                      <option value="REVIEWER">REVIEWER</option>
                      <option value="ORG_ADMIN">ORG_ADMIN</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-purple-50/60 border border-purple-200/70 rounded-xl">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inviteIsHead}
                      onChange={(e) => {
                        setInviteIsHead(e.target.checked);
                        if (e.target.checked) {
                          setInviteRole('DEPARTMENT_HEAD');
                        }
                      }}
                      className="mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="font-semibold text-purple-900 text-xs block">
                        Appoint as Department Head
                      </span>
                      <span className="text-[11px] text-purple-700 block mt-0.5">
                        Designates the recipient as the Department Head upon acceptance, granting delegated authority to invite team members to this department.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingInvite}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {isSubmittingInvite ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Invitation
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: ASSIGN DEPARTMENT                                           */}
      {/* ==================================================================== */}
      {isDeptModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Assign Department
              </h3>
              <button onClick={() => setIsDeptModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Select a canonical department for <strong>{selectedUser.full_name || selectedUser.email}</strong>.
            </p>

            <div>
              <select
                value={targetDeptId !== null ? targetDeptId : ''}
                onChange={(e) => setTargetDeptId(e.target.value === '' ? null : Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">No Department (Unassigned)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setIsDeptModalOpen(false)}
                className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateDepartment}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                Save Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: CHANGE ROLE                                                 */}
      {/* ==================================================================== */}
      {isRoleModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Change User Role
              </h3>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Select the primary role for <strong>{selectedUser.full_name || selectedUser.email}</strong>.
            </p>

            <div>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="TEAM_MEMBER">TEAM_MEMBER</option>
                <option value="DEPARTMENT_HEAD">DEPARTMENT_HEAD</option>
                <option value="MANAGER">MANAGER</option>
                <option value="ACCOUNTANT">ACCOUNTANT</option>
                <option value="REVIEWER">REVIEWER</option>
                <option value="ORG_ADMIN">ORG_ADMIN</option>
                <option value="ADMIN">ADMIN</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN (Platform Super Administrator)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRole}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                Update Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 4: SUSPEND / REACTIVATE CONFIRMATION                          */}
      {/* ==================================================================== */}
      {isSuspendModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                selectedUser.is_active ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {selectedUser.is_active ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  {selectedUser.is_active ? 'Suspend User Account' : 'Reactivate User Account'}
                </h3>
                <p className="text-xs text-gray-500">Confirm account lifecycle change</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              {selectedUser.is_active ? (
                <>
                  Are you sure you want to suspend <strong>{selectedUser.email}</strong>? 
                  The user will be immediately logged out and blocked from logging in or calling any protected APIs.
                </>
              ) : (
                <>
                  Are you sure you want to reactivate <strong>{selectedUser.email}</strong>? 
                  The user will be permitted to authenticate and access their authorized department workspace.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setIsSuspendModalOpen(false)}
                className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleSuspend}
                className={`px-4 py-1.5 text-white rounded-lg text-xs font-semibold shadow-sm ${
                  selectedUser.is_active ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {selectedUser.is_active ? 'Confirm Suspension' : 'Confirm Reactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

