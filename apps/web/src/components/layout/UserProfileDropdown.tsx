import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User as UserIcon, 
  Settings, 
  Bell, 
  Shield, 
  LogOut, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  X, 
  Camera, 
  Save, 
  Lock, 
  Globe 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface UserProfileDropdownProps {
  onOpenNotifications?: () => void;
}

/**
 * Formats user role string cleanly into user-friendly title casing:
 * e.g. ADMIN -> Admin, ORG_ADMIN -> Org Admin, CFO -> CFO, ACCOUNTANT -> Accountant
 */
export const formatUserRole = (roles?: string[], jobTitle?: string): string => {
  if (jobTitle && jobTitle.trim()) {
    return jobTitle.trim();
  }
  if (!roles || roles.length === 0) {
    return 'Finance Team';
  }

  const primary = roles[0].toUpperCase();
  switch (primary) {
    case 'ADMIN':
      return 'Admin';
    case 'ORG_ADMIN':
      return 'Org Admin';
    case 'CFO':
      return 'CFO';
    case 'REVIEWER':
      return 'Reviewer';
    case 'ACCOUNTANT':
      return 'Accountant';
    case 'MANAGER':
      return 'Manager';
    case 'VIEWER':
      return 'Viewer';
    case 'TREASURER':
      return 'Treasurer';
    case 'AUDITOR':
      return 'Auditor';
    default:
      return primary
        .toLowerCase()
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
  }
};

/**
 * Generates user initials dynamically:
 * e.g. "Rahul Verma" -> "RV", "Elena" -> "EL", email "john.doe@..." -> "JD"
 */
export const getUserInitials = (
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null
): string => {
  const f = firstName?.trim() || '';
  const l = lastName?.trim() || '';

  if (f && l) {
    return `${f[0]}${l[0]}`.toUpperCase();
  }
  if (f) {
    return f.slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    const prefix = email.trim().split('@')[0];
    const parts = prefix.split(/[._-]/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return prefix.slice(0, 2).toUpperCase();
  }
  return 'U';
};

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({ onOpenNotifications }) => {
  const { user, activeEntity, companies, isLoading, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Profile Edit Form State
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  const activeCompany = companies[0] || { name: 'Ricoz Technologies' };

  // Sync edit form with current user
  useEffect(() => {
    if (user) {
      setEditFirstName(user.first_name || '');
      setEditLastName(user.last_name || '');
      setEditJobTitle(user.job_title || '');
      setEditPhotoUrl(user.profile_photo_url || '');
    }
  }, [user]);

  // Click outside and Escape key handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate('/login');
  };

  const handleOpenProfileModal = () => {
    setIsOpen(false);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    try {
      const updated = await api.updateProfile({
        first_name: editFirstName,
        last_name: editLastName,
        job_title: editJobTitle,
        profile_photo_url: editPhotoUrl,
      });
      updateUser(updated);
      setProfileSuccessMsg('Profile details updated successfully');
      setImgError(false);
      setTimeout(() => {
        setIsProfileModalOpen(false);
        setProfileSuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 1. LOADING STATE: Shimmering skeleton
  if (isLoading) {
    return (
      <div className="h-9 flex items-center gap-2 pl-2 border-l border-slate-200 animate-pulse shrink-0">
        <div className="text-right hidden sm:block space-y-1.5">
          <div className="h-3 w-20 bg-slate-200 rounded"></div>
          <div className="h-2 w-12 bg-slate-100 rounded ml-auto"></div>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-200"></div>
      </div>
    );
  }

  // 2. SAFE FALLBACK (No user loaded or unauthenticated)
  if (!user) {
    return (
      <div className="h-9 flex items-center gap-2 pl-2 border-l border-slate-200 shrink-0">
        <button
          onClick={() => navigate('/login')}
          className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#260002] text-[#E6B676] hover:bg-[#390003] transition-colors cursor-pointer whitespace-nowrap"
        >
          Sign In
        </button>
      </div>
    );
  }

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email.split('@')[0];
  const roleDisplay = formatUserRole(user.roles, user.job_title);
  const initials = getUserInitials(user.first_name, user.last_name, user.email);
  const hasPhoto = Boolean(user.profile_photo_url && !imgError);

  return (
    <>
      {/* TOP-RIGHT USER TRIGGER */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          className="h-9 flex items-center gap-2 pl-1.5 sm:pl-2.5 border-l border-slate-200 hover:opacity-90 focus:outline-none transition-all group cursor-pointer shrink-0"
        >
          {/* Text Container: Full Name & Role */}
          <div className="text-right hidden sm:flex sm:flex-col justify-center leading-none">
            <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[90px] md:max-w-[120px] lg:max-w-[150px] group-hover:text-[#781019] transition-colors whitespace-nowrap">
              {fullName}
            </div>
            <div className="text-[10px] uppercase font-semibold text-[#781019] tracking-wider truncate max-w-[90px] md:max-w-[120px] lg:max-w-[150px] whitespace-nowrap mt-0.5">
              {roleDisplay}
            </div>
          </div>

          {/* User Avatar: Photo or Initials */}
          <div className="relative shrink-0">
            {hasPhoto ? (
              <img
                src={user.profile_photo_url!}
                alt={fullName}
                onError={() => setImgError(true)}
                className="w-8 h-8 rounded-full object-cover border border-[#C58B3E]/40 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#260002] text-[#E6B676] font-bold text-xs flex items-center justify-center border border-[#C58B3E]/40 shadow-xs select-none shrink-0">
                {initials}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white"></div>
          </div>

          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180 text-[#781019]' : ''
            }`}
          />
        </button>

        {/* PROFILE DROPDOWN MENU */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
            
            {/* HEADER CARD: USER IDENTITY & ACTIVE ENTITY */}
            <div className="p-4 bg-gradient-to-br from-[#1E0002] to-[#390003] text-white">
              <div className="flex items-start gap-3">
                {hasPhoto ? (
                  <img
                    src={user.profile_photo_url!}
                    alt={fullName}
                    onError={() => setImgError(true)}
                    className="w-11 h-11 rounded-full object-cover border-2 border-[#E6B676]/60 shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[#260002] text-[#E6B676] font-extrabold text-sm flex items-center justify-center border-2 border-[#E6B676]/60 shadow-sm shrink-0">
                    {initials}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-white truncate leading-snug">
                    {fullName}
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono truncate">
                    {user.email}
                  </div>
                  <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF5EE] text-[#781019] border border-[#E6B676]/60 shadow-2xs">
                    <ShieldCheck className="w-3 h-3 mr-1 text-[#C58B3E]" />
                    <span>{roleDisplay}</span>
                  </div>
                </div>
              </div>

              {/* Active Entity & Company Context */}
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-300">
                <span className="flex items-center gap-1 truncate max-w-[130px]" title={activeCompany.name}>
                  <Building2 className="w-3 h-3 text-[#E6B676] shrink-0" />
                  <strong className="text-white truncate">{activeCompany.name}</strong>
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 text-white font-medium truncate max-w-[120px]" title={activeEntity?.name}>
                  <Globe className="w-2.5 h-2.5 text-[#E6B676] shrink-0" />
                  <span className="truncate">{activeEntity?.name || 'Main Entity'}</span>
                </span>
              </div>
            </div>

            {/* ACTION ITEMS */}
            <div className="p-1.5 divide-y divide-slate-100">
              <div className="py-1">
                {/* 1. My Profile */}
                <button
                  onClick={handleOpenProfileModal}
                  className="w-full px-3 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center space-x-2.5 font-medium transition-colors text-left cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-slate-500" />
                  <span>My Profile</span>
                </button>

                {/* 2. Account Settings */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full px-3 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center space-x-2.5 font-medium transition-colors text-left cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>Account Settings</span>
                </button>

                {/* 3. Security */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/security');
                  }}
                  className="w-full px-3 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center space-x-2.5 font-medium transition-colors text-left cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-slate-500" />
                  <span>Security</span>
                </button>

                {/* 4. Notifications & Alerts */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    if (onOpenNotifications) {
                      onOpenNotifications();
                    } else {
                      navigate('/dashboard');
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center space-x-2.5 font-medium transition-colors text-left cursor-pointer"
                >
                  <Bell className="w-4 h-4 text-slate-500" />
                  <span>Notifications & Alerts</span>
                </button>
              </div>

              {/* 5. Sign Out */}
              <div className="pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 flex items-center space-x-2.5 font-semibold transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: MY PROFILE */}
      {/* ========================================================================= */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#260002] text-white flex items-center justify-between border-b border-[#390003]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#390003] text-[#E6B676] flex items-center justify-center border border-[#C58B3E]/30">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">My Profile</h3>
                  <p className="text-[10px] text-slate-400">View and update your personal account details</p>
                </div>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {profileSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              {profileErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{profileErrorMsg}</span>
                </div>
              )}

              {/* Avatar Preview */}
              <div className="flex items-center space-x-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                {editPhotoUrl && !imgError ? (
                  <img
                    src={editPhotoUrl}
                    alt={fullName}
                    onError={() => setImgError(true)}
                    className="w-14 h-14 rounded-full object-cover border-2 border-[#C58B3E] shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[#260002] text-[#E6B676] font-bold text-base flex items-center justify-center border-2 border-[#C58B3E] shadow-sm shrink-0">
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">{fullName}</div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">{user.email}</div>
                  <span className="inline-block mt-1 text-[10px] font-bold text-[#781019] bg-[#FAF5EE] border border-[#E6B676]/60 px-2 py-0.5 rounded-full">
                    {roleDisplay}
                  </span>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#781019] focus:border-[#781019]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#781019] focus:border-[#781019]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Job Title / Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Chief Financial Officer, Senior Accountant"
                  value={editJobTitle}
                  onChange={(e) => setEditJobTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#781019] focus:border-[#781019]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Profile Photo URL</label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={editPhotoUrl}
                    onChange={(e) => {
                      setEditPhotoUrl(e.target.value);
                      setImgError(false);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#781019] focus:border-[#781019]"
                  />
                  <Camera className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Provide a direct HTTPS link to an image, or leave blank to display your initials.</p>
              </div>

              {/* Roles & Permissions Info */}
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                <span className="font-semibold text-slate-800">Assigned RBAC Roles:</span>{' '}
                <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                  {user.roles.join(', ') || 'VIEWER'}
                </span>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#390003] hover:bg-[#55080E] rounded-lg shadow-sm border border-[#781019] flex items-center space-x-1.5 transition-all"
                >
                  <Save className="w-3.5 h-3.5 text-[#E6B676]" />
                  <span>{isSavingProfile ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
    </>
  );
};
