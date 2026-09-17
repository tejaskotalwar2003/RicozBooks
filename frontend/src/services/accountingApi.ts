import { apiRequest, API_BASE } from './api';

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type NormalBalance = 'DEBIT' | 'CREDIT';

export interface Account {
  id: number;
  entity_id: number;
  code: string;
  name: string;
  account_type: AccountType;
  normal_balance: NormalBalance;
  parent_id?: number;
  description?: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountCreateData {
  entity_id: number;
  code: string;
  name: string;
  account_type: AccountType;
  normal_balance: NormalBalance;
  parent_id?: number;
  description?: string;
  currency?: string;
  is_active?: boolean;
}

export type JournalStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'UNDER_REVIEW' 
  | 'APPROVED' 
  | 'POSTED' 
  | 'REJECTED' 
  | 'REVERSED';

export interface JournalLine {
  id?: number;
  account_id: number;
  line_number?: number;
  description?: string;
  debit: number;
  credit: number;
  base_debit?: number;
  base_credit?: number;
  account_name?: string;
  account_code?: string;
}

export interface ApprovalTrail {
  id: number;
  reviewer_id: number;
  reviewer_name?: string;
  action: string;
  comments?: string;
  timestamp: string;
}

export interface JournalEntry {
  id: number;
  entry_number: string;
  entity_id: number;
  entity_name?: string;
  entry_date: string;
  reference?: string;
  description: string;
  currency: string;
  exchange_rate: number;
  status: JournalStatus;
  total_debit: number;
  total_credit: number;
  created_by_id: number;
  created_by_name?: string;
  posted_by_id?: number;
  posted_by_name?: string;
  posted_at?: string;
  reversal_of_id?: number;
  reversal_of_number?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
  lines?: JournalLine[];
  approvals?: ApprovalTrail[];
}

export interface JournalCreateData {
  entity_id: number;
  entry_date: string;
  reference?: string;
  description: string;
  currency?: string;
  exchange_rate?: number;
  save_as_draft?: boolean;
  lines: {
    line_number?: number;
    account_id: number;
    description?: string;
    debit: number;
    credit: number;
  }[];
}

// General Ledger interfaces
export interface LedgerLineItem {
  id: number;
  journal_entry_id: number;
  entry_number: string;
  entry_date: string;
  reference?: string;
  description?: string;
  journal_description?: string;
  debit: number;
  credit: number;
  running_balance: number;
  balance_type: 'DR' | 'CR';
  status: JournalStatus;
  currency: string;
}

export interface AccountLedgerResponse {
  account_id: number;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  normal_balance: NormalBalance;
  currency: string;
  start_date: string;
  end_date: string;
  opening_balance: number;
  opening_balance_type: 'DR' | 'CR';
  period_debit: number;
  period_credit: number;
  net_movement: number;
  closing_balance: number;
  closing_balance_type: 'DR' | 'CR';
  lines: LedgerLineItem[];
}

export interface LedgerSummaryItem {
  account_id: number;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  normal_balance: NormalBalance;
  currency: string;
  opening_balance: number;
  opening_balance_type: 'DR' | 'CR';
  period_debit: number;
  period_credit: number;
  closing_balance: number;
  closing_balance_type: 'DR' | 'CR';
}

export interface LedgerSummaryResponse {
  entity_id: number;
  start_date: string;
  end_date: string;
  currency: string;
  accounts: LedgerSummaryItem[];
  total_opening_debit: number;
  total_opening_credit: number;
  total_period_debit: number;
  total_period_credit: number;
  total_closing_debit: number;
  total_closing_credit: number;
}

// Audit Log interfaces
export interface AuditLogItem {
  id: number;
  timestamp: string;
  user_id?: number;
  user_email?: string;
  entity_id?: number;
  action: string;
  record_type: string;
  record_id?: string;
  ip_address?: string;
  details?: string;
}

export interface PaginatedAuditLogResponse {
  items: AuditLogItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface AuditFilterParams {
  entity_id?: number;
  action?: string;
  record_type?: string;
  user_email?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  skip?: number;
  limit?: number;
}


export const accountingApi = {
  getAccounts: (params?: { entity_id?: number; account_type?: AccountType; is_active?: boolean; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.entity_id) query.append('entity_id', params.entity_id.toString());
    if (params?.account_type) query.append('account_type', params.account_type);
    if (params?.is_active !== undefined) query.append('is_active', params.is_active.toString());
    if (params?.search) query.append('search', params.search);
    return apiRequest<Account[]>(`/accounts?${query.toString()}`);
  },

  createAccount: (data: AccountCreateData) =>
    apiRequest<Account>('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAccount: (id: number, data: Partial<AccountCreateData>) =>
    apiRequest<Account>(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Journal Entries
  getJournalEntries: (params?: { entity_id?: number; status?: JournalStatus; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.entity_id) query.append('entity_id', params.entity_id.toString());
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    return apiRequest<JournalEntry[]>(`/journal-entries?${query.toString()}`);
  },

  getJournalEntryDetail: (id: number) =>
    apiRequest<JournalEntry>(`/journal-entries/${id}`),

  createJournalEntry: (data: JournalCreateData) =>
    apiRequest<JournalEntry>('/journal-entries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateJournalEntry: (id: number, data: Partial<JournalCreateData>) =>
    apiRequest<JournalEntry>(`/journal-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  submitJournal: (id: number) =>
    apiRequest<JournalEntry>(`/journal-entries/${id}/submit`, { method: 'POST' }),

  approveJournal: (id: number, comments?: string) =>
    apiRequest<JournalEntry>(`/journal-entries/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comments }),
    }),

  rejectJournal: (id: number, reason: string) =>
    apiRequest<JournalEntry>(`/journal-entries/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  postJournal: (id: number) =>
    apiRequest<JournalEntry>(`/journal-entries/${id}/post`, { method: 'POST' }),

  reverseJournal: (id: number, reason?: string) =>
    apiRequest<JournalEntry>(`/journal-entries/${id}/reverse`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // General Ledger
  getLedgerSummary: (params: {
    entity_id: number;
    start_date?: string;
    end_date?: string;
    include_unposted?: boolean;
  }) => {
    const query = new URLSearchParams();
    query.append('entity_id', params.entity_id.toString());
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    if (params.include_unposted !== undefined) {
      query.append('include_unposted', params.include_unposted.toString());
    }
    return apiRequest<LedgerSummaryResponse>(`/ledger/summary?${query.toString()}`);
  },

  getAccountLedger: (params: {
    account_id: number;
    entity_id: number;
    start_date?: string;
    end_date?: string;
    include_unposted?: boolean;
  }) => {
    const query = new URLSearchParams();
    query.append('entity_id', params.entity_id.toString());
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    if (params.include_unposted !== undefined) {
      query.append('include_unposted', params.include_unposted.toString());
    }
    return apiRequest<AccountLedgerResponse>(`/ledger/account/${params.account_id}?${query.toString()}`);
  },

  downloadLedgerCsv: async (params: {
    account_id: number;
    entity_id: number;
    start_date?: string;
    end_date?: string;
    include_unposted?: boolean;
  }) => {
    const token = localStorage.getItem('ricozbooks_token');
    const query = new URLSearchParams();
    query.append('entity_id', params.entity_id.toString());
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    if (params.include_unposted !== undefined) {
      query.append('include_unposted', params.include_unposted.toString());
    }

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/ledger/account/${params.account_id}/export?${query.toString()}`, {
      headers
    });
    if (!res.ok) throw new Error('Failed to export ledger CSV');
    const blob = await res.blob();
    const filename = `ledger_${params.account_id}_${params.start_date || 'start'}_${params.end_date || 'end'}.csv`;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Audit Logs
  getAuditLogs: (params?: AuditFilterParams) => {
    const query = new URLSearchParams();
    if (params?.entity_id) query.append('entity_id', params.entity_id.toString());
    if (params?.action) query.append('action', params.action);
    if (params?.record_type) query.append('record_type', params.record_type);
    if (params?.user_email) query.append('user_email', params.user_email);
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);
    if (params?.search) query.append('search', params.search);
    if (params?.skip !== undefined) query.append('skip', params.skip.toString());
    if (params?.limit !== undefined) query.append('limit', params.limit.toString());
    return apiRequest<PaginatedAuditLogResponse>(`/audit-logs?${query.toString()}`);
  },

  downloadAuditLogsCsv: async (params?: AuditFilterParams) => {
    const token = localStorage.getItem('ricozbooks_token');
    const query = new URLSearchParams();
    if (params?.entity_id) query.append('entity_id', params.entity_id.toString());
    if (params?.action) query.append('action', params.action);
    if (params?.record_type) query.append('record_type', params.record_type);
    if (params?.user_email) query.append('user_email', params.user_email);
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);
    if (params?.search) query.append('search', params.search);

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/audit-logs/export?${query.toString()}`, {
      headers
    });
    if (!res.ok) throw new Error('Failed to export audit logs CSV');
    const blob = await res.blob();
    const filename = `audit_trail_${new Date().toISOString().slice(0, 10)}.csv`;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};

