const getApiBase = (): string => {
  let raw = (((import.meta as any).env?.VITE_API_URL as string) || '').trim();

  // If running in browser on Render cloud domain, ensure pointing to live backend
  if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
    if (!raw || raw === 'ricozbooks-api' || !raw.includes('.')) {
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
  user_id?: number;
  user_email?: string;
  entity_id?: number;
  action: string;
  record_type: string;
  record_id?: string;
  ip_address?: string;
  details?: string;
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
};
