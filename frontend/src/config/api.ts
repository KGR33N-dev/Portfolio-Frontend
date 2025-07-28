// API Configuration
// Zmień USE_LOCAL_API na true aby używać lokalnego backendu
// Zmień na false aby używać backendu na EC2
const USE_LOCAL_API = true; // Przełącznik: true = local, false = EC2

const API_ENDPOINTS = {
  local: {
    baseUrl: 'http://localhost:8000',
    blog: 'http://localhost:8000/api/blog',
    auth: 'http://localhost:8000/api/auth',
    admin: 'http://localhost:8000/api/admin'
  },
  production: {
    baseUrl: 'http://51.20.78.79:8000',
    blog: 'http://51.20.78.79:8000/api/blog',
    auth: 'http://51.20.78.79:8000/api/auth',
    admin: 'http://51.20.78.79:8000/api/admin'
  }
};

// Automatyczny wybór endpointów na podstawie USE_LOCAL_API
export const API_CONFIG = USE_LOCAL_API ? API_ENDPOINTS.local : API_ENDPOINTS.production;

// Helper function do budowania URL-i
export function getApiUrl(endpoint: keyof typeof API_CONFIG): string {
  return API_CONFIG[endpoint];
}

// Helper function do sprawdzania czy używamy lokalnego API
export function isLocalApi(): boolean {
  return USE_LOCAL_API;
}

// Helper function do budowania pełnych URL-i dla konkretnych endpointów
export const API_URLS = {
  // Blog endpoints
  getAllPosts: () => `${API_CONFIG.blog}/`,
  getPost: (id: number) => `${API_CONFIG.blog}/${id}`,
  createPost: () => `${API_CONFIG.blog}/`,
  updatePost: (id: number) => `${API_CONFIG.blog}/${id}`,
  deletePost: (id: number) => `${API_CONFIG.blog}/${id}`,
  
  // Auth endpoints
  login: () => `${API_CONFIG.auth}/login`,
  register: () => `${API_CONFIG.auth}/register`,
  verify: () => `${API_CONFIG.auth}/verify`,
  
  // Admin endpoints
  dashboard: () => `${API_CONFIG.admin}/dashboard`,
  stats: () => `${API_CONFIG.admin}/stats`,
} as const;

// Status dla debugowania
console.log(`🔧 API Configuration: Using ${USE_LOCAL_API ? 'LOCAL' : 'PRODUCTION'} backend`);
console.log(`📡 Base URL: ${API_CONFIG.baseUrl}`);
