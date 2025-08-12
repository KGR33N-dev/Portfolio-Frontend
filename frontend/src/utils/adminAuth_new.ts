import { API_CONFIG, API_URLS } from '~/config/api';
import type { CreatePostData, ApiPost } from '~/types/blog';

// Types for better TypeScript support
interface User {
  id: number;
  email: string;
  username?: string;
  full_name?: string;
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

// Frontend Security Utils
export class AdminAuth {
  private static readonly TOKEN_KEY = 'access_token';
  
  static isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(this.TOKEN_KEY);
  }
  
  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }
  
  static logout(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(this.TOKEN_KEY);
    
    // Get current language from URL
    const currentLang = window.location.pathname.split('/')[1] || 'en';
    window.location.href = `/${currentLang}/login`;
  }
  
  static async login(email: string, password: string): Promise<User> {
    const formData = new URLSearchParams();
    formData.append('username', email); // API expects 'username' field, not 'email'
    formData.append('password', password);
    
    const response = await fetch(API_URLS.login(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'http://localhost:4321',
      },
      body: formData.toString(),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Login failed');
    }
    
    const data: LoginResponse = await response.json();
    
    console.log('🔐 Login Success Debug:');
    console.log('Response data:', data);
    console.log('Access token:', data.access_token ? 'EXISTS' : 'MISSING');
    console.log('User data:', data.user);
    
    // Store only token
    localStorage.setItem(this.TOKEN_KEY, data.access_token);
    
    console.log('🔐 After saving token to localStorage:');
    console.log('TOKEN_KEY:', this.TOKEN_KEY);
    console.log('Saved token:', localStorage.getItem(this.TOKEN_KEY) ? 'SUCCESS' : 'FAILED');
    
    return data.user;
  }

  // Verify user from API and return user data
  static async verifyUser(): Promise<User | null> {
    if (typeof window === 'undefined') return null;
    
    const token = this.getToken();
    if (!token) return null;

    try {
      const response = await fetch(API_URLS.me(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        return userData;
      } else {
        // Token is invalid, clear storage
        this.logout();
        return null;
      }
    } catch (error) {
      console.error('Error verifying user:', error);
      return null;
    }
  }

  // Secure method to check if user is admin (via API)
  static async isAdminSecure(): Promise<boolean> {
    const user = await this.verifyUser();
    return !!(user?.is_admin);
  }

  // Secure method to check authentication (via API)
  static async isAuthenticatedSecure(): Promise<boolean> {
    const user = await this.verifyUser();
    return !!user;
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

  // Helper method for authenticated requests
  static async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    const authOptions: RequestInit = {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    return fetch(url, authOptions);
  }

  // Blog post operations with authentication
  static async createPost(postData: CreatePostData): Promise<ApiPost> {
    const response = await this.makeAuthenticatedRequest(API_URLS.createPost(), {
      method: 'POST',
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to create post');
    }

    return response.json();
  }

  static async updatePost(postId: number, postData: Partial<CreatePostData>): Promise<ApiPost> {
    const response = await this.makeAuthenticatedRequest(API_URLS.updatePost(postId), {
      method: 'PUT',
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to update post');
    }

    return response.json();
  }

  static async deletePost(postId: number): Promise<void> {
    const response = await this.makeAuthenticatedRequest(API_URLS.deletePost(postId), {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to delete post');
    }
  }

  static async getAdminPosts(params: any = {}): Promise<{ posts: ApiPost[]; total: number; page: number; per_page: number }> {
    const url = API_URLS.getAdminPosts(params);
    const response = await this.makeAuthenticatedRequest(url);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to fetch admin posts');
    }

    return response.json();
  }

  // Email verification
  static async verifyEmail(email: string, code: string): Promise<VerifyEmailResponse> {
    const response = await fetch(API_URLS.verifyEmail(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Email verification failed');
    }

    const data: VerifyEmailResponse = await response.json();
    
    // If verification includes new tokens, store them
    if (data.success && data.data?.access_token) {
      localStorage.setItem(this.TOKEN_KEY, data.data.access_token);
    }
    
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
}
