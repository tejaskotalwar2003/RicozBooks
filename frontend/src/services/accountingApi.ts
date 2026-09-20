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
  },

  // ==========================================
  // FINANCIAL REPORTS (PHASE 4)
  // ==========================================
  getTrialBalance: (params: {
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
    return apiRequest<TrialBalanceResponse>(`/reports/trial-balance?${query.toString()}`);
  },

  downloadTrialBalanceCsv: async (params: {
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
    const res = await fetch(`${API_BASE}/reports/trial-balance/export?${query.toString()}`, { headers });
    if (!res.ok) throw new Error('Failed to export Trial Balance CSV');
    const blob = await res.blob();
    const filename = `trial_balance_${params.start_date || 'start'}_${params.end_date || 'end'}.csv`;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  getProfitLoss: (params: {
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
    return apiRequest<ProfitLossResponse>(`/reports/profit-loss?${query.toString()}`);
  },

  downloadProfitLossCsv: async (params: {
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
    const res = await fetch(`${API_BASE}/reports/profit-loss/export?${query.toString()}`, { headers });
    if (!res.ok) throw new Error('Failed to export Profit & Loss CSV');
    const blob = await res.blob();
    const filename = `profit_loss_${params.start_date || 'start'}_${params.end_date || 'end'}.csv`;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  getBalanceSheet: (params: {
    entity_id: number;
    as_of_date?: string;
    include_unposted?: boolean;
  }) => {
    const query = new URLSearchParams();
    query.append('entity_id', params.entity_id.toString());
    if (params.as_of_date) query.append('as_of_date', params.as_of_date);
    if (params.include_unposted !== undefined) {
      query.append('include_unposted', params.include_unposted.toString());
    }
    return apiRequest<BalanceSheetResponse>(`/reports/balance-sheet?${query.toString()}`);
  },

  downloadBalanceSheetCsv: async (params: {
    entity_id: number;
    as_of_date?: string;
    include_unposted?: boolean;
  }) => {
    const token = localStorage.getItem('ricozbooks_token');
    const query = new URLSearchParams();
    query.append('entity_id', params.entity_id.toString());
    if (params.as_of_date) query.append('as_of_date', params.as_of_date);
    if (params.include_unposted !== undefined) {
      query.append('include_unposted', params.include_unposted.toString());
    }
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/reports/balance-sheet/export?${query.toString()}`, { headers });
    if (!res.ok) throw new Error('Failed to export Balance Sheet CSV');
    const blob = await res.blob();
    const filename = `balance_sheet_${params.as_of_date || 'today'}.csv`;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // ==========================================
  // PERIOD-END CLOSE MANAGER (PHASE 5)
  // ==========================================
  getClosePeriods: (params?: { entity_id?: number }) => {
    const query = new URLSearchParams();
    if (params?.entity_id) query.append('entity_id', params.entity_id.toString());
    return apiRequest<ClosePeriod[]>(`/close/periods?${query.toString()}`);
  },

  getClosePeriodDetail: (periodId: number) =>
    apiRequest<ClosePeriod>(`/close/periods/${periodId}`),

  createClosePeriod: (data: {
    entity_id: number;
    period_name: string;
    fiscal_year: string;
    month: number;
    target_date: string;
  }) =>
    apiRequest<ClosePeriod>('/close/periods', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCloseTask: (taskId: number, data: Partial<{
    task_name: string;
    description: string;
    status: CloseStatus;
    notes: string;
    assigned_to_id: number;
    due_date: string;
  }>) =>
    apiRequest<CloseTask>(`/close/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  lockClosePeriod: (periodId: number, data: { notes?: string }) =>
    apiRequest<ClosePeriod>(`/close/periods/${periodId}/lock`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  reopenClosePeriod: (periodId: number, data: { reason: string }) =>
    apiRequest<ClosePeriod>(`/close/periods/${periodId}/reopen`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ==========================================
  // ACCOUNTING SETTINGS (PHASE 6)
  // ==========================================
  getExchangeRates: (params?: { from_currency?: string; to_currency?: string }) => {
    const query = new URLSearchParams();
    if (params?.from_currency) query.append('from_currency', params.from_currency);
    if (params?.to_currency) query.append('to_currency', params.to_currency);
    return apiRequest<ExchangeRate[]>(`/settings/exchange-rates?${query.toString()}`);
  },

  upsertExchangeRate: (data: { from_currency: string; to_currency: string; rate: number; effective_date?: string }) =>
    apiRequest<ExchangeRate>('/settings/exchange-rates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateExchangeRate: (rateId: number, data: { rate: number; effective_date?: string }) =>
    apiRequest<ExchangeRate>(`/settings/exchange-rates/${rateId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getFiscalPeriodsSetting: (params?: { entity_id?: number; fiscal_year?: string }) => {
    const query = new URLSearchParams();
    if (params?.entity_id) query.append('entity_id', params.entity_id.toString());
    if (params?.fiscal_year) query.append('fiscal_year', params.fiscal_year);
    return apiRequest<FiscalPeriodSetting[]>(`/settings/fiscal-periods?${query.toString()}`);
  },

  generateFiscalYearPeriods: (data: { entity_id: number; fiscal_year: string; start_month?: number }) =>
    apiRequest<FiscalPeriodSetting[]>('/settings/fiscal-periods/generate-year', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getRolesMatrix: () =>
    apiRequest<RolePermissionMatrix>('/settings/roles-matrix'),

  updateRolePermissions: (data: { role_name: string; permission_codes: string[] }) =>
    apiRequest<RoleDetail>('/settings/roles-matrix', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getEntityTaxProfile: (entityId: number) =>
    apiRequest<EntityTaxProfile>(`/settings/entity-profile/${entityId}`),

  updateEntityTaxProfile: (entityId: number, data: Partial<EntityTaxProfile>) =>
    apiRequest<EntityTaxProfile>(`/settings/entity-profile/${entityId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
};

export interface TrialBalanceItem {
  account_id: number;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: string;
  opening_debit: number;
  opening_credit: number;
  period_debit: number;
  period_credit: number;
  closing_debit: number;
  closing_credit: number;
}

export interface TrialBalanceResponse {
  entity_id: number;
  entity_name: string;
  currency: string;
  start_date: string;
  end_date: string;
  include_unposted: boolean;
  items: TrialBalanceItem[];
  total_opening_debit: number;
  total_opening_credit: number;
  total_period_debit: number;
  total_period_credit: number;
  total_closing_debit: number;
  total_closing_credit: number;
  is_balanced: boolean;
  difference: number;
}

export interface ProfitLossAccountItem {
  account_id: number;
  account_code: string;
  account_name: string;
  amount: number;
  percentage_of_revenue: number;
}

export interface ProfitLossResponse {
  entity_id: number;
  entity_name: string;
  currency: string;
  start_date: string;
  end_date: string;
  include_unposted: boolean;
  revenue_accounts: ProfitLossAccountItem[];
  total_revenue: number;
  expense_accounts: ProfitLossAccountItem[];
  total_expense: number;
  gross_profit: number;
  net_profit_loss: number;
  net_margin_pct: number;
}

export interface BalanceSheetAccountItem {
  account_id: number;
  account_code: string;
  account_name: string;
  amount: number;
}

export interface BalanceSheetResponse {
  entity_id: number;
  entity_name: string;
  currency: string;
  as_of_date: string;
  include_unposted: boolean;
  asset_accounts: BalanceSheetAccountItem[];
  total_assets: number;
  liability_accounts: BalanceSheetAccountItem[];
  total_liabilities: number;
  equity_accounts: BalanceSheetAccountItem[];
  total_equity_before_earnings: number;
  current_period_earnings: number;
  total_equity: number;
  total_liabilities_and_equity: number;
  is_balanced: boolean;
  difference: number;
}

// ==========================================
// CLOSE MANAGER INTERFACES (PHASE 5)
// ==========================================
export type CloseStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'READY_FOR_REVIEW' | 'APPROVED' | 'BLOCKED';

export interface CloseTask {
  id: number;
  close_period_id: number;
  task_name: string;
  description?: string;
  due_date: string;
  status: CloseStatus;
  notes?: string;
  assigned_to_id?: number;
  assigned_to_name?: string;
  reviewer_id?: number;
  reviewer_name?: string;
  completed_at?: string;
  created_at: string;
}

export interface ClosePeriod {
  id: number;
  entity_id: number;
  period_name: string;
  fiscal_year: string;
  month: number;
  target_date: string;
  status: string;
  completion_percentage: number;
  closed_at?: string;
  closed_by_id?: number;
  created_at: string;
  updated_at: string;
  total_tasks: number;
  completed_tasks: number;
  tasks?: CloseTask[];
}

// ==========================================
// ACCOUNTING SETTINGS INTERFACES (PHASE 6)
// ==========================================
export interface ExchangeRate {
  id: number;
  from_currency: string;
  to_currency: string;
  rate: number;
  effective_date: string;
  created_at: string;
}

export interface FiscalPeriodSetting {
  id: number;
  entity_id?: number;
  fiscal_year: string;
  period_number: number;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  closed_at?: string;
  created_at: string;
}

export interface PermissionItem {
  id: number;
  code: string;
  name: string;
  module: string;
  description?: string;
}

export interface RoleDetail {
  id: number;
  name: string;
  description?: string;
  permissions: PermissionItem[];
}

export interface RolePermissionMatrix {
  roles: RoleDetail[];
  all_permissions: PermissionItem[];
}

export interface EntityTaxProfile {
  id: number;
  name: string;
  code: string;
  legal_name?: string;
  country: string;
  jurisdiction?: string;
  tax_identifier?: string;
  gstin?: string;
  pan?: string;
  base_currency: string;
  financial_year: string;
  address?: string;
  city?: string;
  state?: string;
  status: string;
  is_active: boolean;
}

export interface CompanyRegistrationData {
  company_name: string;
  legal_name?: string;
  business_email: string;
  phone_number?: string;
  country?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  base_currency: string;
  timezone: string;
  tax_identifier?: string;
  admin_name: string;
  admin_email: string;
  password: string;
}

export interface CompanyRegistrationResponse {
  access_token: string;
  token_type: string;
  user: any;
  company_id: number;
  company_name: string;
  company_code: string;
  entity_id: number;
  entity_name: string;
}

export interface TenantInvitation {
  id: number;
  email: string;
  role: string;
  status: string;
  token: string;
  invite_url: string;
  expires_at: string;
  created_at: string;
  invited_by_name?: string;
}

export interface TenantMember {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  job_title?: string;
  roles: string[];
  is_active: boolean;
  created_at: string;
}

export interface InvitationPublicInfo {
  token: string;
  email: string;
  role: string;
  company_name: string;
  company_currency: string;
  inviter_name?: string;
  is_valid: boolean;
  message?: string;
}

export interface InvitationAcceptData {
  token: string;
  first_name: string;
  last_name: string;
  password: string;
}

export const registerCompany = async (data: CompanyRegistrationData): Promise<CompanyRegistrationResponse> => {
  try {
    return await apiRequest<CompanyRegistrationResponse>('/tenants/register-company', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch (err: any) {
    return await apiRequest<CompanyRegistrationResponse>('/auth/register-company', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
};

export const getTenantCompany = async (): Promise<any> => {
  return apiRequest<any>('/tenants/company');
};

export const getTenantMembers = async (): Promise<TenantMember[]> => {
  return apiRequest<TenantMember[]>('/tenants/members');
};

export const getTenantInvitations = async (): Promise<TenantInvitation[]> => {
  return apiRequest<TenantInvitation[]>('/tenants/invitations');
};

export const createTenantInvitation = async (email: string, role: string): Promise<TenantInvitation> => {
  return apiRequest<TenantInvitation>('/tenants/invitations', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
};

export const revokeTenantInvitation = async (invitationId: number): Promise<{ message: string }> => {
  return apiRequest<{ message: string }>(`/tenants/invitations/${invitationId}`, {
    method: 'DELETE',
  });
};

export const validateInvitationToken = async (token: string): Promise<InvitationPublicInfo> => {
  return apiRequest<InvitationPublicInfo>(`/tenants/invitations/validate/${encodeURIComponent(token)}`);
};

export const acceptTenantInvitation = async (data: InvitationAcceptData): Promise<any> => {
  return apiRequest<any>('/tenants/invitations/accept', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export interface MonthlyTrajectoryItem {
  month: string;
  month_num: number;
  year: number;
  revenue: number;
  expense: number;
}

export interface CloseStatusSummary {
  has_period: boolean;
  period_id?: number;
  period_name: string;
  completion_percentage: number;
  completed_tasks: number;
  pending_tasks: number;
  blocked_tasks: number;
  status: string;
}

export interface JournalStatusCounts {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  posted: number;
  rejected: number;
}

export interface RecentJournalItem {
  id: number;
  entry_number: string;
  entry_date: string;
  description: string;
  entity_name: string;
  amount: number;
  status: string;
}

export interface DashboardMetricsResponse {
  entity_id: number;
  entity_name: string;
  currency: string;
  currency_symbol: string;
  total_revenue: number;
  total_expense: number;
  net_profit: number;
  net_margin_pct: number;
  total_assets: number;
  is_balanced: boolean;
  monthly_trajectory: MonthlyTrajectoryItem[];
  close_status: CloseStatusSummary;
  journal_counts: JournalStatusCounts;
  recent_journals: RecentJournalItem[];
}

export const getDashboardMetrics = async (entity_id?: number): Promise<DashboardMetricsResponse> => {
  const query = entity_id ? `?entity_id=${entity_id}` : '';
  return apiRequest<DashboardMetricsResponse>(`/dashboard/metrics${query}`);
};

// =========================================================================
// SALES & ACCOUNTS RECEIVABLE (AR)
// =========================================================================

export interface Customer {
  id: number;
  entity_id: number;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  pan?: string;
  billing_address?: string;
  shipping_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  payment_terms_days: number;
  opening_balance: number;
  current_balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerCreateData {
  entity_id: number;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  pan?: string;
  billing_address?: string;
  shipping_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  payment_terms_days?: number;
  opening_balance?: number;
  currency?: string;
}

export interface CustomerLedgerEntry {
  id: number;
  date: string;
  type: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  running_balance: number;
}

export interface CustomerStatement {
  customer_id: number;
  customer_name: string;
  company_name?: string;
  gstin?: string;
  currency: string;
  opening_balance: number;
  total_invoiced: number;
  total_paid: number;
  current_balance: number;
  statement_period: string;
  entries: CustomerLedgerEntry[];
}

export interface Product {
  id: number;
  entity_id: number;
  name: string;
  sku?: string;
  product_type: 'GOODS' | 'SERVICE';
  unit: string;
  selling_price: number;
  purchase_price: number;
  hsn_sac_code?: string;
  tax_rate: number;
  income_account_id?: number;
  expense_account_id?: number;
  current_stock: number;
  min_stock_alert: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductCreateData {
  entity_id: number;
  name: string;
  sku?: string;
  product_type?: string;
  unit?: string;
  selling_price?: number;
  purchase_price?: number;
  hsn_sac_code?: string;
  tax_rate?: number;
  income_account_id?: number;
  expense_account_id?: number;
  current_stock?: number;
  min_stock_alert?: number;
}

export interface InvoiceLine {
  id?: number;
  product_id?: number;
  description: string;
  hsn_sac?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_pct: number;
  taxable_amount: number;
  tax_rate: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  total_amount: number;
}

export interface Invoice {
  id: number;
  entity_id: number;
  customer_id: number;
  customer_name?: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  supply_state?: string;
  status: 'DRAFT' | 'SENT' | 'POSTED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  subtotal: number;
  discount_amount: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  currency: string;
  notes?: string;
  terms?: string;
  journal_entry_id?: number;
  created_at: string;
  lines?: InvoiceLine[];
}

export interface InvoiceCreateData {
  entity_id: number;
  customer_id: number;
  invoice_number?: string;
  invoice_date: string;
  due_date: string;
  supply_state?: string;
  notes?: string;
  terms?: string;
  lines: {
    product_id?: number;
    description: string;
    hsn_sac?: string;
    quantity: number;
    unit?: string;
    unit_price: number;
    discount_pct?: number;
    tax_rate?: number;
  }[];
}

export interface CustomerPayment {
  id: number;
  entity_id: number;
  customer_id: number;
  customer_name?: string;
  invoice_id?: number;
  invoice_number?: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_mode: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | 'CREDIT_CARD' | 'UPI' | 'OTHER';
  deposit_account_id: number;
  deposit_account_name?: string;
  reference_number?: string;
  notes?: string;
  journal_entry_id?: number;
  created_at: string;
}

export interface CustomerPaymentCreateData {
  entity_id: number;
  customer_id: number;
  invoice_id?: number;
  payment_number?: string;
  payment_date: string;
  amount: number;
  payment_mode?: string;
  deposit_account_id?: number;
  reference_number?: string;
  notes?: string;
}

export interface Estimate {
  id: number;
  entity_id: number;
  customer_id: number;
  customer_name?: string;
  estimate_number: string;
  estimate_date: string;
  expiry_date: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
  subtotal: number;
  discount_amount: number;
  taxable_amount: number;
  total_tax: number;
  total_amount: number;
  converted_invoice_id?: number;
  notes?: string;
  terms?: string;
  created_at: string;
}

export interface EstimateCreateData {
  entity_id: number;
  customer_id: number;
  estimate_number?: string;
  estimate_date: string;
  expiry_date?: string;
  notes?: string;
  terms?: string;
  lines: {
    product_id?: number;
    description: string;
    hsn_sac?: string;
    quantity: number;
    unit?: string;
    unit_price: number;
    discount_pct?: number;
    tax_rate?: number;
  }[];
}

// Customers API
export const getCustomers = async (entityId?: number, search?: string): Promise<Customer[]> => {
  const params = new URLSearchParams();
  if (entityId) params.append('entity_id', entityId.toString());
  if (search) params.append('search', search);
  const q = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<Customer[]>(`/customers${q}`);
};

export const createCustomer = async (data: CustomerCreateData): Promise<Customer> => {
  return apiRequest<Customer>('/customers', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const updateCustomer = async (id: number, data: Partial<CustomerCreateData>): Promise<Customer> => {
  return apiRequest<Customer>(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const getCustomerStatement = async (customerId: number): Promise<CustomerStatement> => {
  return apiRequest<CustomerStatement>(`/customers/${customerId}/statement`);
};

// Products API
export const getProducts = async (entityId?: number, search?: string): Promise<Product[]> => {
  const params = new URLSearchParams();
  if (entityId) params.append('entity_id', entityId.toString());
  if (search) params.append('search', search);
  const q = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<Product[]>(`/products${q}`);
};

export const createProduct = async (data: ProductCreateData): Promise<Product> => {
  return apiRequest<Product>('/products', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

// Invoices API
export const getInvoices = async (entityId?: number, customerId?: number, status?: string): Promise<Invoice[]> => {
  const params = new URLSearchParams();
  if (entityId) params.append('entity_id', entityId.toString());
  if (customerId) params.append('customer_id', customerId.toString());
  if (status) params.append('status', status);
  const q = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<Invoice[]>(`/invoices${q}`);
};

export const getInvoiceDetail = async (id: number): Promise<Invoice> => {
  return apiRequest<Invoice>(`/invoices/${id}`);
};

export const createInvoice = async (data: InvoiceCreateData): Promise<Invoice> => {
  return apiRequest<Invoice>('/invoices', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const postInvoiceToLedger = async (id: number): Promise<Invoice> => {
  return apiRequest<Invoice>(`/invoices/${id}/post`, {
    method: 'POST'
  });
};

// Customer Payments API
export const getCustomerPayments = async (entityId?: number, customerId?: number): Promise<CustomerPayment[]> => {
  const params = new URLSearchParams();
  if (entityId) params.append('entity_id', entityId.toString());
  if (customerId) params.append('customer_id', customerId.toString());
  const q = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<CustomerPayment[]>(`/payments${q}`);
};

export const recordCustomerPayment = async (data: CustomerPaymentCreateData): Promise<CustomerPayment> => {
  return apiRequest<CustomerPayment>('/payments', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

// Estimates API
export const getEstimates = async (entityId?: number): Promise<Estimate[]> => {
  const q = entityId ? `?entity_id=${entityId}` : '';
  return apiRequest<Estimate[]>(`/estimates${q}`);
};

export const createEstimate = async (data: EstimateCreateData): Promise<Estimate> => {
  return apiRequest<Estimate>('/estimates', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const convertEstimateToInvoice = async (estimateId: number): Promise<Invoice> => {
  return apiRequest<Invoice>(`/estimates/${estimateId}/convert`, {
    method: 'POST'
  });
};



