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

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Session expired or invalid
    localStorage.removeItem('ricozbooks_token');
    if (
      !window.location.pathname.includes('/login') &&
      !window.location.pathname.includes('/invite') &&
      !window.location.pathname.includes('/register')
    ) {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorBody.detail || 'An unexpected error occurred');
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
  
  getCompanies: () => apiRequest<Company[]>('/companies'),

  getAuditLogs: (entityId?: number) => {
    const query = entityId ? `?entity_id=${entityId}` : '';
    return apiRequest<AuditLogItem[]>(`/audit-logs${query}`);
  },
  
  getHealth: () => apiRequest<{ status: string; database: string }>('/health'),
};
