import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Laptop, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Clock, 
  MapPin, 
  LogOut, 
  AlertTriangle, 
  RefreshCw, 
  Check, 
  X,
  History,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { api, UserSessionItem, LoginActivityItem } from '../services/api';

export const SecurityPage: React.FC = () => {
  // =========================================================================
  // SECTION 1: PASSWORD & AUTHENTICATION STATE
  // =========================================================================
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Password requirements & strength analysis
  const requirements = useMemo(() => {
    return {
      minLength: newPassword.length >= 6,
      recommendedLength: newPassword.length >= 8,
      hasUpperLower: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword),
      hasNumberOrSpecial: /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword),
      passwordsMatch: newPassword.length > 0 && newPassword === confirmPassword,
    };
  }, [newPassword, confirmPassword]);

  const strength = useMemo(() => {
    if (!newPassword) return { score: 0, label: 'None', color: 'bg-slate-200', text: 'text-slate-400' };
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 8) score += 1;
    if (requirements.hasUpperLower) score += 1;
    if (requirements.hasNumberOrSpecial) score += 1;

    switch (score) {
      case 1:
        return { score: 25, label: 'Weak', color: 'bg-rose-500', text: 'text-rose-600' };
      case 2:
        return { score: 50, label: 'Fair', color: 'bg-amber-500', text: 'text-amber-600' };
      case 3:
        return { score: 75, label: 'Good', color: 'bg-blue-500', text: 'text-blue-600' };
      case 4:
        return { score: 100, label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600' };
      default:
        return { score: 0, label: 'None', color: 'bg-slate-200', text: 'text-slate-400' };
    }
  }, [newPassword, requirements]);

  // =========================================================================
  // SECTION 2: ACTIVE SESSIONS STATE
  // =========================================================================
  const [sessions, setSessions] = useState<UserSessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  // Confirmation modal state
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    type: 'single' | 'all_others';
    sessionId?: number;
    sessionDevice?: string;
  }>({
    isOpen: false,
    type: 'single',
  });
  const [isRevoking, setIsRevoking] = useState(false);

  // =========================================================================
  // SECTION 3: LOGIN ACTIVITY STATE
  // =========================================================================
  const [loginActivity, setLoginActivity] = useState<LoginActivityItem[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    loadSessions();
    loadLoginActivity();
  }, []);

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    setSessionsError(null);
    try {
      const data = await api.getSessions();
      setSessions(data);
    } catch (err: any) {
      setSessionsError(err.message || 'Unable to load active sessions.');
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadLoginActivity = async () => {
    setIsLoadingActivity(true);
    setActivityError(null);
    try {
      const data = await api.getLoginActivity(15);
      setLoginActivity(data);
    } catch (err: any) {
      setActivityError(err.message || 'Unable to load login activity.');
    } finally {
      setIsLoadingActivity(false);
    }
  };

  // 1. Password update submit handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please provide your current password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password cannot be the same as your current password.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSuccess(res.message || 'Password changed successfully. All other sessions have been signed out.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Refresh sessions and login activity
      loadSessions();
      loadLoginActivity();
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password. Please check your current password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // 2. Session sign out execution
  const executeRevokeSession = async () => {
    setIsRevoking(true);
    try {
      if (confirmModalState.type === 'single' && confirmModalState.sessionId) {
        await api.revokeSession(confirmModalState.sessionId);
      } else if (confirmModalState.type === 'all_others') {
        await api.revokeOtherSessions();
      }
      setConfirmModalState({ isOpen: false, type: 'single' });
      await loadSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to terminate session.');
    } finally {
      setIsRevoking(false);
    }
  };

  const otherSessionsCount = sessions.filter(s => !s.is_current).length;

  const getDeviceIcon = (deviceStr: string = '') => {
    const lower = deviceStr.toLowerCase();
    if (lower.includes('phone') || lower.includes('mobile') || lower.includes('iphone') || lower.includes('android')) {
      return <Smartphone className="w-5 h-5 text-slate-600" />;
    }
    if (lower.includes('ipad') || lower.includes('tablet')) {
      return <Tablet className="w-5 h-5 text-slate-600" />;
    }
    if (lower.includes('laptop') || lower.includes('macbook')) {
      return <Laptop className="w-5 h-5 text-slate-600" />;
    }
    return <Monitor className="w-5 h-5 text-slate-600" />;
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'Just now';
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* PAGE HEADER */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#260002] text-[#E6B676] flex items-center justify-center border border-[#C58B3E]/30 shadow-xs">
            <Shield className="w-5 h-5 text-[#E6B676]" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Security</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage your password and account access.</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: PASSWORD & AUTHENTICATION */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Section Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#FAF5EE] text-[#781019] flex items-center justify-center border border-[#E6B676]/40">
              <KeyRound className="w-4 h-4 text-[#781019]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Password & Authentication</h2>
              <p className="text-xs text-slate-500">Ensure your account uses a strong, protected password</p>
            </div>
          </div>
        </div>

        {/* Section Content */}
        <div className="p-6">
          <form onSubmit={handleUpdatePassword} className="max-w-xl space-y-5">
            {/* Feedback Alerts */}
            {passwordSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-xs text-emerald-800 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-emerald-900">Password Updated Successfully</p>
                  <p>{passwordSuccess}</p>
                </div>
              </div>
            )}

            {passwordError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-xs text-rose-800 animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-rose-900">Update Failed</p>
                  <p>{passwordError}</p>
                </div>
              </div>
            )}

            {/* Current Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#781019]/20 focus:border-[#781019] transition-all bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  title={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter a new secure password"
                  className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#781019]/20 focus:border-[#781019] transition-all bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {newPassword.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Password strength:</span>
                    <span className={`font-bold ${strength.text}`}>{strength.label}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${strength.color} transition-all duration-300 rounded-full`}
                      style={{ width: `${strength.score}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className={`w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border transition-all bg-white focus:outline-none focus:ring-2 ${
                    confirmPassword && confirmPassword !== newPassword
                      ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-500'
                      : 'border-slate-300 focus:ring-[#781019]/20 focus:border-[#781019]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Passwords do not match
                </p>
              )}
            </div>

            {/* Password Requirements Checklist */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                Password Requirements:
              </span>
              <ul className="space-y-1.5 text-slate-600 text-[11px]">
                <li className="flex items-center space-x-2">
                  {requirements.minLength ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 font-bold" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block shrink-0" />
                  )}
                  <span className={requirements.minLength ? 'text-slate-900 font-medium' : ''}>
                    At least 6 characters (Required)
                  </span>
                </li>
                <li className="flex items-center space-x-2">
                  {requirements.recommendedLength ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 font-bold" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block shrink-0" />
                  )}
                  <span className={requirements.recommendedLength ? 'text-slate-900 font-medium' : ''}>
                    At least 8 characters (Recommended)
                  </span>
                </li>
                <li className="flex items-center space-x-2">
                  {requirements.hasUpperLower ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 font-bold" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block shrink-0" />
                  )}
                  <span className={requirements.hasUpperLower ? 'text-slate-900 font-medium' : ''}>
                    Mix of uppercase and lowercase letters
                  </span>
                </li>
                <li className="flex items-center space-x-2">
                  {requirements.hasNumberOrSpecial ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 font-bold" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block shrink-0" />
                  )}
                  <span className={requirements.hasNumberOrSpecial ? 'text-slate-900 font-medium' : ''}>
                    At least one number or special character
                  </span>
                </li>
              </ul>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdatingPassword || (newPassword.length > 0 && newPassword !== confirmPassword)}
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#260002] hover:bg-[#390003] active:bg-[#1E0002] rounded-xl shadow-xs border border-[#C58B3E]/30 flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingPassword ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#E6B676]" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-[#E6B676]" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: ACTIVE SESSIONS */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Section Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#FAF5EE] text-[#781019] flex items-center justify-center border border-[#E6B676]/40">
              <Monitor className="w-4 h-4 text-[#781019]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Active Sessions</h2>
              <p className="text-xs text-slate-500">Manage devices currently logged into your RicozBooks account</p>
            </div>
          </div>

          {/* Sign Out All Other Sessions button */}
          {otherSessionsCount > 0 && (
            <button
              onClick={() => setConfirmModalState({ isOpen: true, type: 'all_others' })}
              className="px-3.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 flex items-center space-x-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out All Other Sessions ({otherSessionsCount})</span>
            </button>
          )}
        </div>

        {/* Section Content */}
        <div className="p-6">
          {isLoadingSessions ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-16 bg-slate-100 rounded-xl" />
              <div className="h-16 bg-slate-100 rounded-xl" />
            </div>
          ) : sessionsError ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
              <span>{sessionsError}</span>
              <button onClick={loadSessions} className="underline font-bold hover:text-rose-900">
                Retry
              </button>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
              No active session information available.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sessions.map((session) => (
                <div 
                  key={session.id} 
                  className={`py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    session.is_current ? 'bg-emerald-50/30 -mx-3 px-3 rounded-xl' : ''
                  }`}
                >
                  {/* Left: Device & Platform details */}
                  <div className="flex items-start space-x-3.5">
                    <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
                      {getDeviceIcon(session.device)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          {session.device} • {session.browser}
                        </span>
                        {session.is_current && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                            Current Session
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-slate-400" />
                          {session.os}
                        </span>
                        {session.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {session.location}
                          </span>
                        )}
                        {session.ip_address && (
                          <span className="font-mono text-slate-400">
                            IP: {session.ip_address}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Last active: {formatDateTime(session.last_active_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="sm:self-center shrink-0 pl-11 sm:pl-0">
                    {session.is_current ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        Active Now
                      </span>
                    ) : (
                      <button
                        onClick={() =>
                          setConfirmModalState({
                            isOpen: true,
                            type: 'single',
                            sessionId: session.id,
                            sessionDevice: `${session.device} (${session.browser})`,
                          })
                        }
                        className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer flex items-center space-x-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: LOGIN ACTIVITY */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Section Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#FAF5EE] text-[#781019] flex items-center justify-center border border-[#E6B676]/40">
              <History className="w-4 h-4 text-[#781019]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Login Activity</h2>
              <p className="text-xs text-slate-500">Recent sign-in events and access audit log for your account</p>
            </div>
          </div>
          <button
            onClick={loadLoginActivity}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh login activity"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingActivity ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Section Content */}
        <div className="p-6">
          {isLoadingActivity ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-10 bg-slate-100 rounded-lg" />
              <div className="h-10 bg-slate-100 rounded-lg" />
              <div className="h-10 bg-slate-100 rounded-lg" />
            </div>
          ) : activityError ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
              <span>{activityError}</span>
              <button onClick={loadLoginActivity} className="underline font-bold hover:text-rose-900">
                Retry
              </button>
            </div>
          ) : loginActivity.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
              <p className="font-semibold text-slate-700">No recent login activity available.</p>
              <p className="text-slate-400">Events will appear here each time you log into RicozBooks.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="pb-3 pr-4">Date & Time</th>
                    <th className="pb-3 px-4">Device / Browser</th>
                    <th className="pb-3 px-4">Location</th>
                    <th className="pb-3 px-4">IP Address</th>
                    <th className="pb-3 pl-4 text-right">Login Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loginActivity.map((activity) => (
                    <tr key={activity.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 pr-4 whitespace-nowrap text-slate-800 font-medium">
                        {formatDateTime(activity.timestamp)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-medium">
                        {activity.device_browser}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                        {activity.location || 'India (Detected)'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {activity.ip_address || '—'}
                      </td>
                      <td className="py-3.5 pl-4 whitespace-nowrap text-right">
                        {activity.status === 'SUCCESS' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3 mr-1 text-emerald-600" />
                            Successful
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <X className="w-3 h-3 mr-1 text-rose-600" />
                            Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CONFIRMATION MODAL FOR SIGNING OUT SESSIONS */}
      {/* ========================================================================= */}
      {confirmModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-rose-50 to-white border-b border-rose-100 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {confirmModalState.type === 'all_others'
                    ? 'Sign Out All Other Sessions?'
                    : 'Sign Out Session?'}
                </h3>
                <p className="text-xs text-slate-500">Please confirm session revocation</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 text-xs text-slate-600 space-y-3 leading-relaxed">
              {confirmModalState.type === 'all_others' ? (
                <p>
                  Are you sure you want to sign out of <strong>all other {otherSessionsCount} active sessions</strong>? Any devices other than this current browser will require logging in again.
                </p>
              ) : (
                <p>
                  Are you sure you want to terminate the active session on{' '}
                  <strong>{confirmModalState.sessionDevice || 'this device'}</strong>? That browser will be immediately signed out.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                disabled={isRevoking}
                onClick={() => setConfirmModalState({ isOpen: false, type: 'single' })}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRevoking}
                onClick={executeRevokeSession}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isRevoking ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Signing out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Confirm Sign Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
