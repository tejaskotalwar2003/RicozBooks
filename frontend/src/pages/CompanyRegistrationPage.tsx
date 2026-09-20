import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  MapPin, 
  Globe2, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { registerCompany, CompanyRegistrationData } from '../services/accountingApi';
import { useAuth } from '../context/AuthContext';

export const CompanyRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const { setSession } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Company Profile
    company_name: '',
    legal_name: '',
    business_email: '',
    phone_number: '',
    country: 'India',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    
    // Step 2: Financial Setup
    base_currency: 'INR',
    timezone: 'Asia/Kolkata',
    tax_identifier: '',
    
    // Step 3: Admin User
    admin_name: '',
    admin_email: '',
    password: '',
    confirm_password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // Sync admin_email with business_email if admin_email wasn't explicitly changed
      if (name === 'business_email' && (!prev.admin_email || prev.admin_email === prev.business_email)) {
        updated.admin_email = value;
      }
      return updated;
    });
    if (error) setError(null);
  };

  const validateStep1 = () => {
    if (!formData.company_name.trim()) return 'Please enter your Company Name.';
    if (!formData.business_email.trim() || !formData.business_email.includes('@')) {
      return 'Please enter a valid corporate Business Email.';
    }
    return null;
  };

  const validateStep2 = () => {
    if (!formData.base_currency) return 'Please select a base operating currency.';
    if (!formData.timezone) return 'Please select a primary timezone.';
    return null;
  };

  const validateStep3 = () => {
    if (!formData.admin_name.trim()) return 'Please enter the Administrator Full Name.';
    if (!formData.admin_email.trim() || !formData.admin_email.includes('@')) {
      return 'Please enter a valid Admin Email address.';
    }
    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters long.';
    }
    if (formData.password !== formData.confirm_password) {
      return 'Passwords do not match.';
    }
    return null;
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) { setError(err); return; }
      setStep(3);
    }
  };

  const handleBack = () => {
    setError(null);
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep3();
    if (err) { setError(err); return; }

    setIsSubmitting(true);
    setError(null);

    const payload: CompanyRegistrationData = {
      company_name: formData.company_name.trim(),
      legal_name: formData.legal_name.trim() || undefined,
      business_email: formData.business_email.trim().toLowerCase(),
      phone_number: formData.phone_number.trim() || undefined,
      country: formData.country,
      address: formData.address.trim() || undefined,
      city: formData.city.trim() || undefined,
      state: formData.state.trim() || undefined,
      postal_code: formData.postal_code.trim() || undefined,
      base_currency: formData.base_currency,
      timezone: formData.timezone,
      tax_identifier: formData.tax_identifier.trim() || undefined,
      admin_name: formData.admin_name.trim(),
      admin_email: formData.admin_email.trim().toLowerCase(),
      password: formData.password,
    };

    try {
      const res = await registerCompany(payload);
      // Auto login user into their new tenant workspace
      await setSession(res.access_token, res.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to register organization. Please check details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      
      {/* LEFT COLUMN: BRAND & VALUE PROP (IMPERIAL BURGUNDY) */}
      <div className="w-full md:w-5/12 bg-[#260002] text-white p-8 md:p-12 flex flex-col justify-between border-r border-[#390003] relative overflow-hidden">
        
        {/* Glow effects */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#E6B676]/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#781019]/20 blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <Link to="/" className="flex items-center space-x-3 group">
            <img 
              src="/logo.jpg" 
              alt="RicozBooks Logo" 
              className="w-14 h-14 rounded-xl object-cover shadow-lg border border-[#C58B3E]/40 group-hover:scale-105 transition-transform" 
            />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                Ricoz<span className="text-[#E6B676]">Books</span>
              </h1>
              <div className="text-[10px] uppercase tracking-widest text-[#EEC68B] font-semibold">
                by ricoz • Enterprise SaaS
              </div>
            </div>
          </Link>

          <div className="mt-12 space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#390003] text-[#EEC68B] border border-[#C58B3E]/30">
              <Sparkles className="w-3.5 h-3.5 text-[#E6B676]" />
              <span>Instant Organization Onboarding</span>
            </div>

            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Create Your Company <br />
              <span className="text-[#E6B676]">Financial Workspace</span>
            </h2>

            <p className="text-slate-300 text-sm leading-relaxed max-w-md pt-2">
              Sign up in seconds to provision an isolated tenant environment with automated GAAP/IFRS Chart of Accounts, multi-currency ledger, and enterprise role-based governance.
            </p>
          </div>

          {/* Provisioning Checklist */}
          <div className="mt-10 space-y-4 text-xs text-slate-200">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-[#390003] border border-[#C58B3E]/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-[#E6B676]" />
              </div>
              <div>
                <strong className="text-white block font-medium">Atomic Tenant Provisioning</strong>
                <span className="text-slate-400 text-[11px]">Primary operating entity, 12 core accounts, and 12-month fiscal calendar initialized.</span>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-[#390003] border border-[#C58B3E]/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-[#E6B676]" />
              </div>
              <div>
                <strong className="text-white block font-medium">Finance Admin Ownership</strong>
                <span className="text-slate-400 text-[11px]">You become the Organization Admin with full workspace invite and approval privileges.</span>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-[#390003] border border-[#C58B3E]/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-[#E6B676]" />
              </div>
              <div>
                <strong className="text-white block font-medium">Strict Tenant Data Isolation</strong>
                <span className="text-slate-400 text-[11px]">Database query scoping ensures zero data leakage between organizations.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 pt-8 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>Already have an account?</span>
          <Link to="/login" className="text-[#E6B676] hover:text-white font-semibold underline underline-offset-4">
            Sign In here
          </Link>
        </div>
      </div>

      {/* RIGHT COLUMN: REGISTRATION FORM */}
      <div className="w-full md:w-7/12 p-6 md:p-12 lg:p-16 flex flex-col justify-center max-w-2xl mx-auto">
        
        {/* Step Progress Tracker */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Step {step} of 3 • {step === 1 ? 'Organization Profile' : step === 2 ? 'Accounting Setup' : 'Admin Credentials'}
            </span>
            <span className="text-xs font-semibold text-[#781019]">
              {step === 1 ? '33%' : step === 2 ? '66%' : '100%'} Completed
            </span>
          </div>
          
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-[#781019] to-[#C58B3E] h-full transition-all duration-300 rounded-full"
              style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
            ></div>
          </div>

          <div className="flex justify-between mt-2 text-[11px] text-slate-500">
            <span className={step >= 1 ? 'font-semibold text-slate-800' : ''}>1. Company Info</span>
            <span className={step >= 2 ? 'font-semibold text-slate-800' : ''}>2. Currency & Tax</span>
            <span className={step >= 3 ? 'font-semibold text-slate-800' : ''}>3. Admin Access</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to proceed</p>
              <p className="text-xs mt-0.5 text-red-700">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
          
          {/* STEP 1: COMPANY PROFILE */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Tell us about your organization</h3>
                <p className="text-xs text-slate-500 mt-1">This information establishes your company's fiscal identity and invoices.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company / Organization Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    placeholder="e.g. Acme Technologies Inc"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#781019] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Legal Business Name <span className="text-slate-400 font-normal">(optional, if different)</span>
                </label>
                <input
                  type="text"
                  name="legal_name"
                  value={formData.legal_name}
                  onChange={handleChange}
                  placeholder="e.g. Acme Technologies Private Limited"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#781019] focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Business Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="email"
                      name="business_email"
                      value={formData.business_email}
                      onChange={handleChange}
                      placeholder="finance@acme.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#781019] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="tel"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleChange}
                      placeholder="+91 98765 43210"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#781019] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Country
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#781019]"
                  >
                    <option value="India">India</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="United Arab Emirates">United Arab Emirates</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Germany">Germany</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g. Bengaluru / New York"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#781019]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Office Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Suite, Street address"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#781019]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: FINANCIAL CONFIGURATION */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Accounting & Compliance Settings</h3>
                <p className="text-xs text-slate-500 mt-1">Configure your functional currency and tax baseline for ledger entries.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Functional Base Currency <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="base_currency"
                    value={formData.base_currency}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#781019]"
                  >
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="AED">AED (د.إ) - UAE Dirham</option>
                    <option value="SGD">SGD ($) - Singapore Dollar</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">Primary currency for consolidated statutory balance sheets.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Time Zone <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Globe2 className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <select
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#781019]"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                      <option value="America/New_York">America/New_York (EST/EDT)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                      <option value="Europe/London">Europe/London (GMT/BST)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                      <option value="Asia/Singapore">Asia/Singapore (SGT +8:00)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tax / GST Identifier <span className="text-slate-400 font-normal">(optional, can add later)</span>
                </label>
                <input
                  type="text"
                  name="tax_identifier"
                  value={formData.tax_identifier}
                  onChange={handleChange}
                  placeholder="e.g. 29AABCB1234F1Z5 or EIN / VAT ID"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#781019]"
                />
                <p className="text-[11px] text-slate-500 mt-1">Used on statutory reports, invoices, and GST 2B reconciliation.</p>
              </div>

              {/* Automation callout */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-[#C58B3E] flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-950">Automated Accounting Engine Setup</p>
                  <p className="text-amber-800/90 leading-relaxed">
                    Upon registration, RicozBooks automatically sets up your default operating entity (<strong>{formData.company_name || 'Primary Operating Unit'}</strong>), 12 core double-entry accounts (Assets, Liabilities, Equity, Revenue, COGS, OpEx), and creates an open 12-month fiscal calendar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ADMIN & SECURITY */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Create Finance Admin Account</h3>
                <p className="text-xs text-slate-500 mt-1">
                  You will hold the <strong>ORG_ADMIN</strong> role with complete workspace ownership and invite authority.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrator Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    name="admin_name"
                    value={formData.admin_name}
                    onChange={handleChange}
                    placeholder="e.g. Vikram Sharma"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#781019]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin Work Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    name="admin_email"
                    value={formData.admin_email}
                    onChange={handleChange}
                    placeholder="admin@yourcompany.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#781019]"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">This will be your primary login username.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
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
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleChange}
                      placeholder="Repeat password"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#781019]"
                    />
                  </div>
                </div>
              </div>

              {/* Security terms */}
              <div className="text-[11px] text-slate-500 pt-2 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Passwords are encrypted using Argon2-compatible salted hashes. Full SOC2 & maker-checker compliant.
                </span>
              </div>
            </div>
          )}

          {/* NAVIGATION BUTTONS */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-[#781019] text-white font-semibold text-sm hover:bg-[#8F131E] shadow-sm hover:shadow transition-all"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center space-x-2 px-7 py-2.5 rounded-lg bg-gradient-to-r from-[#781019] to-[#991B1B] text-white font-bold text-sm hover:from-[#8F131E] hover:to-[#B91C1C] shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Provisioning Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Create Organization & Launch</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </form>

      </div>
    </div>
  );
};
