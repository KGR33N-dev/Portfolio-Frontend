import { API_URLS } from '../config/api.ts';
import type { CreatePostData, ApiPost } from '../types/blog.ts';

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
  user: User;
}

interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name?: string | null;
  language?: string;
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
  translation_code?: string;
  data?: {
    user: User;
    // No tokens - they're set as HTTP-only cookies
  };
}

export interface ResendVerificationRequest {
  email: string;
  language?: string;
}

interface ResendVerificationResponse {
  success: boolean;
  message: string;
  translation_code?: string;
  data: {
    expires_in_minutes: number;
  };
}

export interface PasswordResetRequest {
  email: string;
  language?: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
  data: {
    expires_in_minutes: number;
  };
}

export interface PasswordResetConfirm {
  email: string;
  reset_token: string;
  new_password: string;
}

export interface PasswordResetConfirmResponse {
  success: boolean;
  message: string;
  data: Record<string, never>;
}

// Frontend Security Utils - Updated for HTTP-only cookies
export class AdminAuth {
  // User verification cache to prevent duplicate API calls
  private static verificationCache: { user: User | null; timestamp: number } | null = null;
  private static readonly CACHE_TTL = 5000; // 5 seconds cache
  
  // Since tokens are now HTTP-only cookies, we can't access them from JavaScript
  // Authentication status is determined by successful API calls
  static isAuthenticated(): boolean {
    // We can't check tokens directly anymore, so we rely on cache or API calls
    if (this.verificationCache && (Date.now() - this.verificationCache.timestamp) < this.CACHE_TTL) {
      return this.verificationCache.user !== null;
    }
    
    // If no recent cache, assume not authenticated
    // The actual check will happen when verifyUser() is called
    return false;
  }
  
  // Since tokens are HTTP-only, this method is no longer needed
  static getToken(): string | null {
    // Tokens are not accessible from JavaScript anymore
    return null;
  }
  
  static async logout(): Promise<void> {
    try {
      // Call backend logout endpoint to clear HTTP-only cookies
      await fetch(API_URLS.logout(), {
        method: 'POST',
        credentials: 'include', // Important: include cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Logout request failed, but continuing with client cleanup:', error);
      }
    }
    
    // Clear verification cache
    this.verificationCache = null;
    
    // Redirect to login
    const currentLang = window.location.pathname.split('/')[1] || 'en';
    window.location.href = `/${currentLang}/login`;
  }
  
  static async login(email: string, password: string): Promise<User> {
    const formData = new URLSearchParams();
    formData.append('username', email); // API expects 'username' field, not 'email'
    formData.append('password', password);
    
    const response = await fetch(API_URLS.login(), {
      method: 'POST',
      credentials: 'include', // Important: include cookies for HTTP-only token setting
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    if (!response.ok) {
      try {
        const errorData = await response.json();
        
        // Preserve the API error structure for proper error handling
        if (errorData.detail?.error_code || errorData.detail?.translation_code) {
          // Throw error with the same structure as API response
          throw {
            response: {
              data: errorData
            }
          };
        } else {
          // Fallback for old error format
          let errorMessage = 'Login failed';
          
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
          
          throw new Error(errorMessage);
        }
      } catch (error) {
        // If parsing JSON fails, throw a generic error
        if (error.response) {
          // Re-throw the structured error
          throw error;
        } else {
          throw new Error(`Server error (${response.status}): ${response.statusText}`);
        }
      }
    }
    
    const data: LoginResponse = await response.json();
    
    if (import.meta.env.DEV) {
      console.log('🔐 Login Success Debug:');
      console.log('Response data:', data);
      console.log('User data:', data.user);
      console.log('Tokens are now set as HTTP-only cookies by the server');
    }
    
    // Clear any old cache and set new user data
    this.verificationCache = { user: data.user, timestamp: Date.now() };
    
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

    try {
      if (import.meta.env.DEV) {
        console.log('🔍 Verifying user with API (using HTTP-only cookies)...');
      }
      
      // Make initial request
      let response = await fetch(API_URLS.me(), {
        method: 'GET',
        credentials: 'include', // Important: include HTTP-only cookies
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Handle 401 - attempt refresh
      if (response.status === 401) {
        if (import.meta.env.DEV) {
          console.log('🔄 Access token expired, attempting refresh...');
        }
        
        const refreshResponse = await fetch(API_URLS.refresh(), {
          method: 'POST',
          credentials: 'include', // Important: include refresh token cookie
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (refreshResponse.ok) {
          if (import.meta.env.DEV) {
            console.log('✅ Token refresh successful, retrying user verification...');
          }
          
          // Refresh successful, try user verification again
          response = await fetch(API_URLS.me(), {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          });
        } else {
          if (import.meta.env.DEV) {
            console.log('❌ Token refresh failed with status:', refreshResponse.status);
          }
          this.verificationCache = { user: null, timestamp: Date.now() };
          return null;
        }
      }

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
        if (import.meta.env.DEV) {
          console.log('❌ User verification failed with status:', response.status);
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
    const isAdmin = normalizedRole === 'role.admin' || normalizedRole === 'role.administrator';

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

  // Check if user appears to be authenticated (quick cache check)
  static hasToken(): boolean {
    // Since tokens are HTTP-only, we can't check them directly
    // Use cache as a quick indicator
    if (this.verificationCache && (Date.now() - this.verificationCache.timestamp) < this.CACHE_TTL) {
      return this.verificationCache.user !== null;
    }
    
    // No reliable way to check without API call
    return false;
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
      try {
        const errorData = await response.json();
        
        // Preserve the API error structure for proper error handling
        if (errorData.detail?.error_code) {
          // Throw error with the same structure as API response
          throw {
            response: {
              data: errorData
            }
          };
        } else {
          // Fallback for old error format
          let errorMessage = 'Registration failed';
          
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
          
          throw new Error(errorMessage);
        }
      } catch (error) {
        // If parsing JSON fails, throw a generic error
        if (error.response) {
          // Re-throw the structured error
          throw error;
        } else {
          throw new Error(`Server error (${response.status}): ${response.statusText}`);
        }
      }
    }
    
    const data: RegisterResponse = await response.json();
    return data;
  }

  // Helper method for authenticated requests (using HTTP-only cookies)
  static async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const authOptions: RequestInit = {
      ...options,
      credentials: 'include', // Important: include HTTP-only cookies
      headers: {
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
      const errorData = await response.json();

      const translation_code = errorData.detail.translation_code;
      if (import.meta.env.DEV) {
        console.error('Error verifying email:', errorData);
      }
      throw new Error(translation_code);
    }

    const data: VerifyEmailResponse = await response.json();
    
    // If verification is successful and includes user data, cache it
    if (data.success && data.data?.user) {
      this.verificationCache = { user: data.data.user, timestamp: Date.now() };
    }
    
    return data;
  }

  static async resendVerification(email: string, language?: string): Promise<ResendVerificationResponse> {
    if (import.meta.env.DEV) {
      console.log('🔥 AdminAuth.resendVerification called with:', { email, language });
      console.log('🌐 API URL:', API_URLS.resendVerification());
    }
    
    const response = await fetch(API_URLS.resendVerification(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, language }),
    });

    if (import.meta.env.DEV) {
      console.log('📡 Response status:', response.status, response.statusText);
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.log('🔍 Error data received:', errorData);

      const translation_code = errorData.detail.translation_code;
      const errorType = errorData.detail.type;

      if (import.meta.env.DEV) {
        console.error('Error verifying email:', errorData);
      }
      
      // Special handling for EMAIL_ALREADY_VERIFIED - treat as info, not error
      if (translation_code === 'EMAIL_ALREADY_VERIFIED' && errorType === 'info') {
        console.log('📧 Email already verified - treating as info message');
        // Create a custom error object with type info
        const infoError = new Error(translation_code) as Error & { type: string };
        infoError.type = 'info';
        throw infoError;
      }
      
      throw new Error(translation_code);
    }
    
    const data: ResendVerificationResponse = await response.json();
    return data;
  }

  // Check session (alias for verifyUser) - used by admin pages
  static async checkSession(skipCache = false): Promise<User | null> {
    return this.verifyUser(skipCache);
  }

  // Update user profile
  static async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await fetch(API_URLS.updateProfile(), {
      method: 'PUT',
      credentials: 'include', // Important: include HTTP-only cookies
      headers: {
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
    const response = await fetch(API_URLS.updatePassword(), {
      method: 'PUT',
      credentials: 'include', // Important: include HTTP-only cookies
      headers: {
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
    const response = await fetch(API_URLS.deleteAccount(), {
      method: 'DELETE',
      credentials: 'include', // Important: include HTTP-only cookies
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to delete account');
    }

    // Clear cache - HTTP-only cookies are cleared by server
    this.verificationCache = null;
  }

  // Password Reset Request
  static async requestPasswordReset(email: string, language?: string): Promise<PasswordResetResponse> {
    if (import.meta.env.DEV) {
      console.log('AdminAuth.requestPasswordReset called with:', { email, language });
      console.log('API_URLS.passwordResetRequest():', API_URLS.passwordResetRequest());
    }
    
    const response = await fetch(API_URLS.passwordResetRequest(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, language }),
    });

    if (import.meta.env.DEV) {
      console.log('Response received:', response.status, response.statusText);
    }

    if (!response.ok) {
      try {
        const errorData = await response.json();
        if (import.meta.env.DEV) {
          console.log('Error data received:', errorData);
        }
        
        // Preserve the API error structure for proper error handling - same as login/register
        if (errorData.detail?.error_code || errorData.detail?.translation_code) {
          if (import.meta.env.DEV) {
            console.log('Found translation_code or error_code, throwing structured error');
          }
          // Throw error with the same structure as API response
          throw {
            response: {
              data: errorData
            }
          };
        } else {
          // Fallback for old error format
          let errorMessage = 'Failed to send password reset email';
          
          // Handle specific HTTP status codes
          if (response.status === 429) {
            errorMessage = errorData.detail || 'Too many password reset attempts. Please wait before trying again.';
          } else if (response.status === 400) {
            // Check if it's specifically about email verification
            if (errorData.detail && errorData.detail.toLowerCase().includes('not verified')) {
              errorMessage = 'Your email address has not been verified yet. Please verify your email before resetting your password.';
            } else {
              errorMessage = errorData.detail || 'Email address not verified or invalid request.';
            }
          } else if (response.status === 404) {
            // More specific message for non-existent email
            errorMessage = 'Email address not found. Please check your email and try again.';
          } else if (response.status === 422) {
            errorMessage = errorData.detail || 'Invalid request format.';
          } else {
            errorMessage = errorData.detail || errorData.message || `Server error (${response.status})`;
          }
          
          throw new Error(errorMessage);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.log('Error parsing response or re-throwing structured error:', error);
        }
        // If parsing JSON fails, throw a generic error
        if (error.response) {
          // Re-throw the structured error
          throw error;
        } else {
          throw new Error(`Server error (${response.status}): ${response.statusText}`);
        }
      }
    }

    const data: PasswordResetResponse = await response.json();
    return data;
  }

  // Password Reset Confirmation
  static async confirmPasswordReset(email: string, resetToken: string, newPassword: string): Promise<PasswordResetConfirmResponse> {
    const response = await fetch(API_URLS.passwordResetConfirm(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email, 
        reset_token: resetToken, 
        new_password: newPassword 
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to reset password';
      
      try {
        const errorData = await response.json();
        
        // Handle specific HTTP status codes
        if (response.status === 429) {
          errorMessage = errorData.detail || 'Too many password reset attempts. Please try again later.';
        } else if (response.status === 400) {
          errorMessage = errorData.detail || 'Invalid reset token or email.';
        } else if (response.status === 404) {
          errorMessage = errorData.detail || 'Reset token expired or invalid.';
        } else if (response.status === 422) {
          errorMessage = errorData.detail || 'Invalid password format or request data.';
        } else {
          errorMessage = errorData.detail || errorData.message || `Server error (${response.status})`;
        }
      } catch {
        errorMessage = `Server error (${response.status}): ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    const data: PasswordResetConfirmResponse = await response.json();
    return data;
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
