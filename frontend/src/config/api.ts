// API Configuration - używa zmiennych środowiskowych
const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'https://api.kgr33n.com';
const FRONTEND_URL = import.meta.env.PUBLIC_FRONTEND_URL || 'https://kgr33n.pages.dev';

// Usuwamy stary system przełączania USE_LOCAL_API
export const API_CONFIG = {
  baseUrl: API_BASE_URL,
  blog: `${API_BASE_URL}/api/blog`,
  auth: `${API_BASE_URL}/api/auth`,
  admin: `${API_BASE_URL}/api/admin`,
  comments: `${API_BASE_URL}/api/comments`,
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
  
  // Blog endpoints (nowa wielojęzyczna struktura)
  getAllPosts: (params?: {
    limit?: number;
    page?: number;
    per_page?: number;
    tags?: string;
    ids?: string;
    sort?: 'published_at' | 'created_at' | 'title';
    order?: 'asc' | 'desc';
    published?: boolean;
    published_only?: boolean;
    language?: string;
    category?: string;
    status?: 'all' | 'published' | 'draft';
  }) => {
    const url = new URL(`${API_CONFIG.blog}/`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString());
        }
      });
    }
    return url.toString();
  },
  
  // Single post endpoints (nowa struktura)
  getPost: (id: number) => `${API_CONFIG.blog}/${id}`,
  getPostBySlug: (slug: string, params?: { language?: string }) => {
    const url = new URL(`${API_CONFIG.blog}/${slug}`);
    if (params?.language) {
      url.searchParams.append('language', params.language);
    }
    return url.toString();
  },
  
  // Post management (wielojęzyczne)
  createPost: () => `${API_CONFIG.blog}/`,
  updatePost: (id: number) => `${API_CONFIG.blog}/${id}`,
  publishPost: (id: number) => `${API_CONFIG.blog}/${id}/publish`,
  unpublishPost: (id: number) => `${API_CONFIG.blog}/${id}/unpublish`,
  deletePost: (id: number) => `${API_CONFIG.blog}/${id}`,
  
  // Translation management
  addTranslation: (postId: number) => `${API_CONFIG.blog}/${postId}/translations`,
  updateTranslation: (postId: number, languageCode: string) => `${API_CONFIG.blog}/${postId}/translations/${languageCode}`,
  deleteTranslation: (postId: number, languageCode: string) => `${API_CONFIG.blog}/${postId}/translations/${languageCode}`,
  
  // Comments endpoints
  getComments: (postId: number, params?: {
    page?: number;
    per_page?: number;
    approved?: boolean;
  }) => {
    const url = new URL(`${API_CONFIG.blog}/${postId}/comments`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString());
        }
      });
    }
    return url.toString();
  },
  createComment: (postId: number) => `${API_CONFIG.blog}/${postId}/comments`,
  updateComment: (postId: number, commentId: number) => `${API_CONFIG.blog}/${postId}/comments/${commentId}`,
  deleteComment: (postId: number, commentId: number) => `${API_CONFIG.blog}/${postId}/comments/${commentId}`,
  approveComment: (postId: number, commentId: number) => `${API_CONFIG.blog}/${postId}/comments/${commentId}/approve`,
  
  // New Comments API endpoints (using /api/comments structure)
  getPostComments: (postId: number, params?: {
    page?: number;
    per_page?: number;
    approved?: boolean;
  }) => {
    const url = new URL(`${API_CONFIG.comments}/post/${postId}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString());
        }
      });
    }
    return url.toString();
  },
  createPostComment: (postId: number) => `${API_CONFIG.comments}/post/${postId}`,
  updatePostComment: (commentId: number) => `${API_CONFIG.comments}/${commentId}`,
  deletePostComment: (commentId: number) => `${API_CONFIG.comments}/${commentId}`,
  likeComment: (commentId: number) => `${API_CONFIG.comments}/${commentId}/like`,
  approvePostComment: (commentId: number) => `${API_CONFIG.comments}/${commentId}/approve`,
  
  // Auth endpoints
  login: () => `${API_CONFIG.auth}/login`,
  logout: () => `${API_CONFIG.auth}/logout`,
  refresh: () => `${API_CONFIG.auth}/refresh`,
  register: () => `${API_CONFIG.auth}/register`,
  verify: () => `${API_CONFIG.auth}/verify`,
  verifyEmail: () => `${API_CONFIG.auth}/verify-email`,
  resendVerification: () => `${API_CONFIG.auth}/resend-verification`,
  me: () => `${API_CONFIG.auth}/me`, // Endpoint to check current user session
  profile: () => `${API_CONFIG.baseUrl}/profile/`, // Full profile with role and rank
  updateProfile: () => `${API_CONFIG.auth}/update-profile`,
  updatePassword: () => `${API_CONFIG.auth}/update-password`,
  deleteAccount: () => `${API_CONFIG.auth}/delete-account`,
  
  // Password Reset endpoints
  passwordResetRequest: () => `${API_CONFIG.auth}/password-reset-request`,
  passwordResetConfirm: () => `${API_CONFIG.auth}/password-reset-confirm`,
  
  // Admin endpoints
  dashboard: () => `${API_CONFIG.admin}/dashboard`,
  stats: () => `${API_CONFIG.admin}/stats`,
  
  // Admin blog endpoints (nowa struktura - dostęp do wszystkich postów i drafts)
  getAdminPosts: (params?: {
    page?: number;
    per_page?: number;
    status?: 'all' | 'published' | 'draft';
    language?: string;
    category?: string;
  }) => {
    const url = new URL(`${API_CONFIG.blog}/admin/posts`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString());
        }
      });
    }
    return url.toString();
  },
  getAdminPost: (id: number) => `${API_CONFIG.blog}/${id}`,
  
  // Language management endpoints
  getLanguages: (activeOnly = true) => {
    const url = new URL(`${API_CONFIG.baseUrl}/api/languages/`);
    url.searchParams.append('active_only', activeOnly.toString());
    return url.toString();
  },
  getLanguageCodes: (activeOnly = true) => {
    const url = new URL(`${API_CONFIG.baseUrl}/api/languages/codes`);
    url.searchParams.append('active_only', activeOnly.toString());
    return url.toString();
  },
  getLanguage: (code: string) => `${API_CONFIG.baseUrl}/api/languages/${code}`,
  createLanguage: () => `${API_CONFIG.baseUrl}/api/languages/`,
  updateLanguage: (code: string) => `${API_CONFIG.baseUrl}/api/languages/${code}`,
  deleteLanguage: (code: string) => `${API_CONFIG.baseUrl}/api/languages/${code}`,
  activateLanguage: (code: string) => `${API_CONFIG.baseUrl}/api/languages/${code}/activate`,
  deactivateLanguage: (code: string) => `${API_CONFIG.baseUrl}/api/languages/${code}/deactivate`,
  getLanguageStats: () => `${API_CONFIG.baseUrl}/api/languages/stats/usage`,
} as const;

// Development debugging status
if (import.meta.env.DEV) {
  console.log(`🔧 API Configuration: Using ${isLocalApi() ? 'LOCAL' : 'PRODUCTION'} backend`);
  console.log(`📡 Base URL: ${API_CONFIG.baseUrl}`);
  console.log(`🌐 Frontend URL: ${API_CONFIG.frontendUrl}`);
}

// Utility functions for common API calls
export const BlogAPI = {
  // Filtrowanie po tagach
  getPostsByTags: (tags: string[], limit?: number) => 
    API_URLS.getAllPosts({ 
      tags: tags.join(','), 
      limit,
      published: true 
    }),
  
  // Konkretne posty
  getPostsByIds: (ids: number[]) => 
    API_URLS.getAllPosts({ 
      ids: ids.join(',') 
    }),
  
  // Sortowanie
  getPostsSorted: (sortBy: 'published_at' | 'created_at' | 'title' = 'published_at', order: 'asc' | 'desc' = 'desc', limit?: number) =>
    API_URLS.getAllPosts({ 
      sort: sortBy, 
      order, 
      limit,
      published: true 
    }),
  
  // Posty dla konkretnego języka
  getPostsByLanguage: (language: string, limit?: number) =>
    API_URLS.getAllPosts({ 
      language, 
      limit,
      published: true 
    }),
  
  // Kombinacja filtrów
  getPostsFiltered: (filters: {
    tags?: string[];
    language?: string;
    limit?: number;
    page?: number;
    sort?: 'published_at' | 'created_at' | 'title';
    order?: 'asc' | 'desc';
  }) => API_URLS.getAllPosts({
    ...filters,
    tags: filters.tags?.join(','),
    published: true
  })
};

// Make API_URLS available globally for script tags
if (typeof window !== 'undefined') {
  (window as typeof window & { API_URLS: typeof API_URLS }).API_URLS = API_URLS;
}
