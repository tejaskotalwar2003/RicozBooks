import React, { useState } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Video, 
  Mail, 
  Database, 
  Save, 
  Check, 
  AlertCircle,
  Clock,
  Key
} from 'lucide-react';
import { useInternalAuth } from '../../context/InternalAuthContext';

export const InternalSettings: React.FC = () => {
  const { internalUser } = useInternalAuth();
  const [meetingPrefix, setMeetingPrefix] = useState('https://meet.google.com/ric-demo-');
  const [defaultDuration, setDefaultDuration] = useState('45 mins');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [customerReminders, setCustomerReminders] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200/70">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider">
            Configuration
          </span>
          <span className="text-xs text-slate-400 font-mono">System Preferences</span>
        </div>
        <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Portal Settings
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
          Configure default scheduling parameters, video meeting templates, and security rules.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Meeting & Scheduling Defaults */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Demo Meeting Defaults</h3>
              <p className="text-[11px] text-slate-500">Preset links and meeting parameters for quick scheduling</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Meeting Link Template
              </label>
              <input
                type="text"
                value={meetingPrefix}
                onChange={(e) => setMeetingPrefix(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Pre-fills meeting link field in scheduling modal.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Demo Duration
              </label>
              <select
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden bg-white"
              >
                <option value="30 mins">30 minutes</option>
                <option value="45 mins">45 minutes (Standard)</option>
                <option value="60 mins">60 minutes (Deep Dive)</option>
                <option value="90 mins">90 minutes (Multi-Entity Architecture)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications & Automation */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Email & Notification Rules</h3>
              <p className="text-[11px] text-slate-500">Automated triggers for client booking and scheduling updates</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Instant Inbound Alerts</span>
                <span className="text-[11px] text-slate-500 leading-relaxed block">
                  Notify coordination team via email whenever a new demo request is logged.
                </span>
              </div>
            </label>

            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={customerReminders}
                onChange={(e) => setCustomerReminders(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Customer Calendar Invitations</span>
                <span className="text-[11px] text-slate-500 leading-relaxed block">
                  Dispatch calendar invites with meeting link when demo status changes to SCHEDULED.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Security & Database Status */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Infrastructure & Authentication</h3>
              <p className="text-[11px] text-slate-500">Active database connection and security posture</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-slate-400 font-medium block">Active Database</span>
              <span className="font-semibold text-slate-800 block mt-1">MongoDB Atlas on Cloud</span>
              <span className="text-[11px] text-emerald-600 font-medium inline-flex items-center space-x-1 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Connected & Healthy</span>
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-slate-400 font-medium block">Current Operator Session</span>
              <span className="font-semibold text-slate-800 block mt-1">{internalUser?.name}</span>
              <span className="text-[11px] text-indigo-600 font-medium block mt-1">
                Role: {internalUser?.role} • JWT Protected
              </span>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end space-x-3">
          {isSaved && (
            <span className="text-xs text-emerald-600 font-bold inline-flex items-center space-x-1">
              <Check className="w-4 h-4" />
              <span>Settings Saved Successfully</span>
            </span>
          )}

          <button
            type="submit"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};
