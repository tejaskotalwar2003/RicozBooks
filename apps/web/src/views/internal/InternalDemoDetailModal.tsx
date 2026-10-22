import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Layers, 
  Eye, 
  Video, 
  UserCheck, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  History, 
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  CalendarCheck2,
  CalendarRange,
  Users
} from 'lucide-react';
import { internalDemoApi, DemoRequestItem, InternalUser } from '../../services/internalDemoApi';

export interface InternalDemoDetailModalProps {
  demoId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const InternalDemoDetailModal: React.FC<InternalDemoDetailModalProps> = ({
  demoId,
  isOpen,
  onClose,
  onUpdated
}) => {
  const [demo, setDemo] = useState<DemoRequestItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [team, setTeam] = useState<InternalUser[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sub-modal states
  const [activeTab, setActiveTab] = useState<'details' | 'schedule' | 'reschedule' | 'assign'>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form states
  const [statusVal, setStatusVal] = useState<string>('NEW');
  const [notesVal, setNotesVal] = useState<string>('');
  const [meetingLinkVal, setMeetingLinkVal] = useState<string>('');

  // Schedule form
  const [schedDate, setSchedDate] = useState<string>('');
  const [schedTime, setSchedTime] = useState<string>('11:30 AM - 12:30 PM IST');
  const [schedDuration, setSchedDuration] = useState<string>('45 mins');
  const [schedAssignee, setSchedAssignee] = useState<number | undefined>(undefined);
  const [schedLink, setSchedLink] = useState<string>('');
  const [schedNotes, setSchedNotes] = useState<string>('');

  // Reschedule form
  const [reschedDate, setReschedDate] = useState<string>('');
  const [reschedTime, setReschedTime] = useState<string>('02:00 PM - 03:00 PM IST');
  const [reschedReason, setReschedReason] = useState<string>('');
  const [reschedLink, setReschedLink] = useState<string>('');
  const [reschedAssignee, setReschedAssignee] = useState<number | undefined>(undefined);

  // Assign form
  const [assignTarget, setAssignTarget] = useState<number | undefined>(undefined);

  const loadData = async () => {
    if (!demoId) return;
    setIsLoading(true);
    setActionError(null);
    try {
      const [demoData, teamData] = await Promise.all([
        internalDemoApi.getDemoDetail(demoId),
        internalDemoApi.getTeam()
      ]);
      setDemo(demoData);
      setTeam(teamData);
      setStatusVal(demoData.status);
      setNotesVal(demoData.internal_notes || '');
      setMeetingLinkVal(demoData.meeting_link || '');
      setSchedAssignee(demoData.assigned_to || undefined);
      setSchedLink(demoData.meeting_link || `https://meet.google.com/ricoz-${demoData.reference_code.toLowerCase().replace('demo-', '')}`);
      setAssignTarget(demoData.assigned_to || undefined);

      // Pre-fill dates
      const defaultDate = demoData.confirmed_date || demoData.preferred_date || new Date().toISOString().split('T')[0];
      setSchedDate(defaultDate);
      setReschedDate(defaultDate);
      if (demoData.confirmed_time) setSchedTime(demoData.confirmed_time);
      else if (demoData.preferred_time) setSchedTime(demoData.preferred_time);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load demo details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && demoId) {
      loadData();
      setActiveTab('details');
      setActionSuccess(null);
      setActionError(null);
    }
  }, [isOpen, demoId]);

  if (!isOpen || !demoId) return null;

  const handleStatusChange = async (newStatus: string) => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      const updated = await internalDemoApi.updateStatus(demoId, newStatus);
      setDemo(updated);
      setStatusVal(updated.status);
      setActionSuccess(`Status updated to ${newStatus}`);
      onUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      const updated = await internalDemoApi.updateDemoFields(demoId, {
        internal_notes: notesVal,
        meeting_link: meetingLinkVal
      });
      setDemo(updated);
      setActionSuccess('Internal notes & details saved successfully.');
      onUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to save notes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedDate || !schedTime) {
      setActionError('Please specify confirmed date and time.');
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    try {
      const updated = await internalDemoApi.scheduleDemo(demoId, {
        confirmed_date: schedDate,
        confirmed_time: schedTime,
        duration: schedDuration,
        meeting_link: schedLink.trim() || undefined,
        assigned_to: schedAssignee,
        internal_notes: schedNotes.trim() || undefined
      });
      setDemo(updated);
      setStatusVal(updated.status);
      setActionSuccess('Demo successfully scheduled and confirmed.');
      setActiveTab('details');
      onUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to schedule demo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedDate || !reschedTime) {
      setActionError('Please enter the new scheduled date and time.');
      return;
    }
    if (!reschedReason.trim()) {
      setActionError('Please enter a reason for rescheduling.');
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    try {
      const updated = await internalDemoApi.rescheduleDemo(demoId, {
        new_date: reschedDate,
        new_time: reschedTime,
        reason: reschedReason.trim(),
        meeting_link: reschedLink.trim() || undefined,
        assigned_to: reschedAssignee
      });
      setDemo(updated);
      setStatusVal(updated.status);
      setActionSuccess('Demo rescheduled and logged to audit history.');
      setActiveTab('details');
      onUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to reschedule demo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTarget) {
      setActionError('Please select a team member to assign.');
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    try {
      const updated = await internalDemoApi.assignDemo(demoId, assignTarget);
      setDemo(updated);
      setActionSuccess(`Demo assigned to ${updated.assigned_user_name}`);
      setActiveTab('details');
      onUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to assign demo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyMeetingLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">NEW</span>;
      case 'UNDER REVIEW':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">UNDER REVIEW</span>;
      case 'SCHEDULED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">SCHEDULED</span>;
      case 'CONFIRMED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">CONFIRMED</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">COMPLETED</span>;
      case 'RESCHEDULED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">RESCHEDULED</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">CANCELLED</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">REJECTED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-white rounded-[20px] shadow-2xl border border-slate-200/80 my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-6 py-4 sm:px-8 border-b border-slate-100 bg-linear-to-b from-slate-50/70 to-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-base font-black text-indigo-700 tracking-wider">
              {demo?.reference_code || 'DEMO-REQUEST'}
            </span>
            {demo && getStatusBadge(demo.status)}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div className="px-6 sm:px-8 py-2.5 bg-slate-50/70 border-b border-slate-200/70 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'details'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Request Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            📅 Schedule Demo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reschedule')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'reschedule'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            🔄 Reschedule
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('assign')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'assign'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            👤 Assign Member
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {actionError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
              <span className="text-xs">Loading demo request details…</span>
            </div>
          ) : !demo ? (
            <div className="py-8 text-center text-slate-500 text-sm">Demo request not found.</div>
          ) : (
            <>
              {/* TAB 1: DETAILS OVERVIEW */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Status & Assignment Quick Bar */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
                      <select
                        value={statusVal}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="NEW">NEW</option>
                        <option value="UNDER REVIEW">UNDER REVIEW</option>
                        <option value="SCHEDULED">SCHEDULED</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="RESCHEDULED">RESCHEDULED</option>
                        <option value="CANCELLED">CANCELLED</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-slate-500 font-medium">Assigned To:</span>
                      <span className="font-bold text-indigo-700">
                        {demo.assigned_user_name || 'Unassigned'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('assign')}
                        className="ml-2 text-indigo-600 hover:underline font-semibold cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  {/* Customer Information & Business Info Grids */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Customer Info Card */}
                    <div className="p-5 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Customer Information</span>
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Full Name:</span>
                          <span className="font-bold text-slate-900">{demo.full_name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Work Email:</span>
                          <a href={`mailto:${demo.work_email}`} className="font-medium text-indigo-600 hover:underline flex items-center gap-1">
                            {demo.work_email}
                          </a>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Phone:</span>
                          <a href={`tel:${demo.phone}`} className="font-medium text-slate-800 hover:text-indigo-600">
                            {demo.phone}
                          </a>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Company:</span>
                          <span className="font-bold text-slate-900">{demo.company}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Role:</span>
                          <span className="font-semibold text-slate-800">{demo.role}</span>
                        </div>
                      </div>
                    </div>

                    {/* Business Info & Interest Card */}
                    <div className="p-5 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Business & Requirements</span>
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Entities Count:</span>
                          <span className="font-mono font-bold text-indigo-600">{demo.entities_count} Entities</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Interest Area:</span>
                          <span className="font-bold text-slate-900 text-right">{demo.interest_area}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-slate-500">Preferred Date:</span>
                          <span className="font-medium text-slate-800">{demo.preferred_date || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Preferred Time:</span>
                          <span className="font-medium text-slate-800">{demo.preferred_time || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Submitted At:</span>
                          <span className="font-mono text-slate-500">
                            {new Date(demo.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Confirmed Schedule Card */}
                  <div className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                        <CalendarCheck2 className="w-4 h-4 text-indigo-600" />
                        <span>Confirmed Demo Schedule</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setActiveTab('reschedule')}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        Reschedule
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                        <span className="text-slate-400 block text-[11px] mb-1">Confirmed Date</span>
                        <span className="font-bold text-slate-900">{demo.confirmed_date || 'Pending Schedule'}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                        <span className="text-slate-400 block text-[11px] mb-1">Confirmed Slot</span>
                        <span className="font-bold text-slate-900">{demo.confirmed_time || 'Pending Schedule'}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                        <span className="text-slate-400 block text-[11px] mb-1">Estimated Duration</span>
                        <span className="font-bold text-slate-900">{demo.duration || '45 mins'}</span>
                      </div>
                    </div>

                    {demo.meeting_link && (
                      <div className="mt-2 p-3 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center space-x-2 truncate">
                          <Video className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="text-slate-500 font-medium shrink-0">Meeting Link:</span>
                          <a
                            href={demo.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-indigo-600 hover:underline truncate"
                          >
                            {demo.meeting_link}
                          </a>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyMeetingLink(demo.meeting_link!)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Copy link"
                          >
                            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <a
                            href={demo.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] flex items-center space-x-1"
                          >
                            <span>Join</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Internal Notes Editor */}
                  <div className="p-5 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Private Internal Notes</span>
                      </h4>
                      <span className="text-[11px] text-slate-400">Visible only to internal team</span>
                    </div>

                    <textarea
                      rows={3}
                      value={notesVal}
                      onChange={(e) => setNotesVal(e.target.value)}
                      placeholder="Add follow-up notes, key accounting pain points, custom pricing discussion points…"
                      className="w-full p-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-hidden resize-y"
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveNotes}
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-semibold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>Save Notes</span>
                      </button>
                    </div>
                  </div>

                  {/* Schedule Change History Timeline */}
                  {demo.history && demo.history.length > 0 && (
                    <div className="p-5 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Schedule History & Audit Log</span>
                      </h4>

                      <div className="divide-y divide-slate-100 text-xs">
                        {demo.history.map((h) => (
                          <div key={h.id} className="py-2.5 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-800">
                                {h.new_date} at {h.new_time}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {new Date(h.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-slate-500 text-[11px]">
                              Changed by: <span className="font-medium text-slate-700">{h.changed_by_name || 'System User'}</span>
                            </p>
                            {h.reason && (
                              <p className="text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-200/50">
                                “{h.reason}”
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SCHEDULE DEMO FORM */}
              {activeTab === 'schedule' && (
                <form onSubmit={handleScheduleSubmit} className="space-y-4">
                  <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 leading-relaxed">
                    Setting confirmed schedule will transition status to <strong>SCHEDULED</strong> and update calendar slots.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Demo Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={schedDate}
                        onChange={(e) => setSchedDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-hidden focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Demo Time Slot <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={schedTime}
                        onChange={(e) => setSchedTime(e.target.value)}
                        required
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-hidden focus:border-indigo-600"
                      >
                        <option value="10:00 AM - 11:00 AM IST">10:00 AM - 11:00 AM IST</option>
                        <option value="11:30 AM - 12:30 PM IST">11:30 AM - 12:30 PM IST</option>
                        <option value="02:00 PM - 03:00 PM IST">02:00 PM - 03:00 PM IST</option>
                        <option value="03:30 PM - 04:30 PM IST">03:30 PM - 04:30 PM IST</option>
                        <option value="05:00 PM - 06:00 PM IST">05:00 PM - 06:00 PM IST</option>
                        <option value="06:30 PM - 07:30 PM IST">06:30 PM - 07:30 PM IST</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Duration</label>
                      <select
                        value={schedDuration}
                        onChange={(e) => setSchedDuration(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-hidden focus:border-indigo-600"
                      >
                        <option value="30 mins">30 mins</option>
                        <option value="45 mins">45 mins</option>
                        <option value="60 mins">60 mins</option>
                        <option value="90 mins">90 mins</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Assign To Team Member</label>
                      <select
                        value={schedAssignee || ''}
                        onChange={(e) => setSchedAssignee(Number(e.target.value) || undefined)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-hidden focus:border-indigo-600"
                      >
                        <option value="">Leave Unassigned / Current</option>
                        {team.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.role}) • {m.assigned_count || 0} active
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Video Meeting Link (Google Meet / Zoom)</label>
                    <input
                      type="url"
                      value={schedLink}
                      onChange={(e) => setSchedLink(e.target.value)}
                      placeholder="https://meet.google.com/xyz-abc-def"
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-hidden focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Notes</label>
                    <textarea
                      rows={2}
                      value={schedNotes}
                      onChange={(e) => setSchedNotes(e.target.value)}
                      placeholder="Special agenda, accounting questions, modules to showcase…"
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-hidden focus:border-indigo-600"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveTab('details')}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarCheck2 className="w-4 h-4" />}
                      <span>Schedule Demo</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: RESCHEDULE DEMO FORM */}
              {activeTab === 'reschedule' && (
                <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 leading-relaxed">
                    Rescheduling will log an entry to the audit history and set status to <strong>RESCHEDULED</strong>.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        New Demo Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={reschedDate}
                        onChange={(e) => setReschedDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-hidden focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        New Time Slot <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={reschedTime}
                        onChange={(e) => setReschedTime(e.target.value)}
                        required
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-hidden focus:border-indigo-600"
                      >
                        <option value="10:00 AM - 11:00 AM IST">10:00 AM - 11:00 AM IST</option>
                        <option value="11:30 AM - 12:30 PM IST">11:30 AM - 12:30 PM IST</option>
                        <option value="02:00 PM - 03:00 PM IST">02:00 PM - 03:00 PM IST</option>
                        <option value="03:30 PM - 04:30 PM IST">03:30 PM - 04:30 PM IST</option>
                        <option value="05:00 PM - 06:00 PM IST">05:00 PM - 06:00 PM IST</option>
                        <option value="06:30 PM - 07:30 PM IST">06:30 PM - 07:30 PM IST</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reason for Rescheduling <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={reschedReason}
                      onChange={(e) => setReschedReason(e.target.value)}
                      placeholder="e.g. Client requested deferral due to month-end close."
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-hidden focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Updated Meeting Link (Optional)</label>
                    <input
                      type="url"
                      value={reschedLink}
                      onChange={(e) => setReschedLink(e.target.value)}
                      placeholder={demo.meeting_link || 'https://meet.google.com/xyz'}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-hidden focus:border-indigo-600"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveTab('details')}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarRange className="w-4 h-4" />}
                      <span>Confirm Reschedule</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 4: ASSIGN TEAM MEMBER */}
              {activeTab === 'assign' && (
                <form onSubmit={handleAssignSubmit} className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                    Select an internal sales engineer or demo coordinator to take ownership of this demo lead.
                  </div>

                  <div className="space-y-2">
                    {team.map((m) => (
                      <label
                        key={m.id}
                        className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                          assignTarget === m.id
                            ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="assigneeRadio"
                            checked={assignTarget === m.id}
                            onChange={() => setAssignTarget(m.id)}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <span className="font-bold text-slate-900 text-xs block">{m.name}</span>
                            <span className="text-[11px] text-slate-500 block">{m.email}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                            {m.role}
                          </span>
                          <span className="font-mono text-xs font-semibold text-indigo-600">
                            {m.assigned_count || 0} active
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveTab('details')}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-semibold text-xs shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                      <span>Assign Demo</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
