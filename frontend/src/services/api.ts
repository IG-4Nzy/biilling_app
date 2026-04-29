import api from '../config/api';
import type { IAuthResponse } from '@billing/shared';

export const authService = {
  login: async (email: string, password: string, mfaCode?: string) => {
    const { data } = await api.post<{ success: boolean; data: IAuthResponse }>('/auth/login', {
      email, password, mfaCode,
    });
    return data.data;
  },

  refresh: async (refreshToken: string) => {
    const { data } = await api.post('/auth/refresh', { refreshToken });
    return data.data;
  },

  verifyPassword: async (password: string) => {
    const { data } = await api.post('/auth/verify-password', { password });
    return data;
  },

  logout: async (refreshToken: string) => {
    await api.post('/auth/logout', { refreshToken });
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const { data } = await api.post('/auth/change-password', { currentPassword, newPassword });
    return data;
  },

  getSessions: async () => {
    const { data } = await api.get('/auth/sessions');
    return data.data;
  },

  revokeSession: async (sessionId: string) => {
    await api.delete(`/auth/sessions/${sessionId}`);
  },
};

export const billService = {
  list: async (params: Record<string, any> = {}) => {
    const { data } = await api.get('/bills', { params });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get(`/bills/${id}`);
    return data.data;
  },

  create: async (billData: any) => {
    const { data } = await api.post('/bills', billData);
    return data.data;
  },

  update: async (id: string, billData: any) => {
    const { data } = await api.put(`/bills/${id}`, billData);
    return data.data;
  },

  updateStatus: async (id: string, status: string) => {
    const { data } = await api.patch(`/bills/${id}/status`, { status });
    return data.data;
  },

  delete: async (id: string) => {
    await api.delete(`/bills/${id}`);
  },

  getNextNumber: async () => {
    const { data } = await api.get('/bills/meta/next-number');
    return data.data;
  },

  setCounter: async (lastNumber: number) => {
    const { data } = await api.put('/bills/meta/set-counter', { lastNumber });
    return data.data;
  },
};

export const customerService = {
  list: async (params: Record<string, any> = {}) => {
    const { data } = await api.get('/customers', { params });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get(`/customers/${id}`);
    return data.data;
  },

  create: async (customerData: any) => {
    const { data } = await api.post('/customers', customerData);
    return data.data;
  },

  update: async (id: string, customerData: any) => {
    const { data } = await api.put(`/customers/${id}`, customerData);
    return data.data;
  },

  delete: async (id: string) => {
    await api.delete(`/customers/${id}`);
  },
};

export const productService = {
  list: async (params: Record<string, any> = {}) => {
    const { data } = await api.get('/products', { params });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get(`/products/${id}`);
    return data.data;
  },

  create: async (productData: any) => {
    const { data } = await api.post('/products', productData);
    return data.data;
  },

  update: async (id: string, productData: any) => {
    const { data } = await api.put(`/products/${id}`, productData);
    return data.data;
  },

  delete: async (id: string) => {
    await api.delete(`/products/${id}`);
  },

  updateStock: async (id: string, adjustment: number) => {
    const { data } = await api.patch(`/products/${id}/stock`, { adjustment });
    return data.data;
  },
};

export const dashboardService = {
  getStats: async (params: Record<string, any> = {}) => {
    const { data } = await api.get('/dashboard', { params });
    return data.data;
  },
};

export const reportService = {
  getSales: async (params: Record<string, any> = {}) => {
    const { data } = await api.get('/reports/sales', { params });
    return data.data;
  },

  getCustomerSpending: async (params: Record<string, any> = {}) => {
    const { data } = await api.get('/reports/customers', { params });
    return data.data;
  },

  getTopProducts: async (params: Record<string, any> = {}) => {
    const { data } = await api.get('/reports/products', { params });
    return data.data;
  },

  getAuditLogs: async (params: Record<string, any> = {}) => {
    const { data } = await api.get('/reports/audit-logs', { params });
    return data;
  },

  exportCSV: async (params: Record<string, any> = {}) => {
    const { useAuthStore } = await import('../stores/authStore');
    const token = useAuthStore.getState().accessToken;
    const query = new URLSearchParams({ ...params, format: 'csv' }).toString();
    const response = await fetch(`/api/reports/export?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Export failed');
    const text = await response.text();
    return new Blob([text], { type: 'text/csv;charset=utf-8;' });
  },
};

export const userService = {
  list: async (params: Record<string, any> = {}) => {
    const { data } = await api.get('/users', { params });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get(`/users/${id}`);
    return data.data;
  },

  create: async (userData: any) => {
    const { data } = await api.post('/users', userData);
    return data.data;
  },

  update: async (id: string, userData: any) => {
    const { data } = await api.put(`/users/${id}`, userData);
    return data.data;
  },

  delete: async (id: string) => {
    await api.delete(`/users/${id}`);
  },

  getLoginLogs: async (id: string) => {
    const { data } = await api.get(`/users/${id}/login-logs`);
    return data.data;
  },
};

export const companyService = {
  get: async () => {
    const { data } = await api.get('/company');
    return data.data;
  },

  update: async (profileData: any) => {
    const { data } = await api.put('/company', profileData);
    return data.data;
  },

  uploadLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    const { data } = await api.post('/company/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  deleteLogo: async () => {
    await api.delete('/company/logo');
  },
};
