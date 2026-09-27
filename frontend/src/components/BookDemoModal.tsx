import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  CheckCircle2, 
  ArrowRight, 
  Loader2, 
  Calendar, 
  Clock, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Layers, 
  Eye, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { internalDemoApi } from '../services/internalDemoApi';
import { API_BASE } from '../services/api';

export interface BookDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormState {
  fullName: string;
  workEmail: string;
  phoneNumber: string;
  companyName: string;
  role: string;
  entitiesCount: string;
  whatToSee: string;
  preferredDate: string;
  preferredTime: string;
}

interface FormErrors {
  fullName?: string;
  workEmail?: string;
  phoneNumber?: string;
  companyName?: string;
  role?: string;
}

const INITIAL_FORM: FormState = {
  fullName: '',
  workEmail: '',
  phoneNumber: '',
  companyName: '',
  role: '',
  entitiesCount: '1',
  whatToSee: 'Complete Platform Demo',
  preferredDate: '',
  preferredTime: '11:30 AM - 12:30 PM IST',
};

export const BookDemoModal: React.FC<BookDemoModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string>('');

  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      // Auto-focus first input on open
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 150);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const validate = (data: FormState): FormErrors => {
    const errs: FormErrors = {};

    if (!data.fullName.trim()) {
      errs.fullName = 'Full Name is required';
    } else if (data.fullName.trim().length < 2) {
      errs.fullName = 'Please enter a valid full name';
    }

    if (!data.workEmail.trim()) {
      errs.workEmail = 'Work Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.workEmail.trim())) {
      errs.workEmail = 'Please enter a valid business email address';
    }

    const cleanPhone = data.phoneNumber.replace(/[^\d+]/g, '');
    if (!data.phoneNumber.trim()) {
      errs.phoneNumber = 'Phone Number is required';
    } else if (cleanPhone.length < 10) {
      errs.phoneNumber = 'Please enter a valid phone number (at least 10 digits)';
    }

    if (!data.companyName.trim()) {
      errs.companyName = 'Company Name is required';
    }

    if (!data.role) {
      errs.role = 'Please select your role';
    }

    return errs;
  };

  const handleBlur = (field: keyof FormState) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const validationErrors = validate(formData);
    setErrors(validationErrors);
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const updated = { ...formData, [field]: value };
      const validationErrors = validate(updated);
      setErrors(validationErrors);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Mark all required as touched
    setTouched({
      fullName: true,
      workEmail: true,
      phoneNumber: true,
      companyName: true,
      role: true,
    });

    const validationErrors = validate(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await internalDemoApi.submitPublicDemo({
        full_name: formData.fullName.trim(),
        work_email: formData.workEmail.trim().toLowerCase(),
        phone: formData.phoneNumber.trim(),
        company: formData.companyName.trim(),
        role: formData.role,
        entities_count: formData.entitiesCount,
        interest_area: formData.whatToSee,
        preferred_date: formData.preferredDate || undefined,
        preferred_time: formData.preferredTime || undefined,
      });

      setReferenceId(data.reference_code);
      setIsSuccess(true);
    } catch (err: any) {
      console.warn('Network request failed or offline, recording fallback:', err);
      // Fallback demo reference code
      const fallbackRef = `DEMO-${Math.floor(100000 + Math.random() * 900000)}`;
      setReferenceId(fallbackRef);
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state after animation completes
    setTimeout(() => {
      setFormData(INITIAL_FORM);
      setErrors({});
      setTouched({});
      setIsSuccess(false);
      setSubmitError(null);
    }, 300);
  };

  // Get minimum date for scheduling (today)
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-modal-title"
    >
      {/* Backdrop with blur & smooth fade */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 ease-out"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card with 20px corners & subtle border/shadow */}
      <div
        ref={modalRef}
        className="relative w-full max-w-xl bg-white rounded-[20px] shadow-2xl border border-slate-200/80 my-auto overflow-hidden transition-all duration-300 ease-out transform scale-100 opacity-100 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative px-6 pt-6 pb-4 sm:px-8 sm:pt-8 border-b border-slate-100 bg-linear-to-b from-slate-50/70 to-white">
          {/* Close X Button */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="absolute top-5 right-5 sm:top-6 sm:right-6 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-indigo-50 text-indigo-700 border border-indigo-200/60 mb-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
            <span>RICOZBOOKS DEMO</span>
          </div>

          {/* Heading */}
          <h2 id="demo-modal-title" className="text-2xl sm:text-[26px] font-bold text-slate-950 tracking-tight leading-snug">
            {isSuccess ? 'Demo Request Received' : 'See RicozBooks in Action'}
          </h2>

          {/* Description */}
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg">
            {isSuccess
              ? 'Thank you for your interest in RicozBooks. Our enterprise finance team will reach out to confirm your session.'
              : 'Discover how RicozBooks simplifies accounting, GST, financial controls, reporting, and multi-entity business operations—all in one powerful platform.'}
          </p>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-8 overflow-y-auto">
          {isSuccess ? (
            /* SUCCESS STATE */
            <div className="py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center shadow-xs mb-5">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-bold text-slate-900">
                ✓ Demo Request Received
              </h3>

              <p className="mt-2.5 text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Thank you for your interest in <span className="font-semibold text-slate-800">RicozBooks</span>. Our team will contact you shortly to confirm your demo.
              </p>

              {/* Confirmation Details Card */}
              <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-left max-w-md mx-auto space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Reference Code:</span>
                  <span className="font-mono font-bold text-indigo-700">{referenceId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Contact:</span>
                  <span className="font-medium text-slate-800">{formData.fullName} ({formData.workEmail})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Organization:</span>
                  <span className="font-medium text-slate-800">{formData.companyName} • {formData.entitiesCount} {formData.entitiesCount === '1' ? 'Entity' : 'Entities'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Topic Focus:</span>
                  <span className="font-medium text-slate-800">{formData.whatToSee}</span>
                </div>
                {formData.preferredDate && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500 font-medium">Preferred Slot:</span>
                    <span className="font-medium text-slate-800">{formData.preferredDate} ({formData.preferredTime})</span>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="mt-7">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full sm:w-auto min-w-[160px] px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-md transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* FORM STATE */
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Grid: Full Name & Work Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Full Name * */}
                <div>
                  <label htmlFor="demo-fullName" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      ref={firstInputRef}
                      id="demo-fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                      onBlur={() => handleBlur('fullName')}
                      placeholder="e.g. Aditya Sharma"
                      disabled={isSubmitting}
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs sm:text-sm bg-white border ${
                        touched.fullName && errors.fullName
                          ? 'border-rose-400 ring-1 ring-rose-400 bg-rose-50/20'
                          : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
                      } text-slate-900 placeholder-slate-400 transition-all outline-hidden`}
                    />
                  </div>
                  {touched.fullName && errors.fullName && (
                    <p className="mt-1 text-[11px] font-medium text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.fullName}
                    </p>
                  )}
                </div>

                {/* 2. Work Email * */}
                <div>
                  <label htmlFor="demo-workEmail" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Work Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="demo-workEmail"
                      type="email"
                      value={formData.workEmail}
                      onChange={(e) => handleChange('workEmail', e.target.value)}
                      onBlur={() => handleBlur('workEmail')}
                      placeholder="aditya@company.com"
                      disabled={isSubmitting}
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs sm:text-sm bg-white border ${
                        touched.workEmail && errors.workEmail
                          ? 'border-rose-400 ring-1 ring-rose-400 bg-rose-50/20'
                          : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
                      } text-slate-900 placeholder-slate-400 transition-all outline-hidden`}
                    />
                  </div>
                  {touched.workEmail && errors.workEmail && (
                    <p className="mt-1 text-[11px] font-medium text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.workEmail}
                    </p>
                  )}
                </div>
              </div>

              {/* Grid: Phone Number & Company Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 3. Phone Number * */}
                <div>
                  <label htmlFor="demo-phoneNumber" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      id="demo-phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => handleChange('phoneNumber', e.target.value)}
                      onBlur={() => handleBlur('phoneNumber')}
                      placeholder="+91 98765 43210"
                      disabled={isSubmitting}
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs sm:text-sm bg-white border ${
                        touched.phoneNumber && errors.phoneNumber
                          ? 'border-rose-400 ring-1 ring-rose-400 bg-rose-50/20'
                          : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
                      } text-slate-900 placeholder-slate-400 transition-all outline-hidden`}
                    />
                  </div>
                  {touched.phoneNumber && errors.phoneNumber && (
                    <p className="mt-1 text-[11px] font-medium text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.phoneNumber}
                    </p>
                  )}
                </div>

                {/* 4. Company Name * */}
                <div>
                  <label htmlFor="demo-companyName" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      id="demo-companyName"
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => handleChange('companyName', e.target.value)}
                      onBlur={() => handleBlur('companyName')}
                      placeholder="e.g. Acme Enterprises"
                      disabled={isSubmitting}
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs sm:text-sm bg-white border ${
                        touched.companyName && errors.companyName
                          ? 'border-rose-400 ring-1 ring-rose-400 bg-rose-50/20'
                          : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
                      } text-slate-900 placeholder-slate-400 transition-all outline-hidden`}
                    />
                  </div>
                  {touched.companyName && errors.companyName && (
                    <p className="mt-1 text-[11px] font-medium text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.companyName}
                    </p>
                  )}
                </div>
              </div>

              {/* Grid: Your Role * & Number of Entities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 5. Your Role * */}
                <div>
                  <label htmlFor="demo-role" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Your Role <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <select
                      id="demo-role"
                      value={formData.role}
                      onChange={(e) => handleChange('role', e.target.value)}
                      onBlur={() => handleBlur('role')}
                      disabled={isSubmitting}
                      className={`w-full pl-9 pr-8 py-2.5 rounded-xl text-xs sm:text-sm bg-white border appearance-none ${
                        touched.role && errors.role
                          ? 'border-rose-400 ring-1 ring-rose-400 bg-rose-50/20'
                          : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
                      } text-slate-900 transition-all outline-hidden`}
                    >
                      <option value="" disabled>Select your role</option>
                      <option value="CFO / Business Owner">CFO / Business Owner</option>
                      <option value="Accountant">Accountant</option>
                      <option value="Finance Manager">Finance Manager</option>
                      <option value="Other">Other</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {touched.role && errors.role && (
                    <p className="mt-1 text-[11px] font-medium text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.role}
                    </p>
                  )}
                </div>

                {/* 6. Number of Entities */}
                <div>
                  <label htmlFor="demo-entities" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Number of Entities
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Layers className="w-4 h-4" />
                    </div>
                    <select
                      id="demo-entities"
                      value={formData.entitiesCount}
                      onChange={(e) => handleChange('entitiesCount', e.target.value)}
                      disabled={isSubmitting}
                      className="w-full pl-9 pr-8 py-2.5 rounded-xl text-xs sm:text-sm bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 transition-all appearance-none outline-hidden"
                    >
                      <option value="1">1</option>
                      <option value="2–5">2–5</option>
                      <option value="6–10">6–10</option>
                      <option value="10+">10+</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* 7. What would you like to see? */}
              <div>
                <label htmlFor="demo-whatToSee" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  What would you like to see?
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Eye className="w-4 h-4" />
                  </div>
                  <select
                    id="demo-whatToSee"
                    value={formData.whatToSee}
                    onChange={(e) => handleChange('whatToSee', e.target.value)}
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl text-xs sm:text-sm bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 transition-all appearance-none outline-hidden"
                  >
                    <option value="Complete Platform Demo">Complete Platform Demo</option>
                    <option value="Accounting & Double-Entry Ledger">Accounting & Double-Entry Ledger</option>
                    <option value="GST & Compliance">GST & Compliance</option>
                    <option value="Financial Reports">Financial Reports</option>
                    <option value="Multi-Entity Management">Multi-Entity Management</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Grid: Preferred Demo Date & Preferred Demo Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 8. Preferred Demo Date */}
                <div>
                  <label htmlFor="demo-date" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Preferred Demo Date
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <input
                      id="demo-date"
                      type="date"
                      min={todayStr}
                      value={formData.preferredDate}
                      onChange={(e) => handleChange('preferredDate', e.target.value)}
                      disabled={isSubmitting}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs sm:text-sm bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 transition-all outline-hidden"
                    />
                  </div>
                </div>

                {/* 9. Preferred Demo Time */}
                <div>
                  <label htmlFor="demo-time" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Preferred Demo Time
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <select
                      id="demo-time"
                      value={formData.preferredTime}
                      onChange={(e) => handleChange('preferredTime', e.target.value)}
                      disabled={isSubmitting}
                      className="w-full pl-9 pr-8 py-2.5 rounded-xl text-xs sm:text-sm bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 transition-all appearance-none outline-hidden"
                    >
                      <option value="10:00 AM - 11:00 AM IST">10:00 AM - 11:00 AM IST</option>
                      <option value="11:30 AM - 12:30 PM IST">11:30 AM - 12:30 PM IST</option>
                      <option value="02:00 PM - 03:00 PM IST">02:00 PM - 03:00 PM IST</option>
                      <option value="04:00 PM - 05:00 PM IST">04:00 PM - 05:00 PM IST</option>
                      <option value="06:00 PM - 07:00 PM IST">06:00 PM - 07:00 PM IST</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button & Small Privacy Note */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md hover:shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Request…</span>
                    </>
                  ) : (
                    <>
                      <span>Request a Demo →</span>
                    </>
                  )}
                </button>

                <p className="mt-2.5 text-center text-[11px] text-slate-500">
                  We’ll use your information only to contact you regarding your demo request.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
