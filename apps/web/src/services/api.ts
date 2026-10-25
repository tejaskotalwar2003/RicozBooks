const getApiBase = (): string => {
  let raw = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : '').trim();

  // If running in browser on Render cloud domain, ensure pointing to appropriate backend
  if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
    if (window.location.hostname.includes('staging')) {
      if (!raw || !raw.includes('.')) {
        return 'https://ricozbooks-api-staging.onrender.com/api/v1';
      }
    } else if (!raw || raw === 'ricozbooks-api' || !raw.includes('.')) {
      return 'https://ricozbooks-api.onrender.com/api/v1';
    }
  }

  // If not configured, default to relative '/api/v1' for local dev proxy
  if (!raw) return '/api/v1';

  // Strip trailing /api/v1 or /api/v1/ if user or env set it
  raw = raw.replace(/\/api\/v1\/?$/, '');

  // If raw is an internal service name without domain, append onrender.com
  if (!raw.includes('.') && !raw.includes('localhost')) {
    raw = `${raw}.onrender.com`;
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw.replace(/\/$/, '') + '/api/v1';
  }
  return `https://${raw.replace(/\/$/, '')}/api/v1`;
};

export const API_BASE = getApiBase();

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export function extractItems<T>(res: PaginatedResponse<T> | T[] | null | undefined): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray((res as any).items)) return (res as any).items;
  return [];
}

export interface UserAuthSummary {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  job_title?: string;
  roles: string[];
  permissions: string[];
  default_company_id?: number;
  default_entity_id?: number;
  active_entity_id?: number;
  profile_photo_url?: string | null;
  is_superuser?: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: UserAuthSummary;
}

export interface Entity {
  id: number;
  company_id: number;
  name: string;
  code: string;
  legal_name?: string;
  country: string;
  jurisdiction?: string;
  tax_identifier?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  financial_year?: string;
  base_currency: string;
  is_active: boolean;
  upi_id?: string;
  razorpay_key_id?: string;
  payment_gateway_active?: boolean;
}

export interface Company {
  id: number;
  name: string;
  code: string;
  legal_name?: string;
  tax_identifier?: string;
  base_currency: string;
  entities: Entity[];
}

export interface AuditLogItem {
  id: number;
  timestamp: string;
  user_id?: number | null;
  user_email?: string | null;
  entity_id?: number | null;
  action: string;
  record_type: string;
  record_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  details?: string | null;
}

export interface UserSessionItem {
  id: number;
  device: string;
  browser: string;
  os: string;
  ip_address?: string;
  location?: string;
  last_active_at: string;
  created_at: string;
  is_current: boolean;
}

export interface LoginActivityItem {
  id: number;
  timestamp: string;
  device_browser: string;
  location?: string;
  status: 'SUCCESS' | 'FAILED';
  ip_address?: string;
}


export async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('ricozbooks_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    // Distinguish offline vs server reachability errors
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('You appear to be offline. Please verify your internet connection and try again.');
    }
    throw new Error(
      `Unable to connect to the accounting service. Please verify your connection or try again shortly. (${netErr.message || 'Network request failed'})`
    );
  }

  if (response.status === 401) {
    // Session expired or invalid
    localStorage.removeItem('ricozbooks_token');
    if (
      !window.location.pathname.includes('/login') &&
      !window.location.pathname.includes('/invite') &&
      !window.location.pathname.includes('/register') &&
      !window.location.pathname.includes('/pay') &&
      !window.location.pathname.includes('/portal')
    ) {
      window.location.href = '/login';
    }
    throw new Error('Your session has expired or is unauthorized. Please sign in again.');
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorBody.detail || `Server error (${response.status})`);
  }

  return response.json();
}

export const api = {
  login: (data: { email: string; password: string; entity_id?: number }) => 
    apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  getMe: () => apiRequest<UserAuthSummary>('/auth/me'),

  getEntities: () => apiRequest<Entity[]>('/entities'),

  updateEntity: (entityId: number, data: Partial<Entity>) =>
    apiRequest<Entity>(`/entities/${entityId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  getCompanies: () => apiRequest<Company[]>('/companies'),

  getAuditLogs: (entityId?: number) => {
    const query = entityId ? `?entity_id=${entityId}` : '';
    return apiRequest<AuditLogItem[]>(`/audit-logs${query}`);
  },
  
  getHealth: () => apiRequest<{ status: string; database: string }>('/health'),

  updateProfile: (data: { first_name?: string; last_name?: string; job_title?: string; profile_photo_url?: string }) =>
    apiRequest<UserAuthSummary>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  changePassword: (data: { current_password: string; new_password: string }) =>
    apiRequest<{ status: string; message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSessions: () => 
    apiRequest<UserSessionItem[]>('/auth/sessions'),

  revokeSession: (sessionId: number) =>
    apiRequest<{ status: string; message: string }>(`/auth/sessions/${sessionId}`, {
      method: 'DELETE',
    }),

  revokeOtherSessions: () =>
    apiRequest<{ status: string; message: string; count: number }>('/auth/sessions/sign-out-others', {
      method: 'POST',
    }),

  getLoginActivity: (limit = 15) =>
    apiRequest<LoginActivityItem[]>(`/auth/login-activity?limit=${limit}`),

  developerLogin: (credentials: { email: string; password: string }) =>
    apiRequest<LoginResponse>('/auth/developer/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  verifyDeveloperAccess: () =>
    apiRequest<{
      status: string;
      verified: boolean;
      user: {
        id: number;
        email: string;
        full_name: string;
        is_superuser: boolean;
        roles: string[];
        job_title?: string;
      };
      console: string;
      version: string;
    }>('/developer/verify'),

  getDeveloperPlatformStatus: () =>
    apiRequest<{
      platform: string;
      environment: string;
      database: string;
      security: {
        rbac_mode: string;
        developer_console_access: string;
        portal_separation: string;
      };
    }>('/developer/status'),

  getDashboardStats: () =>
    apiRequest<DashboardStatsData>('/developer/dashboard/stats'),

  getDepartments: () =>
    apiRequest<DepartmentItem[]>('/developer/departments'),

  getDepartmentDetails: (id: number) =>
    apiRequest<DepartmentItem>(`/developer/departments/${id}`),

  createDepartment: (data: { code: string; name: string; description?: string; head_user_id?: number }) =>
    apiRequest<DepartmentItem>('/developer/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateDepartment: (id: number, data: { name?: string; description?: string; is_active?: boolean }) =>
    apiRequest<DepartmentItem>(`/developer/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  assignDepartmentHead: (departmentId: number, userId: number | null) =>
    apiRequest<DepartmentItem>(`/developer/departments/${departmentId}/head`, {
      method: 'PUT',
      body: JSON.stringify({ user_id: userId }),
    }),

  toggleDepartmentStatus: (departmentId: number) =>
    apiRequest<DepartmentItem>(`/developer/departments/${departmentId}/toggle-status`, {
      method: 'POST',
    }),

  getDepartmentMembers: (departmentId: number) =>
    apiRequest<DepartmentMemberSummary[]>(`/developer/departments/${departmentId}/members`),

  getCandidateUsers: () =>
    apiRequest<CandidateUserItem[]>('/developer/users/candidates'),

  // Phase 3: User Management & Departmental Invitations
  getUsers: (params?: {
    search?: string;
    department_id?: number;
    role?: string;
    status?: string;
    is_head?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.department_id !== undefined && params?.department_id !== null)
      query.append('department_id', params.department_id.toString());
    if (params?.role) query.append('role', params.role);
    if (params?.status) query.append('status', params.status);
    if (params?.is_head !== undefined && params?.is_head !== null)
      query.append('is_head', params.is_head.toString());
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const qs = query.toString();
    return apiRequest<UserListResponseData>(`/developer/users${qs ? `?${qs}` : ''}`);
  },

  getUserDetail: (userId: number) =>
    apiRequest<UserDetailItem>(`/developer/users/${userId}`),

  updateUserDepartment: (userId: number, departmentId: number | null) =>
    apiRequest<UserDetailItem>(`/developer/users/${userId}/department`, {
      method: 'PUT',
      body: JSON.stringify({ department_id: departmentId }),
    }),

  updateUserRole: (userId: number, role: string) =>
    apiRequest<UserDetailItem>(`/developer/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  suspendUser: (userId: number) =>
    apiRequest<UserDetailItem>(`/developer/users/${userId}/suspend`, {
      method: 'POST',
    }),

  reactivateUser: (userId: number) =>
    apiRequest<UserDetailItem>(`/developer/users/${userId}/reactivate`, {
      method: 'POST',
    }),

  getInvitations: (params?: { department_id?: number; status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.department_id !== undefined && params?.department_id !== null)
      query.append('department_id', params.department_id.toString());
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString();
    return apiRequest<InvitationListResponseData>(`/developer/invitations${qs ? `?${qs}` : ''}`);
  },

  createDepartmentInvitation: (data: {
    email: string;
    department_id: number;
    role: string;
    is_department_head?: boolean;
  }) =>
    apiRequest<InvitationDetailItem>('/developer/invitations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  resendInvitation: (invitationId: number) =>
    apiRequest<InvitationDetailItem>(`/developer/invitations/${invitationId}/resend`, {
      method: 'POST',
    }),

  revokeInvitation: (invitationId: number) =>
    apiRequest<InvitationDetailItem>(`/developer/invitations/${invitationId}/revoke`, {
      method: 'POST',
    }),

  // Phase 4: Role-Based Access Control, Permissions & Central Audit Trail
  getRoles: () =>
    apiRequest<RoleDetailItem[]>('/developer/roles'),

  getPermissions: () =>
    apiRequest<PermissionItem[]>('/developer/permissions'),

  getRolePermissionMatrix: () =>
    apiRequest<RolePermissionMatrixData>('/developer/roles/matrix'),

  updateRolePermissions: (roleId: number, permissionIds: number[]) =>
    apiRequest<RoleDetailItem>(`/developer/roles/${roleId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permission_ids: permissionIds }),
    }),

  getDeveloperAuditLogs: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    action?: string;
    record_type?: string;
    actor_email?: string;
    date_from?: string;
    date_to?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.action) query.append('action', params.action);
    if (params?.record_type) query.append('record_type', params.record_type);
    if (params?.actor_email) query.append('actor_email', params.actor_email);
    if (params?.date_from) query.append('date_from', params.date_from);
    if (params?.date_to) query.append('date_to', params.date_to);
    const qs = query.toString();
    return apiRequest<AuditLogListResponseData>(`/developer/audit-logs${qs ? `?${qs}` : ''}`);
  },

  getDeveloperAuditLogDetail: (auditId: number) =>
    apiRequest<AuditLogItem>(`/developer/audit-logs/${auditId}`),
};

export interface UserDetailItem {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  job_title?: string;
  is_active: boolean;
  is_superuser: boolean;
  department_id?: number | null;
  department_code?: string | null;
  department_name?: string | null;
  is_department_head: boolean;
  roles: string[];
  default_company_id?: number | null;
  default_company_name?: string | null;
  default_entity_id?: number | null;
  created_at: string;
  updated_at: string;
  last_active_at?: string | null;
}

export interface UserListResponseData {
  items: UserDetailItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface InvitationDetailItem {
  id: number;
  email: string;
  role: string;
  department_id?: number | null;
  department_code?: string | null;
  department_name?: string | null;
  is_department_head: boolean;
  company_id?: number | null;
  company_name?: string | null;
  status: string;
  invited_by_id?: number | null;
  invited_by_name?: string | null;
  expires_at: string;
  accepted_at?: string | null;
  email_status: string;
  email_sent_at?: string | null;
  email_error?: string | null;
  created_at: string;
  invite_url?: string | null;
}

export interface InvitationListResponseData {
  items: InvitationDetailItem[];
  total: number;
}

export interface DepartmentHeadSummary {
  id: number;
  email: string;
  full_name: string;
  job_title?: string;
}

export interface DepartmentMemberSummary {
  id: number;
  email: string;
  full_name: string;
  job_title?: string;
  is_active: boolean;
  is_head: boolean;
  created_at?: string;
}

export interface DepartmentItem {
  id: number;
  code: string;
  name: string;
  description?: string;
  head_user_id?: number | null;
  head?: DepartmentHeadSummary | null;
  is_active: boolean;
  member_count: number;
  active_member_count: number;
  created_at: string;
  updated_at: string;
}

export interface DashboardStatsData {
  total_users: number;
  active_users: number;
  suspended_users: number;
  total_departments: number;
  active_departments: number;
  total_department_members: number;
  assigned_heads_count: number;
  unassigned_heads_count: number;
  pending_invitations: number;
  platform_health: {
    api_status: string;
    database_status: string;
    security_policy: string;
    timestamp: string;
  };
}

export interface CandidateUserItem {
  id: number;
  email: string;
  full_name: string;
  job_title?: string;
  department_id?: number | null;
  department_name?: string | null;
  is_active: boolean;
}

export interface PermissionItem {
  id: number;
  code: string;
  name: string;
  module: string;
  description?: string | null;
  created_at?: string;
}

export interface RoleDetailItem {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string;
  permissions: PermissionItem[];
  member_count: number;
  is_system_role: boolean;
  is_protected: boolean;
}

export interface RolePermissionMatrixData {
  roles: RoleDetailItem[];
  permissions: PermissionItem[];
  modules: string[];
  matrix: Record<string, number[]>;
}

export interface AuditLogListResponseData {
  items: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  available_actions: string[];
  available_record_types: string[];
}

