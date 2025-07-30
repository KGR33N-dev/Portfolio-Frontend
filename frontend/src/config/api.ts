// API Configuration - używa zmiennych środowiskowych
const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';
const FRONTEND_URL = import.meta.env.PUBLIC_FRONTEND_URL || 'http://localhost:4321';

// Usuwamy stary system przełączania USE_LOCAL_API
export const API_CONFIG = {
  baseUrl: API_BASE_URL,
  blog: `${API_BASE_URL}/api/blog`,
  auth: `${API_BASE_URL}/api/auth`,
  admin: `${API_BASE_URL}/api/admin`,
  frontendUrl: FRONTEND_URL
};

// Helper function do budowania URL-i
export function getApiUrl(endpoint: keyof typeof API_CONFIG): string {
  return API_CONFIG[endpoint];
}

// Helper function do sprawdzania czy używamy lokalnego API
export function isLocalApi(): boolean {
  return API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1');
}

// Helper function do pobrania frontend URL (dla CORS)
export function getFrontendUrl(): string {
  return FRONTEND_URL;
}

// Helper function do budowania pełnych URL-i dla konkretnych endpointów
export const API_URLS = {
  // System endpoints
  health: () => `${API_CONFIG.baseUrl}/api/health`,
  
  // Blog endpoints
  getAllPosts: () => `${API_CONFIG.blog}/`,
  getPost: (id: number) => `${API_CONFIG.blog}/${id}`,
  createPost: () => `${API_CONFIG.blog}/`,
  updatePost: (id: number) => `${API_CONFIG.blog}/${id}`,
  publishPost: (id: number) => `${API_CONFIG.blog}/${id}/publish`,
  deletePost: (id: number) => `${API_CONFIG.blog}/${id}`,
  
  // Auth endpoints
  login: () => `${API_CONFIG.auth}/login`,
  register: () => `${API_CONFIG.auth}/register`,
  verify: () => `${API_CONFIG.auth}/verify`,
  verifyEmail: () => `${API_CONFIG.auth}/verify-email`,
  resendVerification: () => `${API_CONFIG.auth}/resend-verification`,
  
  // Admin endpoints
  dashboard: () => `${API_CONFIG.admin}/dashboard`,
  stats: () => `${API_CONFIG.admin}/stats`,
  
  // Admin blog endpoints (with access to drafts)
  getAdminPosts: (params?: URLSearchParams) => `${API_CONFIG.blog}/admin/posts${params ? '?' + params.toString() : ''}`,
  getAdminPost: (id: number) => `${API_CONFIG.blog}/admin/posts/${id}`,
} as const;

// Status dla debugowania
console.log(`🔧 API Configuration: Using ${isLocalApi() ? 'LOCAL' : 'PRODUCTION'} backend`);
console.log(`📡 Base URL: ${API_CONFIG.baseUrl}`);
console.log(`🌐 Frontend URL: ${API_CONFIG.frontendUrl}`);
