import { API_BASE } from './api';

// Base URL for internal demo management API
const getInternalBase = (): string => {
  // If API_BASE is e.g. 'https://ricozbooks-api.onrender.com/api/v1' or '/api/v1'
  return API_BASE;
};

const BASE_URL = getInternalBase();

export interface InternalUser {
  id: number;
  name: string;
  email: string;
  role: 'DEMO_ADMIN' | 'DEMO_COORDINATOR' | 'SALES_TEAM' | string;
  is_active: boolean;
  assigned_count?: number;
}

export interface DemoScheduleHistoryItem {
  id: number;
  demo_request_id: number;
  old_date?: string | null;
  old_time?: string | null;
  new_date?: string | null;
  new_time?: string | null;
  changed_by_name?: string | null;
  reason?: string | null;
  created_at: string;
}

export interface DemoRequestItem {
  id: number;
  reference_code: string;
  full_name: string;
  work_email: string;
  phone: string;
  company: string;
  role: string;
  entities_count: string;
  interest_area: string;
  preferred_date?: string | null;
  preferred_time?: string | null;
  confirmed_date?: string | null;
  confirmed_time?: string | null;
  duration?: string | null;
  meeting_link?: string | null;
  status: 'NEW' | 'UNDER REVIEW' | 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED' | 'REJECTED' | string;
  assigned_to?: number | null;
  assigned_user_name?: string | null;
  internal_notes?: string | null;
  created_at: string;
  updated_at: string;
  history: DemoScheduleHistoryItem[];
}

export interface DemoListResponse {
  total: number;
  page: number;
  limit: number;
  items: DemoRequestItem[];
}

export interface DashboardStats {
  new_requests: number;
  pending_requests: number;
  scheduled_demos: number;
  today_demos: number;
  completed_demos: number;
  cancelled_demos: number;
  total_requests: number;
  status_distribution: Record<string, number>;
  requests_over_time: Array<{ date: string; count: number }>;
}

export interface PublicDemoBookingPayload {
  full_name: string;
  work_email: string;
  phone: string;
  company: string;
  role: string;
  entities_count?: string;
  interest_area?: string;
  preferred_date?: string;
  preferred_time?: string;
}

export interface PublicDemoBookingResponse {
  reference_code: string;
  status: string;
  message: string;
  customer_name: string;
  company: string;
  preferred_date?: string;
  preferred_time?: string;
}

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('ricoz_internal_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const internalDemoApi = {
  // Public Booking
  submitPublicDemo: async (payload: PublicDemoBookingPayload): Promise<PublicDemoBookingResponse> => {
    const res = await fetch(`${BASE_URL}/demos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to submit demo request' }));
      throw new Error(err.detail || 'Failed to submit demo request');
    }
    return res.json();
  },

  // Internal Auth
  login: async (email: string, password: string): Promise<{ access_token: string; user: InternalUser }> => {
    const res = await fetch(`${BASE_URL}/internal/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Invalid credentials' }));
      throw new Error(err.detail || 'Invalid email or password');
    }
    return res.json();
  },

  getMe: async (): Promise<InternalUser> => {
    const res = await fetch(`${BASE_URL}/internal/auth/me`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Unauthorized');
    return res.json();
  },

  logout: async (): Promise<void> => {
    try {
      await fetch(`${BASE_URL}/internal/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
    } catch {
      // Ignore network errors on logout
    }
  },

  // Dashboard Stats
  getStats: async (): Promise<DashboardStats> => {
    const res = await fetch(`${BASE_URL}/internal/dashboard/stats`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load dashboard metrics');
    return res.json();
  },

  getRecentDemos: async (): Promise<DemoRequestItem[]> => {
    const res = await fetch(`${BASE_URL}/internal/dashboard/recent-demos`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load recent demos');
    return res.json();
  },

  getUpcomingDemos: async (): Promise<DemoRequestItem[]> => {
    const res = await fetch(`${BASE_URL}/internal/dashboard/upcoming-demos`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load upcoming demos');
    return res.json();
  },

  // Demo List & Filtering
  listDemos: async (params: {
    search?: string;
    status?: string;
    interest_area?: string;
    assigned_to?: number;
    from_date?: string;
    to_date?: string;
    sort_by?: string;
    sort_dir?: string;
    page?: number;
    limit?: number;
  }): Promise<DemoListResponse> => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.interest_area && params.interest_area !== 'ALL') query.append('interest_area', params.interest_area);
    if (params.assigned_to) query.append('assigned_to', String(params.assigned_to));
    if (params.from_date) query.append('from_date', params.from_date);
    if (params.to_date) query.append('to_date', params.to_date);
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.sort_dir) query.append('sort_dir', params.sort_dir);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));

    const res = await fetch(`${BASE_URL}/internal/demos?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load demo requests');
    return res.json();
  },

  getDemoDetail: async (id: number): Promise<DemoRequestItem> => {
    const res = await fetch(`${BASE_URL}/internal/demos/${id}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load demo details');
    return res.json();
  },

  updateStatus: async (id: number, status: string): Promise<DemoRequestItem> => {
    const res = await fetch(`${BASE_URL}/internal/demos/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update status' }));
      throw new Error(err.detail || 'Failed to update status');
    }
    return res.json();
  },

  scheduleDemo: async (id: number, payload: {
    confirmed_date: string;
    confirmed_time: string;
    duration?: string;
    meeting_link?: string;
    assigned_to?: number;
    internal_notes?: string;
  }): Promise<DemoRequestItem> => {
    const res = await fetch(`${BASE_URL}/internal/demos/${id}/schedule`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to schedule demo' }));
      throw new Error(err.detail || 'Failed to schedule demo');
    }
    return res.json();
  },

  rescheduleDemo: async (id: number, payload: {
    new_date: string;
    new_time: string;
    reason: string;
    meeting_link?: string;
    assigned_to?: number;
  }): Promise<DemoRequestItem> => {
    const res = await fetch(`${BASE_URL}/internal/demos/${id}/reschedule`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to reschedule demo' }));
      throw new Error(err.detail || 'Failed to reschedule demo');
    }
    return res.json();
  },

  assignDemo: async (id: number, assigned_to: number): Promise<DemoRequestItem> => {
    const res = await fetch(`${BASE_URL}/internal/demos/${id}/assign`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ assigned_to })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to assign demo' }));
      throw new Error(err.detail || 'Failed to assign demo');
    }
    return res.json();
  },

  updateDemoFields: async (id: number, payload: {
    internal_notes?: string;
    meeting_link?: string;
    phone?: string;
    company?: string;
  }): Promise<DemoRequestItem> => {
    const res = await fetch(`${BASE_URL}/internal/demos/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update demo fields' }));
      throw new Error(err.detail || 'Failed to update demo fields');
    }
    return res.json();
  },

  getTeam: async (): Promise<InternalUser[]> => {
    const res = await fetch(`${BASE_URL}/internal/team`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load team members');
    return res.json();
  }
};
