import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Building2, 
  User, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  Mail, 
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import { validateInvitationToken, acceptTenantInvitation, InvitationPublicInfo } from '../services/accountingApi';
import { useAuth } from '../context/AuthContext';

export const AcceptInvitationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setSession } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [inviteInfo, setInviteInfo] = useState<InvitationPublicInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function checkToken() {
      if (!token) {
        setError('Missing invitation token.');
        setIsLoading(false);
        return;
      }

      try {
        const info = await validateInvitationToken(token);
        if (info.is_valid) {
          setInviteInfo(info);
        } else {
          setError(info.message || 'This invitation has expired or is no longer valid.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to validate invitation token.');
      } finally {
        setIsLoading(false);
      }
    }

    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setSubmitError('Please enter your first and last name.');
      return;
    }
    if (password.length < 6) {
      setSubmitError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await acceptTenantInvitation({
        token: token!,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        password: password,
      });

      // Automatically sign in
      if (res.access_token && res.user) {
        await setSession(res.access_token, res.user);
        navigate('/dashboard');
      } else {
        // Fallback to login
        navigate('/login');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to accept invitation. Please try again or contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ORG_ADMIN':
      case 'ADMIN':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">Organization Admin</span>;
      case 'MANAGER':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Finance Manager</span>;
      case 'ACCOUNTANT':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Accountant</span>;
      case 'REVIEWER':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">Reviewer (Checker)</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">{role}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-[#781019] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium text-sm">Verifying organization invitation...</p>
      </div>
    );
  }

  if (error || !inviteInfo) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-xl text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-200">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Invitation Expired or Invalid</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {error || 'This invitation link has either already been accepted, revoked, or has expired after 7 days.'}
          </p>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 mb-6">
            Please request a new invitation from your company administrator, or log in if you already have an active account.
          </div>
          <Link
            to="/login"
            className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-[#781019] text-white font-semibold text-sm hover:bg-[#8F131E] transition-colors"
          >
            <span>Return to Login</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      
      {/* LEFT COLUMN: INVITATION HERO (IMPERIAL BURGUNDY) */}
      <div className="w-full md:w-5/12 bg-[#260002] text-white p-8 md:p-12 flex flex-col justify-between border-r border-[#390003] relative overflow-hidden">
        
        {/* Glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#E6B676]/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#781019]/20 blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3">
            <img 
              src="/logo.jpg" 
              alt="RicozBooks Logo" 
              className="w-14 h-14 rounded-xl object-cover shadow-lg border border-[#C58B3E]/40" 
            />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                Ricoz<span className="text-[#E6B676]">Books</span>
              </h1>
              <div className="text-[10px] uppercase tracking-widest text-[#EEC68B] font-semibold">
                Team Workspace Invitation
              </div>
            </div>
          </div>

          <div className="mt-12 space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#390003] text-[#EEC68B] border border-[#C58B3E]/30">
              <Sparkles className="w-3.5 h-3.5 text-[#E6B676]" />
              <span>You've Been Invited</span>
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
              Join <span className="text-[#E6B676]">{inviteInfo.company_name}</span> <br />
              on RicozBooks
            </h2>

            <p className="text-slate-300 text-sm leading-relaxed max-w-md pt-2">
              {inviteInfo.inviter_name ? `${inviteInfo.inviter_name} has` : 'Your organization has'} invited you to collaborate in their financial workspace. You will have full access to authorized general ledgers, voucher submissions, and statutory reporting.
            </p>
          </div>

          {/* Invitation Meta Card */}
          <div className="mt-8 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Organization:</span>
              <span className="font-semibold text-white flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#E6B676]" />
                <span>{inviteInfo.company_name}</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Assigned Role:</span>
              <span>{getRoleBadge(inviteInfo.role)}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Target Email:</span>
              <span className="font-mono text-slate-200">{inviteInfo.email}</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>Need to sign into an existing account?</span>
          <Link to="/login" className="text-[#E6B676] hover:text-white font-semibold underline underline-offset-4">
            Sign In
          </Link>
        </div>
      </div>

      {/* RIGHT COLUMN: ACCEPT INVITATION FORM */}
      <div className="w-full md:w-7/12 p-6 md:p-12 lg:p-16 flex flex-col justify-center max-w-xl mx-auto">
        
        <div className="mb-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Invitation Verified</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Set Up Your Profile</h2>
          <p className="text-xs text-slate-500 mt-1">Complete your user profile and choose a password to join the company.</p>
        </div>

        {submitError && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to accept</p>
              <p className="text-xs mt-0.5 text-red-700">{submitError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Readonly Invited Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Work Email <span className="text-slate-400 font-normal">(locked to invitation)</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="email"
                value={inviteInfo.email}
                disabled
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 text-sm font-medium cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Maya"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#781019]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Patel"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#781019]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Create Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#781019]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#781019]"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>By accepting, you join <strong>{inviteInfo.company_name}</strong> with role-governed ledger access.</span>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center space-x-2 py-3 px-6 rounded-xl bg-gradient-to-r from-[#781019] to-[#991B1B] text-white font-bold text-sm hover:from-[#8F131E] hover:to-[#B91C1C] shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Accepting & Logging in...</span>
                </>
              ) : (
                <>
                  <span>Accept Invitation & Launch Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

