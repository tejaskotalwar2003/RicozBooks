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


export const getAccounts = (entityId?: number, accountType?: AccountType) => 
  accountingApi.getAccounts({ entity_id: entityId, account_type: accountType });

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

// =========================================================================
// PURCHASES & ACCOUNTS PAYABLE (AP)
// =========================================================================

export interface Vendor {
  id: number;
  entity_id: number;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  pan?: string;
  billing_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  payment_terms_days: number;
  opening_balance: number;
  current_balance: number;
  currency: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorCreateData {
  entity_id: number;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  pan?: string;
  billing_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  payment_terms_days?: number;
  opening_balance?: number;
  currency?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
}

export interface VendorLedgerEntry {
  id: number;
  date: string;
  type: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  running_balance: number;
}

export interface VendorStatement {
  vendor_id: number;
  vendor_name: string;
  company_name?: string;
  gstin?: string;
  currency: string;
  opening_balance: number;
  total_billed: number;
  total_paid: number;
  current_balance: number;
  statement_period: string;
  entries: VendorLedgerEntry[];
}

export interface BillLine {
  id?: number;
  product_id?: number;
  expense_account_id?: number;
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

export interface Bill {
  id: number;
  entity_id: number;
  vendor_id: number;
  vendor_name?: string;
  bill_number: string;
  vendor_invoice_ref?: string;
  bill_date: string;
  due_date: string;
  supply_state?: string;
  status: 'DRAFT' | 'RECEIVED' | 'POSTED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
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
  journal_entry_id?: number;
  notes?: string;
  terms?: string;
  created_at: string;
  lines?: BillLine[];
}

export interface BillCreateData {
  entity_id: number;
  vendor_id: number;
  bill_number?: string;
  vendor_invoice_ref?: string;
  bill_date: string;
  due_date: string;
  supply_state?: string;
  notes?: string;
  terms?: string;
  lines: {
    product_id?: number;
    expense_account_id?: number;
    description: string;
    hsn_sac?: string;
    quantity: number;
    unit?: string;
    unit_price: number;
    discount_pct?: number;
    tax_rate?: number;
  }[];
}

export interface VendorPayment {
  id: number;
  entity_id: number;
  vendor_id: number;
  vendor_name?: string;
  bill_id?: number;
  bill_number?: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_mode: 'BANK_TRANSFER' | 'CHEQUE' | 'UPI' | 'CASH' | 'CREDIT_CARD' | 'OTHER';
  disbursement_account_id: number;
  disbursement_account_name?: string;
  reference_number?: string;
  notes?: string;
  journal_entry_id?: number;
  created_at: string;
}

export interface VendorPaymentCreateData {
  entity_id: number;
  vendor_id: number;
  bill_id?: number;
  payment_number?: string;
  payment_date: string;
  amount: number;
  payment_mode?: string;
  disbursement_account_id?: number;
  reference_number?: string;
  notes?: string;
}

// Vendors API
export const getVendors = async (entityId?: number, search?: string): Promise<Vendor[]> => {
  const params = new URLSearchParams();
  if (entityId) params.append('entity_id', entityId.toString());
  if (search) params.append('search', search);
  const q = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<Vendor[]>(`/vendors${q}`);
};

export const createVendor = async (data: VendorCreateData): Promise<Vendor> => {
  return apiRequest<Vendor>('/vendors', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const getVendorStatement = async (vendorId: number): Promise<VendorStatement> => {
  return apiRequest<VendorStatement>(`/vendors/${vendorId}/statement`);
};

// Bills API
export const getBills = async (entityId?: number, vendorId?: number, status?: string): Promise<Bill[]> => {
  const params = new URLSearchParams();
  if (entityId) params.append('entity_id', entityId.toString());
  if (vendorId) params.append('vendor_id', vendorId.toString());
  if (status) params.append('status', status);
  const q = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<Bill[]>(`/bills${q}`);
};

export const getBillDetail = async (id: number): Promise<Bill> => {
  return apiRequest<Bill>(`/bills/${id}`);
};

export const createBill = async (data: BillCreateData): Promise<Bill> => {
  return apiRequest<Bill>('/bills', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const postBillToLedger = async (id: number): Promise<Bill> => {
  return apiRequest<Bill>(`/bills/${id}/post`, {
    method: 'POST'
  });
};

// Vendor Payments API
export const getVendorPayments = async (entityId?: number, vendorId?: number): Promise<VendorPayment[]> => {
  const params = new URLSearchParams();
  if (entityId) params.append('entity_id', entityId.toString());
  if (vendorId) params.append('vendor_id', vendorId.toString());
  const q = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<VendorPayment[]>(`/vendor-payments${q}`);
};

export const recordVendorPayment = async (data: VendorPaymentCreateData): Promise<VendorPayment> => {
  return apiRequest<VendorPayment>('/vendor-payments', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

// ==========================================
// EXPENSES MODULE (PHASE 3)
// ==========================================
export interface ExpenseCategory {
  id: number;
  entity_id: number;
  code: string;
  name: string;
  description?: string;
  default_account_id?: number;
  tax_rate_percent: number;
  is_active: boolean;
}

export interface Expense {
  id: number;
  entity_id: number;
  expense_number: string;
  title: string;
  category_id?: number;
  category_name?: string;
  expense_date: string;
  expense_account_id: number;
  expense_account_name?: string;
  payment_account_id?: number;
  payment_account_name?: string;
  bank_account_id?: number;
  payment_method: string;
  subtotal: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  currency: string;
  merchant_name?: string;
  reference_number?: string;
  description?: string;
  receipt_url?: string;
  is_reimbursable: boolean;
  is_billable: boolean;
  customer_id?: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'POSTED' | 'PAID';
  submitter_name?: string;
  approved_by_id?: number;
  approved_at?: string;
  rejection_reason?: string;
  journal_entry_id?: number;
  reimbursement_journal_id?: number;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCreateData {
  entity_id: number;
  title: string;
  category_id?: number;
  expense_date: string;
  expense_account_id: number;
  payment_account_id?: number;
  bank_account_id?: number;
  payment_method: string;
  subtotal: number;
  tax_amount?: number;
  currency?: string;
  merchant_name?: string;
  reference_number?: string;
  description?: string;
  is_reimbursable?: boolean;
  is_billable?: boolean;
  customer_id?: number;
}

export interface ExpenseSummary {
  total_expenses_month: number;
  pending_approvals_count: number;
  reimbursable_claims_total: number;
  posted_expenses_total: number;
  category_breakdown: { category: string; amount: number }[];
}

export const getExpenseCategories = async (entityId: number): Promise<ExpenseCategory[]> => {
  return apiRequest<ExpenseCategory[]>(`/expenses/categories?entity_id=${entityId}`);
};

export const createExpenseCategory = async (data: Partial<ExpenseCategory> & { entity_id: number; code: string; name: string }): Promise<ExpenseCategory> => {
  return apiRequest<ExpenseCategory>('/expenses/categories', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const getExpenses = async (
  entityId: number, 
  filters?: { status?: string; category_id?: number; is_reimbursable?: boolean; search?: string }
): Promise<Expense[]> => {
  const params = new URLSearchParams();
  params.append('entity_id', entityId.toString());
  if (filters?.status) params.append('status_filter', filters.status);
  if (filters?.category_id) params.append('category_id', filters.category_id.toString());
  if (filters?.is_reimbursable !== undefined) params.append('is_reimbursable', filters.is_reimbursable.toString());
  if (filters?.search) params.append('search', filters.search);
  return apiRequest<Expense[]>(`/expenses/expenses?${params.toString()}`);
};

export const createExpense = async (data: ExpenseCreateData, autoPost: boolean = false): Promise<Expense> => {
  return apiRequest<Expense>(`/expenses/expenses?auto_post=${autoPost}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const actionExpense = async (id: number, action: 'APPROVE' | 'REJECT', rejectionReason?: string): Promise<Expense> => {
  return apiRequest<Expense>(`/expenses/expenses/${id}/action`, {
    method: 'POST',
    body: JSON.stringify({ action, rejection_reason: rejectionReason })
  });
};

export const postExpense = async (id: number): Promise<Expense> => {
  return apiRequest<Expense>(`/expenses/expenses/${id}/post`, {
    method: 'POST'
  });
};

export const reimburseExpense = async (id: number, data: { payment_account_id: number; bank_account_id?: number; reference_number?: string }): Promise<Expense> => {
  return apiRequest<Expense>(`/expenses/expenses/${id}/reimburse`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const getExpenseSummary = async (entityId: number): Promise<ExpenseSummary> => {
  return apiRequest<ExpenseSummary>(`/expenses/expenses-summary?entity_id=${entityId}`);
};


// ==========================================
// BANKING MODULE (PHASE 3)
// ==========================================
export interface BankAccount {
  id: number;
  entity_id: number;
  bank_name: string;
  account_name: string;
  account_number: string;
  account_type: string;
  ifsc_code?: string;
  swift_bic?: string;
  branch_name?: string;
  currency: string;
  gl_account_id: number;
  gl_account_code?: string;
  gl_account_name?: string;
  opening_balance: number | string;
  current_balance: number | string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BankAccountCreateData {
  entity_id: number;
  bank_name: string;
  account_name: string;
  account_number: string;
  account_type: string;
  ifsc_code?: string;
  branch_name?: string;
  currency?: string;
  gl_account_id: number;
  opening_balance: number;
}

export interface BankTransaction {
  id: number;
  bank_account_id: number;
  transaction_type: string;
  transaction_date: string;
  amount: number | string;
  is_credit: boolean;
  running_balance?: number | string;
  reference_number?: string;
  counterparty?: string;
  description?: string;
  status: 'UNRECONCILED' | 'RECONCILED' | 'EXCLUDED';
  reconciled_at?: string;
  reconciliation_id?: number;
  journal_entry_id?: number;
  created_at: string;
}

export interface BankTransferCreateData {
  entity_id: number;
  from_bank_account_id: number;
  to_bank_account_id: number;
  transfer_date: string;
  amount: number;
  fee_amount?: number;
  reference_number?: string;
  notes?: string;
}

export interface BankTransfer {
  id: number;
  entity_id: number;
  transfer_number: string;
  from_bank_account_id: number;
  to_bank_account_id: number;
  transfer_date: string;
  amount: number | string;
  fee_amount: number | string;
  currency: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
}

export interface BankStatementLine {
  id: number;
  reconciliation_id: number;
  transaction_date: string;
  description: string;
  reference?: string;
  amount: number | string;
  is_credit: boolean;
  balance_after?: number | string;
  is_matched: boolean;
  matched_transaction_id?: number;
  created_at: string;
}

export interface BankReconciliation {
  id: number;
  bank_account_id: number;
  statement_date: string;
  statement_balance: number | string;
  book_balance: number | string;
  reconciled_balance: number | string;
  difference: number | string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
  notes?: string;
  reconciled_by_id?: number;
  completed_at?: string;
  created_at: string;
  statement_lines?: BankStatementLine[];
}

export interface BankingSummary {
  total_liquid_cash: number;
  active_bank_accounts_count: number;
  unreconciled_transactions_count: number;
  accounts_summary: {
    id: number;
    bank_name: string;
    account_name: string;
    account_number: string;
    balance: number;
    currency: string;
  }[];
}

export const getBankAccounts = async (entityId: number, isActive?: boolean): Promise<BankAccount[]> => {
  const params = new URLSearchParams();
  params.append('entity_id', entityId.toString());
  if (isActive !== undefined) params.append('is_active', isActive.toString());
  return apiRequest<BankAccount[]>(`/banking/accounts?${params.toString()}`);
};

export const createBankAccount = async (data: BankAccountCreateData): Promise<BankAccount> => {
  return apiRequest<BankAccount>('/banking/accounts', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const getBankTransactions = async (bankAccountId: number, status?: string): Promise<BankTransaction[]> => {
  const params = new URLSearchParams();
  params.append('bank_account_id', bankAccountId.toString());
  if (status) params.append('status_filter', status);
  return apiRequest<BankTransaction[]>(`/banking/transactions?${params.toString()}`);
};

export const createBankTransfer = async (data: BankTransferCreateData): Promise<BankTransfer> => {
  return apiRequest<BankTransfer>('/banking/transfers', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const getBankTransfers = async (entityId: number): Promise<BankTransfer[]> => {
  return apiRequest<BankTransfer[]>(`/banking/transfers?entity_id=${entityId}`);
};

export const createBankReconciliation = async (data: { bank_account_id: number; statement_date: string; statement_balance: number; notes?: string }): Promise<BankReconciliation> => {
  return apiRequest<BankReconciliation>('/banking/reconciliations', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const getBankReconciliationDetail = async (id: number): Promise<BankReconciliation> => {
  return apiRequest<BankReconciliation>(`/banking/reconciliations/${id}`);
};

export const uploadStatementCsv = async (id: number, file: File): Promise<{ message: string; lines_imported: number; difference: number }> => {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);

  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1';
  const res = await fetch(`${API_BASE}/banking/reconciliations/${id}/upload-csv`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: formData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Failed to upload CSV statement');
  }
  return res.json();
};

export const matchBankTx = async (id: number, statementLineId: number, transactionId: number): Promise<{ message: string; difference: number }> => {
  return apiRequest<{ message: string; difference: number }>(`/banking/reconciliations/${id}/match`, {
    method: 'POST',
    body: JSON.stringify({ statement_line_id: statementLineId, transaction_id: transactionId })
  });
};

export const completeBankReconciliation = async (id: number): Promise<BankReconciliation> => {
  return apiRequest<BankReconciliation>(`/banking/reconciliations/${id}/complete`, {
    method: 'POST'
  });
};

export const getBankingSummary = async (entityId: number): Promise<BankingSummary> => {
  return apiRequest<BankingSummary>(`/banking/banking-summary?entity_id=${entityId}`);
};

// ==========================================
// INVENTORY & STOCK MODULE (PHASE 4)
// ==========================================
export interface ProductInventoryDetail {
  id: number;
  entity_id: number;
  name: string;
  sku?: string;
  product_type: string;
  unit: string;
  selling_price: number | string;
  purchase_price: number | string;
  hsn_sac_code?: string;
  current_stock: number | string;
  min_stock_alert: number | string;
  total_valuation: number | string;
  stock_status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  is_active: boolean;
}

export interface InventoryMovement {
  id: number;
  entity_id: number;
  product_id: number;
  product_name?: string;
  movement_type: string;
  movement_date: string;
  quantity: number | string;
  unit_cost: number | string;
  total_cost: number | string;
  reference_type?: string;
  reference_id?: string;
  batch_number?: string;
  warehouse_location?: string;
  notes?: string;
  journal_entry_id?: number;
  created_at: string;
}

export interface StockAdjustmentCreateData {
  entity_id: number;
  product_id: number;
  adjustment_type: 'INCREASE' | 'DECREASE';
  quantity: number;
  unit_cost?: number;
  reason: string;
  warehouse_location?: string;
}

export interface StockAdjustment {
  id: number;
  entity_id: number;
  adjustment_number: string;
  adjustment_date: string;
  product_id: number;
  product_name?: string;
  adjustment_type: 'INCREASE' | 'DECREASE';
  quantity: number | string;
  unit_cost: number | string;
  total_value: number | string;
  reason: string;
  warehouse_location?: string;
  journal_entry_id?: number;
  created_at: string;
}

export interface InventoryValuationSummary {
  total_products_count: number;
  in_stock_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_asset_valuation: number | string;
  products: ProductInventoryDetail[];
}

export const getInventoryValuation = async (entityId: number): Promise<InventoryValuationSummary> => {
  return apiRequest<InventoryValuationSummary>(`/inventory/valuation?entity_id=${entityId}`);
};

export const getInventoryMovements = async (entityId: number, productId?: number): Promise<InventoryMovement[]> => {
  const params = new URLSearchParams();
  params.append('entity_id', entityId.toString());
  if (productId) params.append('product_id', productId.toString());
  return apiRequest<InventoryMovement[]>(`/inventory/movements?${params.toString()}`);
};

export const createStockAdjustment = async (data: StockAdjustmentCreateData): Promise<StockAdjustment> => {
  return apiRequest<StockAdjustment>('/inventory/adjustments', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const getStockAdjustments = async (entityId: number): Promise<StockAdjustment[]> => {
  return apiRequest<StockAdjustment[]>(`/inventory/adjustments?entity_id=${entityId}`);
};

// ==========================================
// GST & STATUTORY TAX RETURNS (PHASE 4)
// ==========================================
export interface GSTR1B2BInvoice {
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  customer_gstin?: string;
  place_of_supply: string;
  reverse_charge: string;
  invoice_type: string;
  total_invoice_value: number | string;
  taxable_value: number | string;
  tax_rate: number | string;
  igst_amount: number | string;
  cgst_amount: number | string;
  sgst_amount: number | string;
  cess_amount: number | string;
}

export interface GSTR1HSNSummary {
  hsn_sac_code: string;
  description?: string;
  uqc: string;
  total_quantity: number | string;
  total_value: number | string;
  taxable_value: number | string;
  tax_rate: number | string;
  igst_amount: number | string;
  cgst_amount: number | string;
  sgst_amount: number | string;
  cess_amount: number | string;
}

export interface GSTR1Summary {
  entity_id: number;
  return_period: string;
  gstin?: string;
  legal_name: string;
  total_invoices_count: number;
  total_taxable_value: number | string;
  total_igst: number | string;
  total_cgst: number | string;
  total_sgst: number | string;
  total_tax_liability: number | string;
  b2b_invoices: GSTR1B2BInvoice[];
  hsn_summary: GSTR1HSNSummary[];
}

export interface GSTR3BSummary {
  entity_id: number;
  return_period: string;
  gstin?: string;
  legal_name: string;
  outward_supplies: {
    taxable_value: number | string;
    igst: number | string;
    cgst: number | string;
    sgst: number | string;
    cess: number | string;
  };
  eligible_itc: {
    itc_igst: number | string;
    itc_cgst: number | string;
    itc_sgst: number | string;
    total_itc_available: number | string;
  };
  tax_settlement: {
    output_igst: number | string;
    output_cgst: number | string;
    output_sgst: number | string;
    total_output_liability: number | string;
    itc_offset_igst: number | string;
    itc_offset_cgst: number | string;
    itc_offset_sgst: number | string;
    total_itc_utilized: number | string;
    cash_payable_igst: number | string;
    cash_payable_cgst: number | string;
    cash_payable_sgst: number | string;
    total_cash_payable: number | string;
  };
  status: 'DRAFT' | 'READY_FOR_FILING' | 'FILED';
  arn_number?: string;
  filing_date?: string;
}

export interface GSTDashboardMetrics {
  current_period: string;
  total_output_tax_due: number | string;
  total_input_tax_credit_available: number | string;
  net_tax_payable: number | string;
  gstr1_status: string;
  gstr3b_status: string;
  last_filed_period?: string;
}

export const getGstMetrics = async (entityId: number, period?: string): Promise<GSTDashboardMetrics> => {
  const params = new URLSearchParams();
  params.append('entity_id', entityId.toString());
  if (period) params.append('period', period);
  return apiRequest<GSTDashboardMetrics>(`/gst/metrics?${params.toString()}`);
};

export const getGstr1 = async (entityId: number, period: string): Promise<GSTR1Summary> => {
  return apiRequest<GSTR1Summary>(`/gst/gstr1?entity_id=${entityId}&period=${period}`);
};

export const getGstr3b = async (entityId: number, period: string): Promise<GSTR3BSummary> => {
  return apiRequest<GSTR3BSummary>(`/gst/gstr3b?entity_id=${entityId}&period=${period}`);
};

export const settleGstReturn = async (data: { entity_id: number; return_period: string; payment_bank_account_id?: number; reference_number?: string }): Promise<{
  message: string;
  return_period: string;
  total_output_liability: number;
  itc_utilized: number;
  cash_paid: number;
  settlement_journal_id: number;
  arn_number: string;
}> => {
  return apiRequest('/gst/settle', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};






