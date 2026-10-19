import React, { useEffect, useState, useMemo } from 'react';
import { 
  api, 
  RoleDetailItem, 
  PermissionItem, 
  RolePermissionMatrixData 
} from '../../services/api';
import { 
  KeyRound, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Search, 
  Check, 
  X, 
  AlertTriangle, 
  RefreshCw, 
  Users, 
  Layers, 
  CheckCircle2, 
  Info,
  SlidersHorizontal,
  Grid3X3,
  ListFilter
} from 'lucide-react';

const MANDATORY_SUPER_ADMIN_PERMISSIONS = [
  'developer:administer',
  'roles:manage',
  'audit:read',
  'users:manage'
];

export const RolesPermissionsManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'roles'>('matrix');
  const [matrixData, setMatrixData] = useState<RolePermissionMatrixData | null>(null);
  const [roles, setRoles] = useState<RoleDetailItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search and Module Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');

  // Role Configuration State
  const [selectedRole, setSelectedRole] = useState<RoleDetailItem | null>(null);
  const [isEditingPermissions, setIsEditingPermissions] = useState(false);
  const [pendingPermissionIds, setPendingPermissionIds] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [matrixRes, rolesRes, permsRes] = await Promise.all([
        api.getRolePermissionMatrix(),
        api.getRoles(),
        api.getPermissions()
      ]);
      setMatrixData(matrixRes);
      setRoles(rolesRes);
      setPermissions(permsRes);

      if (rolesRes.length > 0) {
        // Keep selected role or select first
        setSelectedRole(prev => {
          if (!prev) return rolesRes[0];
          const found = rolesRes.find(r => r.id === prev.id);
          return found || rolesRes[0];
        });
      }
    } catch (err: any) {
      console.error('Failed to load RBAC roles & permissions:', err);
      setErrorMessage(err.message || 'Unable to load roles and permission matrix.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync pending permissions when selected role changes
  useEffect(() => {
    if (selectedRole) {
      const initialIds = new Set<number>(selectedRole.permissions.map(p => p.id));
      setPendingPermissionIds(initialIds);
      setIsEditingPermissions(false);
    }
  }, [selectedRole]);

  // Modules list from permissions
  const availableModules = useMemo(() => {
    const mods = new Set<string>();
    permissions.forEach(p => mods.add(p.module));
    return Array.from(mods).sort();
  }, [permissions]);

  // Filtered permissions by search and module
  const filteredPermissions = useMemo(() => {
    return permissions.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesModule = selectedModule === 'ALL' || p.module === selectedModule;
      return matchesSearch && matchesModule;
    });
  }, [permissions, searchQuery, selectedModule]);

  // Group filtered permissions by module
  const permissionsByModule = useMemo(() => {
    const grouped: Record<string, PermissionItem[]> = {};
    filteredPermissions.forEach(p => {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    });
    return grouped;
  }, [filteredPermissions]);

  // Handle permission toggle during edit
  const handleTogglePermission = (perm: PermissionItem) => {
    if (!isEditingPermissions || !selectedRole) return;

    // Protection: Cannot toggle mandatory permissions on SUPER_ADMIN
    if (selectedRole.name === 'SUPER_ADMIN' && MANDATORY_SUPER_ADMIN_PERMISSIONS.includes(perm.code)) {
      return;
    }

    setPendingPermissionIds(prev => {
      const next = new Set(prev);
      if (next.has(perm.id)) {
        next.delete(perm.id);
      } else {
        next.add(perm.id);
      }
      return next;
    });
  };

  // Toggle all permissions in a module
  const handleToggleModule = (moduleName: string, enable: boolean) => {
    if (!isEditingPermissions || !selectedRole) return;
    const modulePerms = permissions.filter(p => p.module === moduleName);
    
    setPendingPermissionIds(prev => {
      const next = new Set(prev);
      modulePerms.forEach(p => {
        if (selectedRole.name === 'SUPER_ADMIN' && MANDATORY_SUPER_ADMIN_PERMISSIONS.includes(p.code)) {
          next.add(p.id); // keep mandatory
          return;
        }
        if (enable) {
          next.add(p.id);
        } else {
          next.delete(p.id);
        }
      });
      return next;
    });
  };

  // Calculate permission deltas for selected role
  const { addedCount, removedCount, addedPerms, removedPerms } = useMemo(() => {
    if (!selectedRole) return { addedCount: 0, removedCount: 0, addedPerms: [], removedPerms: [] };
    const originalIds = new Set(selectedRole.permissions.map(p => p.id));
    const added: PermissionItem[] = [];
    const removed: PermissionItem[] = [];

    permissions.forEach(p => {
      if (pendingPermissionIds.has(p.id) && !originalIds.has(p.id)) {
        added.push(p);
      } else if (!pendingPermissionIds.has(p.id) && originalIds.has(p.id)) {
        removed.push(p);
      }
    });

    return {
      addedCount: added.length,
      removedCount: removed.length,
      addedPerms: added,
      removedPerms: removed
    };
  }, [selectedRole, pendingPermissionIds, permissions]);

  const hasChanges = addedCount > 0 || removedCount > 0;

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updatedRole = await api.updateRolePermissions(
        selectedRole.id,
        Array.from(pendingPermissionIds)
      );

      setSuccessMessage(`Permissions for role '${updatedRole.name}' updated successfully.`);
      setShowConfirmModal(false);
      setIsEditingPermissions(false);
      
      // Refresh matrix and roles in background
      fetchData();
    } catch (err: any) {
      console.error('Failed to update role permissions:', err);
      setErrorMessage(err.message || 'Failed to update permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#781019] to-[#3B0006] border border-[#C58B3E]/40 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-[#E6B676]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Roles & Permissions Matrix
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Centralized Role-Based Access Control (RBAC), permission governance, and module authorizations.
          </p>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'matrix'
                  ? 'bg-gradient-to-r from-[#781019] to-[#3B0006] text-white shadow-sm border border-[#C58B3E]/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Permission Matrix</span>
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'roles'
                  ? 'bg-gradient-to-r from-[#781019] to-[#3B0006] text-white shadow-sm border border-[#C58B3E]/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Role Configurator</span>
            </button>
          </div>

          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Refresh Permissions & Roles"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 flex items-start gap-3 text-red-200 animate-fadeIn">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm">
            <span className="font-semibold">Security Alert: </span>
            {errorMessage}
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-start gap-3 text-emerald-200 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm">
            <span className="font-semibold">Success: </span>
            {successMessage}
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
            Total Roles
          </span>
          <div className="text-2xl font-black text-white">{roles.length}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Platform & Tenant Roles</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
            System Permissions
          </span>
          <div className="text-2xl font-black text-[#E6B676]">{permissions.length}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Granular Capabilities</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
            Functional Modules
          </span>
          <div className="text-2xl font-black text-emerald-400">{availableModules.length}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Across Platform & Ledgers</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
            Security Policy
          </span>
          <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Strict RBAC Enforced</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Super Admin Protected</span>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search permissions by name, code (e.g. journals:create), or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#C58B3E] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 focus:outline-none focus:border-[#C58B3E]"
          >
            <option value="ALL">All Modules ({availableModules.length})</option>
            {availableModules.map(m => (
              <option key={m} value={m}>
                {m.toUpperCase()} ({permissions.filter(p => p.module === m).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Loading RBAC permissions and matrix...</span>
        </div>
      ) : activeTab === 'matrix' ? (
        /* ========================================================================= */
        /* TAB 1: Role-Permission Matrix View                                        */
        /* ========================================================================= */
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-xl">
          <div className="overflow-x-auto max-h-[700px] scrollbar-thin">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-950 sticky top-0 z-20 shadow-md">
                <tr className="border-b border-slate-800">
                  <th className="p-3.5 font-bold uppercase tracking-wider text-slate-400 w-72 sticky left-0 bg-slate-950 z-30 border-r border-slate-800">
                    Module & Permission
                  </th>
                  {roles.map(role => (
                    <th 
                      key={role.id} 
                      className="p-3 text-center font-bold text-slate-200 border-r border-slate-800/80 min-w-[130px]"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-bold text-xs text-white">{role.name}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-normal">
                            {role.permissions.length} perms
                          </span>
                          {role.is_protected && (
                            <span title="Core Protected Role">
                              <Lock className="w-3 h-3 text-amber-400" />
                            </span>
                          )}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {Object.keys(permissionsByModule).length === 0 ? (
                  <tr>
                    <td colSpan={roles.length + 1} className="py-12 text-center text-slate-500">
                      No permissions match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  Object.entries(permissionsByModule).map(([moduleName, perms]) => (
                    <React.Fragment key={moduleName}>
                      {/* Module Header Row */}
                      <tr className="bg-slate-900/90 font-semibold text-slate-300">
                        <td 
                          colSpan={roles.length + 1} 
                          className="px-4 py-2 text-[11px] uppercase tracking-wider text-[#E6B676] bg-slate-950/80 border-t border-b border-slate-800/80 font-bold"
                        >
                          <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-[#E6B676]" />
                            <span>{moduleName} Module ({perms.length} capabilities)</span>
                          </div>
                        </td>
                      </tr>

                      {/* Permission Rows */}
                      {perms.map(perm => (
                        <tr 
                          key={perm.id} 
                          className="hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="p-3 sticky left-0 bg-slate-900/95 z-10 border-r border-slate-800">
                            <div className="font-semibold text-slate-200 text-xs">{perm.name}</div>
                            <div className="font-mono text-[10px] text-slate-400 mt-0.5">{perm.code}</div>
                            {perm.description && (
                              <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1" title={perm.description}>
                                {perm.description}
                              </div>
                            )}
                          </td>

                          {roles.map(role => {
                            const isAssigned = matrixData?.matrix[String(role.id)]?.includes(perm.id) ?? false;
                            return (
                              <td 
                                key={role.id} 
                                className="p-2 text-center border-r border-slate-800/50"
                              >
                                {isAssigned ? (
                                  <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  </div>
                                ) : (
                                  <span className="text-slate-700 font-mono text-sm">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* TAB 2: Role Configurator & Permission Editor                              */
        /* ========================================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Roles Selector List (Left 4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Select Role to Configure
            </h3>

            <div className="space-y-2">
              {roles.map(role => {
                const isSelected = selectedRole?.id === role.id;
                return (
                  <div
                    key={role.id}
                    onClick={() => {
                      setSelectedRole(role);
                    }}
                    className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-slate-900 border-[#C58B3E] shadow-lg shadow-[#781019]/20'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{role.name}</span>
                        {role.is_protected && (
                          <span 
                            title="Protected Core Role"
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1"
                          >
                            <Lock className="w-2.5 h-2.5" />
                            <span>PROTECTED</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {role.permissions.length} perms
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                      {role.description || 'No description provided.'}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>{role.member_count} active user{role.member_count === 1 ? '' : 's'}</span>
                      </div>
                      <span className={isSelected ? 'text-[#E6B676] font-semibold' : 'text-slate-500'}>
                        {isSelected ? 'Editing' : 'Click to view'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Role Details & Permissions Editor (Right 8 cols) */}
          <div className="lg:col-span-8">
            {selectedRole ? (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
                {/* Role Header & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white">{selectedRole.name}</h2>
                      {selectedRole.is_protected && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          Platform Security Role
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedRole.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditingPermissions ? (
                      <>
                        <button
                          onClick={() => {
                            // Reset
                            setPendingPermissionIds(new Set(selectedRole.permissions.map(p => p.id)));
                            setIsEditingPermissions(false);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => setShowConfirmModal(true)}
                          disabled={!hasChanges || isSaving}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#781019] to-[#3B0006] text-white text-xs font-bold border border-[#C58B3E]/50 shadow-md shadow-[#3B0006]/30 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save Changes ({addedCount > 0 ? `+${addedCount}` : ''}{removedCount > 0 ? `-${removedCount}` : ''})</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditingPermissions(true)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#781019] to-[#3B0006] text-white text-xs font-bold border border-[#C58B3E]/50 shadow-md shadow-[#3B0006]/30 hover:brightness-110 transition-all"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Configure Permissions</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Protected Warning Banner */}
                {selectedRole.name === 'SUPER_ADMIN' && (
                  <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 flex items-start gap-3 text-amber-200">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <span className="font-bold">Mandatory Security Protection:</span>
                      <p className="text-slate-300">
                        Core administration permissions (<code className="text-amber-300">developer:administer</code>, <code className="text-amber-300">roles:manage</code>, <code className="text-amber-300">audit:read</code>, <code className="text-amber-300">users:manage</code>) cannot be revoked from the Super Admin role.
                      </p>
                    </div>
                  </div>
                )}

                {/* Edit Mode Summary & Diff */}
                {isEditingPermissions && (
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-300">Edit Mode Active:</span>
                      <span className="text-emerald-400 font-medium">+{addedCount} Added</span>
                      <span className="text-red-400 font-medium">-{removedCount} Removed</span>
                      <span className="text-slate-400 font-medium">
                        Total Selected: {pendingPermissionIds.size}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const allIds = new Set(permissions.map(p => p.id));
                          setPendingPermissionIds(allIds);
                        }}
                        className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => {
                          if (selectedRole.name === 'SUPER_ADMIN') {
                            const mandatoryOnly = new Set(
                              permissions.filter(p => MANDATORY_SUPER_ADMIN_PERMISSIONS.includes(p.code)).map(p => p.id)
                            );
                            setPendingPermissionIds(mandatoryOnly);
                          } else {
                            setPendingPermissionIds(new Set());
                          }
                        }}
                        className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        Clear Non-Mandatory
                      </button>
                    </div>
                  </div>
                )}

                {/* Permissions Checkbox Grid grouped by Module */}
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                  {Object.entries(permissionsByModule).map(([moduleName, perms]) => {
                    const assignedInModule = perms.filter(p => pendingPermissionIds.has(p.id)).length;
                    const allInModule = assignedInModule === perms.length;

                    return (
                      <div key={moduleName} className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
                        <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/60">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs uppercase tracking-wider text-[#E6B676]">
                              {moduleName}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              ({assignedInModule}/{perms.length} granted)
                            </span>
                          </div>

                          {isEditingPermissions && (
                            <button
                              onClick={() => handleToggleModule(moduleName, !allInModule)}
                              className="text-[10px] font-semibold text-slate-400 hover:text-white underline underline-offset-2"
                            >
                              {allInModule ? 'Unselect All' : 'Select All'}
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {perms.map(perm => {
                            const isChecked = pendingPermissionIds.has(perm.id);
                            const isMandatoryLocked = 
                              selectedRole.name === 'SUPER_ADMIN' && 
                              MANDATORY_SUPER_ADMIN_PERMISSIONS.includes(perm.code);

                            return (
                              <div
                                key={perm.id}
                                onClick={() => {
                                  if (isEditingPermissions && !isMandatoryLocked) {
                                    handleTogglePermission(perm);
                                  }
                                }}
                                className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                                  isChecked
                                    ? 'bg-slate-900 border-emerald-500/30'
                                    : 'bg-slate-900/30 border-slate-800/60 opacity-60'
                                } ${
                                  isEditingPermissions && !isMandatoryLocked
                                    ? 'cursor-pointer hover:border-slate-600'
                                    : 'cursor-default'
                                }`}
                              >
                                <div className="pt-0.5 shrink-0">
                                  {isMandatoryLocked ? (
                                    <div className="w-4 h-4 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40" title="Mandatory Core Permission">
                                      <Lock className="w-2.5 h-2.5" />
                                    </div>
                                  ) : (
                                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                                      isChecked
                                        ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                                        : 'bg-slate-950 border-slate-700'
                                    }`}>
                                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-xs text-white truncate">
                                      {perm.name}
                                    </span>
                                  </div>
                                  <div className="font-mono text-[10px] text-slate-400 truncate">
                                    {perm.code}
                                  </div>
                                  {perm.description && (
                                    <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                                      {perm.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-24 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500">
                Select a role from the left panel to inspect or configure its permissions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && selectedRole && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Confirm Permission Update</h3>
                <p className="text-xs text-slate-400">Target Role: {selectedRole.name}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
              <p className="text-slate-300">
                You are about to modify system access privileges for role <strong className="text-white">{selectedRole.name}</strong>.
              </p>
              
              {addedCount > 0 && (
                <div>
                  <span className="font-bold text-emerald-400">Granting {addedCount} permission{addedCount === 1 ? '' : 's'}:</span>
                  <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                    {addedPerms.map(p => p.code).join(', ')}
                  </div>
                </div>
              )}

              {removedCount > 0 && (
                <div>
                  <span className="font-bold text-red-400">Revoking {removedCount} permission{removedCount === 1 ? '' : 's'}:</span>
                  <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                    {removedPerms.map(p => p.code).join(', ')}
                  </div>
                </div>
              )}

              <p className="text-slate-400 text-[11px] pt-1 border-t border-slate-800">
                This consequential change will be permanently logged in the Central Audit Trail.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#781019] to-[#3B0006] text-white text-xs font-bold border border-[#C58B3E]/50 shadow-lg shadow-[#3B0006]/40 hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Confirm & Apply</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

