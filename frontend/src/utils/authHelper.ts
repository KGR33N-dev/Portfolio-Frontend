// Authentication Helper - Universal authentication functions
// Provides unified authentication logic for both AdminAuth and Comments system

import { API_URLS } from '../config/api.ts';

// Types
interface User {
  id: number;
  email: string;
  username: string | null;
  role?: {
    id: number;
    name: string;
    display_name: string;
    color: string;
  };
  rank?: {
    id: number;
    name: string;
    display_name: string;
    icon: string;
  };
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface ApiRequestOptions extends RequestInit {
  skipRefresh?: boolean; // Skip automatic refresh on 401
}

// Universal authentication class
export class AuthHelper {
  private static userCache: { user: User | null; timestamp: number } | null = null;
  private static readonly CACHE_TTL = 5000; // 5 seconds cache
  private static isRefreshing = false; // Prevent multiple concurrent refresh attempts
  private static refreshPromise: Promise<boolean> | null = null;

  /**
   * Make an authenticated API request with automatic token refresh
   */
  static async makeAuthenticatedRequest(url: string, options: ApiRequestOptions = {}): Promise<Response> {
    const { skipRefresh = false, ...fetchOptions } = options;
    
    // Prepare request with HTTP-only cookies
    const requestOptions: RequestInit = {
      ...fetchOptions,
      credentials: 'include', // Always include HTTP-only cookies
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    };

    // Add Bearer token if available (for backward compatibility)
    const token = localStorage.getItem('access_token');
    if (token && requestOptions.headers) {
      (requestOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    // Make the initial request
    let response = await fetch(url, requestOptions);

    // Handle 401 - attempt refresh if not skipped
    if (response.status === 401 && !skipRefresh) {
      const refreshSuccess = await this.refreshToken();
      
      if (refreshSuccess) {
        // Retry the request after successful refresh
        const retryToken = localStorage.getItem('access_token');
        if (retryToken && requestOptions.headers) {
          (requestOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${retryToken}`;
        }
        response = await fetch(url, requestOptions);
      }
    }

    return response;
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(): Promise<boolean> {
    // If already refreshing, wait for the existing promise
    if (this.isRefreshing && this.refreshPromise) {
      return await this.refreshPromise;
    }

    // Start new refresh process
    this.isRefreshing = true;
    this.refreshPromise = this._performRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Internal refresh logic
   */
  private static async _performRefresh(): Promise<boolean> {
    try {
      if (import.meta.env.DEV) {
        console.log('🔄 AuthHelper: Attempting token refresh...');
      }

      const response = await fetch(API_URLS.refresh(), {
        method: 'POST',
        credentials: 'include', // Include refresh token cookie
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (import.meta.env.DEV) {
          console.log('✅ AuthHelper: Token refresh successful');
        }

        // Clear user cache to force fresh verification
        this.userCache = null;
        
        // Update localStorage token if provided (for backward compatibility)
        if (data.access_token) {
          localStorage.setItem('access_token', data.access_token);
        }

        return true;
      } else {
        if (import.meta.env.DEV) {
          console.log('❌ AuthHelper: Token refresh failed with status:', response.status);
        }

        // Clear invalid tokens
        localStorage.removeItem('access_token');
        this.userCache = { user: null, timestamp: Date.now() };
        
        return false;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ AuthHelper: Token refresh error:', error);
      }
      
      // Clear tokens on error
      localStorage.removeItem('access_token');
      this.userCache = { user: null, timestamp: Date.now() };
      
      return false;
    }
  }

  /**
   * Get current user with caching and automatic refresh
   */
  static async getCurrentUser(skipCache = false): Promise<User | null> {
    // Check cache first
    if (!skipCache && this.userCache) {
      const age = Date.now() - this.userCache.timestamp;
      if (age < this.CACHE_TTL) {
        if (import.meta.env.DEV) {
          console.log('🎯 AuthHelper: Using cached user verification (age: ' + Math.round(age/1000) + 's)');
        }
        return this.userCache.user;
      }
    }

    try {
      if (import.meta.env.DEV) {
        console.log('🔍 AuthHelper: Verifying user with API...');
      }

      const response = await this.makeAuthenticatedRequest(API_URLS.me(), {
        method: 'GET'
      });

      if (response.ok) {
        const userData = await response.json();
        
        if (import.meta.env.DEV) {
          console.log('✅ AuthHelper: User verified:', userData.email);
        }
        
        this.userCache = { user: userData, timestamp: Date.now() };
        return userData;
      } else {
        if (import.meta.env.DEV) {
          console.log('❌ AuthHelper: User verification failed with status:', response.status);
        }
        
        this.userCache = { user: null, timestamp: Date.now() };
        return null;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ AuthHelper: Error verifying user:', error);
      }
      
      this.userCache = { user: null, timestamp: Date.now() };
      return null;
    }
  }

  /**
   * Check if user is authenticated (quick cache check)
   */
  static isAuthenticated(): boolean {
    if (this.userCache && (Date.now() - this.userCache.timestamp) < this.CACHE_TTL) {
      return this.userCache.user !== null;
    }
    return false;
  }

  /**
   * Clear authentication cache
   */
  static clearCache(): void {
    this.userCache = null;
  }

  /**
   * Logout - clear tokens and cache
   */
  static async logout(): Promise<void> {
    try {
      // Call backend logout endpoint
      await fetch(API_URLS.logout(), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('AuthHelper: Logout request failed, but continuing with cleanup:', error);
      }
    }
    
    // Clear local state
    localStorage.removeItem('access_token');
    this.userCache = null;
  }
}

// Export types for use in other modules
export type { User, ApiRequestOptions };
