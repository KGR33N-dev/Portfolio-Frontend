import { API_URLS } from '~/config/api';
import type { CreatePostData, ApiPost } from '~/types/blog';

// Types for better TypeScript support
interface User {
  // Podstawowe dane użytkownika
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  bio: string | null;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  
  // Informacje o roli i randze
  role: {
    id: number;
    name: string; // "user" | "admin" | "moderator"
    display_name: string;
    color: string;
    permissions: string[];
    level: number;
  } | null;
  
  rank: {
    id: number;
    name: string; // "newbie" | "regular" | "trusted" | "star" | "legend" | "vip"
    display_name: string;
    icon: string;
    color: string;
    level: number;
  } | null;
  
  // Statystyki
  total_comments: number;
  total_likes_received: number;
  total_posts: number;
  reputation_score: number;
  
  // Pola pomocnicze
  display_role: string | null;
  display_rank: string | null;
  role_color: string | null;
  rank_icon: string | null;
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
  
  // User verification cache to prevent duplicate API calls
  private static verificationCache: { user: User | null; timestamp: number } | null = null;
  private static readonly CACHE_TTL = 5000; // 5 seconds cache
  
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
    // Clear verification cache on logout
    this.verificationCache = null;
    
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
      let errorMessage = 'Login failed';
      
      try {
        const errorData = await response.json();
        
        // Handle specific HTTP status codes
        if (response.status === 429) {
          errorMessage = errorData.detail || 'Too many login attempts. Please try again later.';
        } else if (response.status === 401) {
          errorMessage = errorData.detail || 'Invalid email or password.';
        } else if (response.status === 403) {
          errorMessage = errorData.detail || 'Account is locked or email not verified.';
        } else if (response.status === 422) {
          errorMessage = errorData.detail || 'Invalid request format.';
        } else {
          errorMessage = errorData.detail || errorData.message || `Server error (${response.status})`;
        }
      } catch {
        errorMessage = `Server error (${response.status}): ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }
    
    const data: LoginResponse = await response.json();
    
    if (import.meta.env.DEV) {
      console.log('🔐 Login Success Debug:');
      console.log('Response data:', data);
      console.log('Access token:', data.access_token ? 'EXISTS' : 'MISSING');
      console.log('User data:', data.user);
    }
    
    // Store only token
    localStorage.setItem(this.TOKEN_KEY, data.access_token);
    
    if (import.meta.env.DEV) {
      console.log('🔐 After saving token to localStorage:');
      console.log('TOKEN_KEY:', this.TOKEN_KEY);
      console.log('Saved token:', localStorage.getItem(this.TOKEN_KEY) ? 'SUCCESS' : 'FAILED');
    }
    
    return data.user;
  }

  // Verify user with server (API-based authentication) with caching
  static async verifyUser(skipCache = false): Promise<User | null> {
    // Check cache first (unless skipping)
    if (!skipCache && this.verificationCache) {
      const age = Date.now() - this.verificationCache.timestamp;
      if (age < this.CACHE_TTL) {
        if (import.meta.env.DEV) {
          console.log('🎯 Using cached user verification (age: ' + Math.round(age/1000) + 's)');
        }
        return this.verificationCache.user;
      } else if (import.meta.env.DEV) {
        console.log('🕐 Cache expired (age: ' + Math.round(age/1000) + 's), fetching fresh data');
      }
    } else if (import.meta.env.DEV && skipCache) {
      console.log('⏭️ Skipping cache as requested');
    }

    const token = this.getToken();
    if (!token) {
      this.verificationCache = { user: null, timestamp: Date.now() };
      return null;
    }

    try {
      if (import.meta.env.DEV) {
        console.log('🔍 Verifying user with API...');
      }
      const response = await fetch(API_URLS.me(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        
        if (import.meta.env.DEV) {
          console.log('👤 User verification result:', userData);
          console.log('🎭 Role data:', userData.role);
          console.log('🏆 Rank data:', userData.rank);
        }
        
        this.verificationCache = { user: userData, timestamp: Date.now() };
        return userData;
      } else {
        // Token is invalid, clear storage and cache (but don't redirect immediately)
        if (typeof window !== 'undefined') {
          localStorage.removeItem(this.TOKEN_KEY);
        }
        this.verificationCache = { user: null, timestamp: Date.now() };
        return null;
      }
    } catch (error) {
      console.error('Error verifying user:', error);
      this.verificationCache = { user: null, timestamp: Date.now() };
      return null;
    }
  }

  // Helper functions for role checking
  static getUserRole(user: User | null): string | null {
    if (!user?.role) {
      if (import.meta.env.DEV) {
        console.log('🚫 No role data found for user:', user);
      }
      return null;
    }
    
    // Since role is now guaranteed to be an object or null, we can simplify
    const roleName = user.role.name;
    
    if (import.meta.env.DEV) {
      console.log('🎭 Role extracted:', roleName, 'from role object:', user.role);
    }
    
    return roleName;
  }
  
  static getUserRank(user: User | null): string | null {
    if (!user?.rank) {
      if (import.meta.env.DEV) {
        console.log('🚫 No rank data found for user:', user);
      }
      return null;
    }
    
    const rankName = user.rank.name;
    
    if (import.meta.env.DEV) {
      console.log('🏆 Rank extracted:', rankName, 'from rank object:', user.rank);
    }
    
    return rankName;
  }
  
  static isUserAdmin(user: User | null): boolean {
    const role = this.getUserRole(user);
    if (!role) {
      if (import.meta.env.DEV) {
        console.log('❌ No role found, user is not admin');
      }
      return false;
    }
    
    const normalizedRole = role.toLowerCase();
    const isAdmin = normalizedRole === 'admin' || normalizedRole === 'administrator';
    
    if (import.meta.env.DEV) {
      console.log('🔍 Admin check:', {
        originalRole: role,
        normalizedRole,
        isAdmin
      });
    }
    
    return isAdmin;
  }
  
  static hasPermission(user: User | null, permission: string): boolean {
    if (!user?.role) {
      if (import.meta.env.DEV) {
        console.log('🚫 No role found for permission check:', permission);
      }
      return false;
    }
    
    // Check if user has admin role (admins have all permissions)
    if (this.isUserAdmin(user)) {
      if (import.meta.env.DEV) {
        console.log('✅ Admin user has all permissions:', permission);
      }
      return true;
    }
    
    // Check specific permission
    const hasPermission = user.role.permissions.includes(permission);
    
    if (import.meta.env.DEV) {
      console.log('🔍 Permission check:', {
        permission,
        userRole: user.role.name,
        availablePermissions: user.role.permissions,
        hasPermission
      });
    }
    
    return hasPermission;
  }

  // Secure method to check if user is admin (via API)
  static async isAdminSecure(): Promise<boolean> {
    const user = await this.verifyUser();
    return this.isUserAdmin(user);
  }

  // Method to check if token exists (quick check without API call)
  static hasToken(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('access_token');
  }

  // Check if user is authenticated (API-based verification - secure)
  static async isAuthenticatedSecure(): Promise<boolean> {
    const user = await this.verifyUser();
    return !!user;
  }

  // Get current user (returns cached user or fetches from API)
  static async getCurrentUser(): Promise<User | null> {
    return this.verifyUser();
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
      let errorMessage = 'Registration failed';
      
      try {
        const errorData = await response.json();
        
        // Handle specific HTTP status codes
        if (response.status === 429) {
          errorMessage = errorData.detail || 'Too many registration attempts. Please try again later.';
        } else if (response.status === 400) {
          errorMessage = errorData.detail || 'Invalid registration data.';
        } else if (response.status === 409) {
          errorMessage = errorData.detail || 'Email or username already exists.';
        } else if (response.status === 422) {
          errorMessage = errorData.detail || 'Invalid request format.';
        } else {
          errorMessage = errorData.detail || errorData.message || `Server error (${response.status})`;
        }
      } catch {
        errorMessage = `Server error (${response.status}): ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
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

  static async getAdminPosts(params: Record<string, string | number | boolean> = {}): Promise<{ posts: ApiPost[]; total: number; page: number; per_page: number }> {
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
      body: JSON.stringify({ email, verification_code: code }),
    });

    if (!response.ok) {
      let errorMessage = 'Email verification failed';
      
      try {
        const errorData = await response.json();
        
        // Handle specific HTTP status codes
        if (response.status === 429) {
          errorMessage = errorData.detail || 'Too many verification attempts. Please try again later.';
        } else if (response.status === 400) {
          errorMessage = errorData.detail || 'Invalid verification code or email.';
        } else if (response.status === 404) {
          errorMessage = errorData.detail || 'User not found or verification code expired.';
        } else if (response.status === 422) {
          errorMessage = errorData.detail || 'Invalid request format.';
        } else {
          errorMessage = errorData.detail || errorData.message || `Server error (${response.status})`;
        }
      } catch {
        errorMessage = `Server error (${response.status}): ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
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
      let errorMessage = 'Failed to resend verification';
      
      try {
        const errorData = await response.json();
        
        // Handle specific HTTP status codes
        if (response.status === 429) {
          errorMessage = errorData.detail || 'Too many resend attempts. Please wait before trying again.';
        } else if (response.status === 400) {
          errorMessage = errorData.detail || 'Invalid email address.';
        } else if (response.status === 404) {
          errorMessage = errorData.detail || 'User not found.';
        } else if (response.status === 422) {
          errorMessage = errorData.detail || 'Invalid request format.';
        } else {
          errorMessage = errorData.detail || errorData.message || `Server error (${response.status})`;
        }
      } catch {
        errorMessage = `Server error (${response.status}): ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }
    
    const data: ResendVerificationResponse = await response.json();
    return data;
  }

  // Check session (alias for verifyUser) - used by admin pages
  static async checkSession(skipCache = false): Promise<User | null> {
    return this.verifyUser(skipCache);
  }

  // Update user profile
  static async updateProfile(userData: { username?: string; full_name?: string }): Promise<User> {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(API_URLS.updateProfile(), {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to update profile');
    }

    const updatedUser = await response.json();
    
    // Clear cache to force refresh
    this.verificationCache = null;
    
    return updatedUser;
  }

  // Update password
  static async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(API_URLS.updatePassword(), {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to update password');
    }
  }

  // Delete account
  static async deleteAccount(password: string): Promise<void> {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(API_URLS.deleteAccount(), {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to delete account');
    }

    // Clear all local data
    localStorage.removeItem(this.TOKEN_KEY);
    this.verificationCache = null;
  }

}

// Export AdminAuth to window for global access (needed for dashboard and other scripts)
declare global {
  interface Window {
    AdminAuth: typeof AdminAuth;
  }
}

if (typeof window !== 'undefined') {
  window.AdminAuth = AdminAuth;
}
