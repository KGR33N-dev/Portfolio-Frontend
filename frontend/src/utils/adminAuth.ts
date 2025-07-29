import { API_CONFIG, API_URLS } from '~/config/api';

// Types for better TypeScript support
interface User {
  id: number;
  email: string;
  is_admin: boolean;
  is_active: boolean;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name?: string | null;
  is_admin?: boolean;
}

interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    email: string;
    expires_in_minutes: number;
    user_id: number;
  };
}

interface VerifyEmailRequest {
  email: string;
  verification_code: string;
}

interface VerifyEmailResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    access_token?: string;
    token_type?: string;
  };
}

interface ResendVerificationResponse {
  success: boolean;
  message: string;
  data: {
    expires_in_minutes: number;
  };
}

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  author?: string;
  category?: string;
  tags?: string[];
  featured_image?: string;
  language: string;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
}

interface BlogPostCreate {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  featured_image?: string;
  language: string;
  is_published: boolean;
}

// Frontend Security Utils
export class AdminAuth {
  private static readonly TOKEN_KEY = 'admin_token';
  private static readonly USER_KEY = 'admin_user';
  
  static isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    
    const token = localStorage.getItem(this.TOKEN_KEY);
    const user = this.getUser();
    
    return !!(token && user);
  }
  
  static isAdmin(): boolean {
    const user = this.getUser();
    return !!(user?.is_admin);
  }
  
  static getCurrentUser(): User | null {
    return this.getUser();
  }
  
  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }
  
  static getUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }
  
  static logout(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    window.location.href = '/login';
  }
  
  static async login(email: string, password: string): Promise<User> {
    const formData = new URLSearchParams();
    formData.append('username', email); // API expects 'username' field, not 'email'
    formData.append('password', password);
    
    const response = await fetch(API_URLS.login(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Login failed');
    }
    
    const data: LoginResponse = await response.json();
    
    // Store tokens securely
    localStorage.setItem(this.TOKEN_KEY, data.access_token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
    
    return data.user;
  }
  
  static async register(userData: RegisterRequest): Promise<RegisterResponse> {
    const response = await fetch(API_URLS.register(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Registration failed');
    }
    
    const data: RegisterResponse = await response.json();
    return data;
  }
  
  static async verifyEmail(email: string, code: string): Promise<VerifyEmailResponse> {
    const response = await fetch(API_URLS.verifyEmail(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, verification_code: code }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Email verification failed');
    }
    
    const data: VerifyEmailResponse = await response.json();
    return data;
  }
  
  static async resendVerification(email: string): Promise<ResendVerificationResponse> {
    const response = await fetch(API_URLS.resendVerification(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to resend verification');
    }
    
    const data: ResendVerificationResponse = await response.json();
    return data;
  }
  
  static async checkSession(): Promise<User | null> {
    try {
      const response = await this.makeAuthenticatedRequest(`${API_CONFIG.auth}/me`);
      if (response.ok) {
        const user: User = await response.json();
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        return user;
      }
    } catch (error) {
      console.warn('Session check failed:', error);
      this.logout();
    }
    return null;
  }
  
  static async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    if (response.status === 401) {
      this.logout();
      throw new Error('Session expired');
    }
    
    return response;
  }
}

// API Client for Blog Management
export class BlogAPI {
  static async createPost(postData: BlogPostCreate): Promise<BlogPost> {
    const response = await AdminAuth.makeAuthenticatedRequest(
      API_URLS.createPost(),
      {
        method: 'POST',
        body: JSON.stringify(postData),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to create post');
    }
    
    return response.json();
  }
  
  static async updatePost(postId: number, postData: Partial<BlogPostCreate>): Promise<BlogPost> {
    const response = await AdminAuth.makeAuthenticatedRequest(
      API_URLS.updatePost(postId),
      {
        method: 'PUT',
        body: JSON.stringify(postData),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to update post');
    }
    
    return response.json();
  }
  
  static async deletePost(postId: number): Promise<void> {
    const response = await AdminAuth.makeAuthenticatedRequest(
      API_URLS.deletePost(postId),
      {
        method: 'DELETE',
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to delete post');
    }
  }
  
  static async getAllPosts(includeUnpublished = true): Promise<BlogPost[]> {
    const response = await AdminAuth.makeAuthenticatedRequest(
      `${API_URLS.getAllPosts()}?include_unpublished=${includeUnpublished}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch posts');
    }
    
    const data = await response.json();
    return data.items || data; // Handle both paginated and simple array responses
  }
  
  static async getCategories(): Promise<string[]> {
    const response = await fetch(`${API_CONFIG.blog}/categories/list`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    
    return response.json();
  }
  
  static async getTags(): Promise<string[]> {
    const response = await fetch(`${API_CONFIG.blog}/tags/list`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch tags');
    }
    
    return response.json();
  }
  
  static async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = AdminAuth.getToken();
    const response = await fetch(`${API_CONFIG.admin}/upload/image/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload image');
    }
    
    const data = await response.json();
    return data.url;
  }
}
