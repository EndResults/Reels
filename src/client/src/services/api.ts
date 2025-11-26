import axios, { AxiosResponse } from 'axios';

const USE_PROXY = String((import.meta as any).env?.VITE_USE_PROXY || '').toLowerCase() === 'true';
const ENV_BASE: string | undefined = (import.meta as any).env?.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
let RAW_API_URL = String(ENV_BASE ?? '').trim().replace(/\/+$/, '');

if (typeof window !== 'undefined') {
  try {
    const appHost = window.location.host;
    if (appHost === 'fit.brendr.io') {
      const envHost = RAW_API_URL ? new URL(RAW_API_URL).host : '';
      if (!RAW_API_URL || envHost === 'fit.brendr.io') {
        console.warn('[API] Forcing production backend base URL for fit.brendr.io');
        RAW_API_URL = 'https://fit-production.up.railway.app';
      }
    }
  } catch {}
}

const API_BASE_URL = USE_PROXY ? '/api' : (RAW_API_URL.endsWith('/api') ? RAW_API_URL : `${RAW_API_URL}/api`);
if (!RAW_API_URL) {
  console.error('VITE_API_URL (or VITE_API_BASE_URL) missing at build-time; API base cannot be determined.');
}
if (typeof window !== 'undefined') {
  try {
    const appHost = new URL(window.location.origin).host;
    const apiHost = new URL(API_BASE_URL, window.location.origin).host;
    if (appHost.includes('fit-uat') && apiHost.includes('fit-production')) {
      console.warn('API base points to production while app runs on UAT');
    }
    if (appHost.includes('fit-production') && /ygmaxy/i.test(apiHost)) {
      console.warn('API base points to UAT while app runs on production');
    }
  } catch {}
}

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    console.log('🔵 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      data: config.data,
      headers: config.headers
    });
    
    const token = localStorage.getItem('fit_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔵 API: Added auth token to request');
    } else {
      console.log('🔵 API: No auth token found');
    }
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response?.status === 401) {
      console.log('❌ API: 401 Unauthorized - clearing auth and redirecting');
      // Token expired or invalid, redirect to login
      localStorage.removeItem('fit_token');
      localStorage.removeItem('fit_user');
      window.location.href = '/login/consumer';
    }
    return Promise.reject(error);
  }
);

// Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface RegisterRetailerData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  shopName: string;
  shopUrl: string;
  shopType: string;
}

export interface RegisterConsumerData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterConsumerPayedData extends RegisterConsumerData {
  registrationCode: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  first_name?: string;
  last_name?: string;
  role: 'user' | 'retailer';
  user_type?: string;
  shopName?: string;
  shopUrl?: string;
  shopType?: string;
  profileImageUrl?: string;
  profile_image_url?: string;
  dateOfBirth?: string;
  gender?: string;
  apiKey?: string;
  pasPhoto_front?: string;
  pasPhoto_side?: string;
  pasPhoto_fullBody_front?: string;
  pasPhoto_fullBody_side?: string;
  country?: string;
  language?: string;
  height_cm?: number;
  weight_kg?: number;
}

export interface AuthResponse {
  token: string;
  user?: AuthUser;
  retailer?: AuthUser;
}

// Auth API functions
export const authAPI = {
  // Retailer endpoints
  registerRetailer: async (data: RegisterRetailerData): Promise<AxiosResponse<ApiResponse<AuthResponse>>> => {
    return api.post('/auth-supabase/register/retailer', data, { withCredentials: true });
  },
  loginRetailer: async (data: LoginData): Promise<AxiosResponse<ApiResponse<AuthResponse>>> => {
    return api.post('/auth-supabase/login/retailer', data, { withCredentials: true });
  },
  
  // Consumer endpoints  
  registerConsumer: async (data: RegisterConsumerData): Promise<AxiosResponse<ApiResponse<AuthResponse>>> => {
    return api.post('/auth-supabase/register/user', data, { withCredentials: true });
  },
  registerConsumerPayed: async (data: RegisterConsumerPayedData): Promise<AxiosResponse<ApiResponse<AuthResponse>>> => {
    return api.post('/auth-supabase/register/user/payed', data, { withCredentials: true });
  },
  registerUser: async (data: RegisterConsumerData): Promise<AxiosResponse<ApiResponse<AuthResponse>>> => {
    return api.post('/auth-supabase/register/user', data, { withCredentials: true });
  },
  loginUser: async (data: LoginData): Promise<AxiosResponse<ApiResponse<AuthResponse>>> => {
    return api.post('/auth-supabase/login/user', data, { withCredentials: true });
  },
  loginConsumer: async (data: LoginData): Promise<AxiosResponse<ApiResponse<AuthResponse>>> => {
    return api.post('/auth-supabase/login/user', data, { withCredentials: true });
  },
  
  // Password reset
  forgotPassword: async (data: any): Promise<AxiosResponse<ApiResponse>> => {
    return api.post('/auth-supabase/forgot-password', data, { withCredentials: true });
  },
  resetPassword: async (data: any): Promise<AxiosResponse<ApiResponse>> => {
    return api.post('/auth-supabase/reset-password', data, { withCredentials: true });
  },
  changePassword: async (data: { oldPassword: string, newPassword: string }): Promise<AxiosResponse<ApiResponse>> => {
    return api.post('/auth-supabase/change-password', data, { withCredentials: true });
  },
  
  // Email verification
  resendVerification: async (data: { email: string; type?: 'retailer' | 'consumer' | 'user' }): Promise<AxiosResponse<ApiResponse>> => {
    return api.post('/auth-supabase/resend-verification', data, { withCredentials: true });
  },
  
  // Plans
  getPlans: async (): Promise<AxiosResponse<ApiResponse<{ plans: any[] }>>> => {
    return api.get('/auth-supabase/plans');
  },
};

// Domain management API
export const domainAPI = {
  addDomain: (domain: string, category: string, name?: string): Promise<AxiosResponse<any>> => {
    const payload: any = { domain, category };
    if (name && name.trim()) payload.name = name.trim();
    return api.post('/auth-supabase/add-domain', payload);
  },

  removeDomain: (domainId: string): Promise<AxiosResponse<any>> => {
    return api.delete('/auth-supabase/remove-domain', { data: { domainId } });
  }
};

// Helper functions for local storage
export const authStorage = {
  setToken: (token: string) => {
    localStorage.setItem('fit_token', token);
  },

  getToken: (): string | null => {
    return localStorage.getItem('fit_token');
  },

  setUser: (user: AuthUser) => {
    localStorage.setItem('fit_user', JSON.stringify(user));
  },

  getUser: (): AuthUser | null => {
    const user = localStorage.getItem('fit_user');
    return user ? JSON.parse(user) : null;
  },

  clearAuth: () => {
    localStorage.removeItem('fit_token');
    localStorage.removeItem('fit_user');
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('fit_token');
  },
};

// Consumer API functions
export const consumerAPI = {
  getProfile: async (): Promise<AxiosResponse<{ success: boolean; profile: AuthUser }>> => {
    return api.get('/consumer/profile', { withCredentials: true });
  },
  
  updateProfile: async (data: any): Promise<AxiosResponse<{ success: boolean; profile: AuthUser }>> => {
    return api.put('/consumer/profile', data, { withCredentials: true });
  }
};

// Analytics API client
export const analyticsAPI = {
  getDashboard: (opts?: { shopId?: string; startDate?: string; endDate?: string }) => {
    const params: any = {};
    if (opts?.shopId) params.shopId = opts.shopId;
    if (opts?.startDate) params.startDate = opts.startDate;
    if (opts?.endDate) params.endDate = opts.endDate;
    return api.get('/analytics/dashboard', { params });
  },
  getRecentSessions: (opts?: { page?: number; limit?: number; shopId?: string; startDate?: string; endDate?: string; status?: string; sort?: 'asc' | 'desc' }) => {
    const params: any = { page: opts?.page ?? 1, limit: opts?.limit ?? 5 };
    if (opts?.shopId) params.shopId = opts.shopId;
    if (opts?.startDate) params.startDate = opts.startDate;
    if (opts?.endDate) params.endDate = opts.endDate;
    if (opts?.status) params.status = opts.status;
    if (opts?.sort) params.sort = opts.sort;
    return api.get('/analytics/sessions', { params });
  }
};

// Shops API client
export const shopsAPI = {
  list: () => api.get('/shops'),
  create: (payload: { name: string; category: string; url: string; domain?: string; isActive?: boolean; language?: 'nl' | 'en'; brandingHideLogo?: boolean; promoEnabled?: boolean; promoStartDate?: string | null; promoEndDate?: string | null; widgetColorGradientFrom?: string | null; widgetColorGradientTo?: string | null; widgetColorShadow?: string | null; widgetColorButtonBg?: string | null; widgetColorButtonBorder?: string | null; widgetColorTileText?: string | null; widgetColorTileBorder?: string | null; widgetButtonColorFrom?: string | null; widgetButtonColorTo?: string | null; widgetButtonLabelColor?: string | null; widgetButtonIcon?: 'white' | 'color' | null; widgetButtonLabels?: { nl?: string | null; en?: string | null } | null }) => api.post('/shops', payload),
  update: (shopId: string, payload: { name?: string; category?: string; url?: string; domain?: string; isActive?: boolean; language?: 'nl' | 'en'; brandingHideLogo?: boolean; promoEnabled?: boolean; promoStartDate?: string | null; promoEndDate?: string | null; widgetColorGradientFrom?: string | null; widgetColorGradientTo?: string | null; widgetColorShadow?: string | null; widgetColorButtonBg?: string | null; widgetColorButtonBorder?: string | null; widgetColorTileText?: string | null; widgetColorTileBorder?: string | null; widgetButtonColorFrom?: string | null; widgetButtonColorTo?: string | null; widgetButtonLabelColor?: string | null; widgetButtonIcon?: 'white' | 'color' | null; widgetButtonLabels?: { nl?: string | null; en?: string | null } | null }) => api.put(`/shops/${shopId}`, payload),
  rotateKey: (shopId: string) => api.post(`/shops/${shopId}/rotate-key`),
  remove: (shopId: string) => api.delete(`/shops/${shopId}`),
  uploadLogo: (shopId: string, file: File) => {
    const form = new FormData();
    form.append('logo', file);
    return api.post(`/shops/${shopId}/logo`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  }
};

// Public Shops API client (no auth required)
export const publicShopsAPI = {
  list: () => api.get('/shops/public')
};

// Retailer API client
export const retailerAPI = {
  getBrandingSettings: () => api.get('/retailer/branding-settings'),
  updateBrandingSettings: (payload: { hideLogo: boolean }) => api.put('/retailer/branding-settings', payload),
  closeAccount: (payload?: { reason?: string }) => api.post('/retailer/close-account', payload || {}, { withCredentials: true }),
  undoClose: () => api.post('/retailer/undo-close', {}, { withCredentials: true })
};

// Owner (admin) API client
export const ownerAPI = {
  listCategories: () => api.get('/owner/categories'),
  getCategory: (key: string) => api.get(`/owner/categories/${encodeURIComponent(key)}`),
  setCategoryStatus: (key: string, status: 'ACTIVE' | 'INACTIVE') =>
    api.patch(`/owner/categories/${encodeURIComponent(key)}/status`, { status }),
  uploadCategoryHero: (key: string, file: File) => {
    const form = new FormData();
    form.append('hero', file);
    return api.post(`/owner/categories/${encodeURIComponent(key)}/hero`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  setCategorySettings: (key: string, settings: any) =>
    api.patch(`/owner/categories/${encodeURIComponent(key)}/settings`, { settings }),
  setCategoryPromo: (key: string, locales: { nl?: { video_url?: string; header?: string; body?: string }; en?: { video_url?: string; header?: string; body?: string } }) =>
    api.patch(`/owner/categories/${encodeURIComponent(key)}/promo`, { locales }),

  listRetailers: (opts?: {
    page?: number; limit?: number; q?: string; email?: string; planType?: 'STARTER'|'BASIC'|'PREMIUM'|'ENTERPRISE';
    regFrom?: string; regTo?: string; lastLoginFrom?: string; lastLoginTo?: string;
    sortBy?: 'first_name'|'last_name'|'email'|'plan_type'|'created_at'|'last_login'|'sessions_total'|'shops_count';
    sortDir?: 'asc'|'desc';
  }) => {
    const params: any = {};
    if (opts?.page) params.page = opts.page;
    if (opts?.limit) params.limit = opts.limit;
    if (opts?.q) params.q = opts.q;
    if (opts?.email) params.email = opts.email;
    if (opts?.planType) params.planType = opts.planType;
    if (opts?.regFrom) params.regFrom = opts.regFrom;
    if (opts?.regTo) params.regTo = opts.regTo;
    if (opts?.lastLoginFrom) params.lastLoginFrom = opts.lastLoginFrom;
    if (opts?.lastLoginTo) params.lastLoginTo = opts.lastLoginTo;
    if (opts?.sortBy) params.sortBy = opts.sortBy;
    if (opts?.sortDir) params.sortDir = opts.sortDir;
    return api.get('/owner/retailers', { params });
  },
  restoreRetailer: (retailerId: string) => api.post(`/owner/retailers/${encodeURIComponent(retailerId)}/restore`),
  setRetailerPlan: (retailerId: string, planType: 'STARTER'|'BASIC'|'PREMIUM'|'ENTERPRISE') =>
    api.patch(`/owner/retailers/${encodeURIComponent(retailerId)}/plan`, { planType }),
  closeRetailer: (retailerId: string, reason?: string) =>
    api.post(`/owner/retailers/${encodeURIComponent(retailerId)}/close`, reason ? { reason } : {}),

  listShops: (opts?: {
    page?: number; limit?: number; q?: string; category?: string; retailerEmail?: string;
    sessionsMin?: number; sessionsMax?: number; regFrom?: string; regTo?: string;
    sortBy?: 'name'|'category'|'created_at'|'sessions_total'|'retailer_email';
    sortDir?: 'asc'|'desc';
  }) => {
    const params: any = {};
    if (opts?.page) params.page = opts.page;
    if (opts?.limit) params.limit = opts.limit;
    if (opts?.q) params.q = opts.q;
    if (opts?.category) params.category = opts.category;
    if (opts?.retailerEmail) params.retailerEmail = opts.retailerEmail;
    if (typeof opts?.sessionsMin === 'number') params.sessionsMin = opts.sessionsMin;
    if (typeof opts?.sessionsMax === 'number') params.sessionsMax = opts.sessionsMax;
    if (opts?.regFrom) params.regFrom = opts.regFrom;
    if (opts?.regTo) params.regTo = opts.regTo;
    if (opts?.sortBy) params.sortBy = opts.sortBy;
    if (opts?.sortDir) params.sortDir = opts.sortDir;
    return api.get('/owner/shops', { params });
  },

  listSessions: (opts?: {
    page?: number; limit?: number; q?: string; gender?: string; userType?: 'guest'|'logged'; shopId?: string;
    status?: 'PENDING'|'PROCESSING'|'COMPLETED'|'FAILED'; dateFrom?: string; dateTo?: string; satisfied?: 'true'|'false';
    sortBy?: 'product_title'|'gender'|'user_type'|'shop_name'|'status'|'created_at'|'satisfied';
    sortDir?: 'asc'|'desc';
  }) => {
    const params: any = {};
    if (opts?.page) params.page = opts.page;
    if (opts?.limit) params.limit = opts.limit;
    if (opts?.q) params.q = opts.q;
    if (opts?.gender) params.gender = opts.gender;
    if (opts?.userType) params.userType = opts.userType;
    if (opts?.shopId) params.shopId = opts.shopId;
    if (opts?.status) params.status = opts.status;
    if (opts?.dateFrom) params.dateFrom = opts.dateFrom;
    if (opts?.dateTo) params.dateTo = opts.dateTo;
    if (opts?.satisfied) params.satisfied = opts.satisfied;
    if (opts?.sortBy) params.sortBy = opts.sortBy;
    if (opts?.sortDir) params.sortDir = opts.sortDir;
    return api.get('/owner/sessions', { params });
  },

  listConsumers: (opts?: {
    page?: number; limit?: number; q?: string; email?: string; userType?: 'USER'|'ADMIN';
    regFrom?: string; regTo?: string;
    sortBy?: 'first_name'|'last_name'|'email'|'user_type'|'created_at'|'total_sessions'|'completed_sessions'|'processing_sessions'|'satisfied_true_sessions'|'satisfied_false_sessions';
    sortDir?: 'asc'|'desc';
    hideGuests?: boolean;
  }) => {
    const params: any = {};
    if (opts?.page) params.page = opts.page;
    if (opts?.limit) params.limit = opts.limit;
    if (opts?.q) params.q = opts.q;
    if (opts?.email) params.email = opts.email;
    if (opts?.userType) params.userType = opts.userType;
    if (opts?.regFrom) params.regFrom = opts.regFrom;
    if (opts?.regTo) params.regTo = opts.regTo;
    if (opts?.sortBy) params.sortBy = opts.sortBy;
    if (opts?.sortDir) params.sortDir = opts.sortDir;
    return api.get('/owner/consumers', { params });
  },

  getFitSettings: () => api.get('/owner/fit-settings'),
  updateFitSettings: (payload: { userDailyMax: number; guestDailyMax: number }) =>
    api.put('/owner/fit-settings', payload),
  applyFitSettingsAllUsers: (userDailyMax?: number) =>
    api.post('/owner/fit-settings/apply-all-users', userDailyMax != null ? { userDailyMax } : {})
};

// Extend owner API with subscription settings
export const ownerSubscriptionAPI = {
  getSubscriptionSettings: () => api.get('/owner/subscription-settings'),
  updateSubscriptionSettings: (plans: {
    STARTER?: { included?: number; priceMonthlyEUR?: number | null; priceYearlyEUR?: number | null; shopsLimit?: number | null; allowSubdomains?: boolean };
    BASIC?: { included?: number; priceMonthlyEUR?: number | null; priceYearlyEUR?: number | null; shopsLimit?: number | null; allowSubdomains?: boolean };
    PREMIUM?: { included?: number; priceMonthlyEUR?: number | null; priceYearlyEUR?: number | null; shopsLimit?: number | null; allowSubdomains?: boolean };
    ENTERPRISE?: { included?: number; priceMonthlyEUR?: number | null; priceYearlyEUR?: number | null; shopsLimit?: number | null; allowSubdomains?: boolean };
  }) => api.put('/owner/subscription-settings', { plans }),
  applyIncludedToActive: () => api.post('/owner/subscription-settings/apply-included')
};

// Public Categories API
export const categoriesAPI = {
  listActive: () => api.get('/categories/active')
};

// OAuth helper
export const getOAuthStartUrl = (
  type: 'consumer' | 'retailer',
  params?: { next?: string; shopName?: string; shopUrl?: string; shopType?: string; planType?: string }
) => {
  const base = API_BASE_URL;
  const url = new URL(base + '/auth-supabase/oauth/google/start');
  url.searchParams.set('type', type);
  if (params?.next) url.searchParams.set('next', params.next);
  if (type === 'retailer' && params) {
    if (params.shopName) url.searchParams.set('shopName', params.shopName);
    if (params.shopUrl) url.searchParams.set('shopUrl', params.shopUrl);
    if (params.shopType) url.searchParams.set('shopType', params.shopType);
    if (params.planType) url.searchParams.set('planType', params.planType);
  }
  return url.toString();
};

// Billing API client
export const billingAPI = {
  checkout: (payload: { planType: 'BASIC' | 'PREMIUM' | 'ENTERPRISE'; interval?: 'month' | 'year'; lang?: string }) =>
    api.post('/billing/checkout', payload),
  invoices: (limit?: number) => api.get('/billing/invoices', { params: { limit: limit ?? 12 } }),
  portal: () => api.post('/billing/portal'),
  credits: () => api.get('/billing/credits'),
  checkoutBundle: (payload?: { bundlePriceId?: string; lang?: string }) => api.post('/billing/checkout/bundle', payload || {}),
  downgradeToStarter: () => api.post('/billing/downgrade/starter'),
  publicPlansConfig: () => api.get('/billing/public-plans-config')
};

export { api };
export default api;
