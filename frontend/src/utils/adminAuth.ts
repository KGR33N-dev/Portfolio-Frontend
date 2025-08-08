import { API_CONFIG, API_URLS } from '~/config/api';
import type { CreatePostData, ApiPost } from '~/types/blog';

// Types for better TypeScript support
interface User {
  id: number;
  email: string;
  username?: string; // Dodajemy opcjonalne pole username
  full_name?: string; // Dodajemy opcjonalne pole full_name
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

// interface VerifyEmailRequest {
//   email: string;
//   code: string;
// }

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
      const response = await this.makeAuthenticatedRequest(API_URLS.me());
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
  static async createPost(postData: CreatePostData): Promise<ApiPost> {
    const response = await AdminAuth.makeAuthenticatedRequest(
      API_URLS.createPost(),
      {
        method: 'POST',
        body: JSON.stringify(postData),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to create post: ${errorData}`);
    }
    
    return response.json();
  }
  
  static async updatePost(postId: number, postData: Partial<CreatePostData>): Promise<ApiPost> {
    const response = await AdminAuth.makeAuthenticatedRequest(
      API_URLS.updatePost(postId),
      {
        method: 'PUT',
        body: JSON.stringify(postData),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to update post: ${errorData}`);
    }
    
    return response.json();
  }
  
  static async publishPost(postId: number): Promise<ApiPost> {
    const response = await AdminAuth.makeAuthenticatedRequest(
      API_URLS.publishPost(postId),
      {
        method: 'PUT',
      }
    );
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to publish post: ${errorData}`);
    }
    
    return response.json();
  }
  
  static async unpublishPost(postId: number): Promise<ApiPost> {
    const response = await AdminAuth.makeAuthenticatedRequest(
      API_URLS.unpublishPost(postId),
      {
        method: 'PUT',
      }
    );
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to unpublish post: ${errorData}`);
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
      const errorData = await response.text();
      throw new Error(`Failed to delete post: ${errorData}`);
    }
  }
  
  static async getAllPosts(params?: { status?: 'all' | 'published' | 'draft' }): Promise<ApiPost[]> {
    const queryParams = new URLSearchParams();
    if (params?.status && params.status !== 'all') {
      if (params.status === 'published') {
        queryParams.append('published', 'true');
      } else if (params.status === 'draft') {
        queryParams.append('published', 'false');
      }
    }
    
    const url = params ? `${API_URLS.getAdminPosts()}?${queryParams.toString()}` : API_URLS.getAdminPosts();
    const response = await AdminAuth.makeAuthenticatedRequest(url);
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to fetch posts: ${errorData}`);
    }
    
    const data = await response.json();
    return data.items || data; // Handle both paginated and simple array responses
  }
  
  // Helper function to create a sample multilingual post
  static async createSamplePost(): Promise<ApiPost> {
    const samplePostData: CreatePostData = {
      slug: 'sample-multilingual-post',
      author: 'KGR33N',
      category: 'gamedev',
      featured_image: 'https://via.placeholder.com/800x400/4f46e5/ffffff?text=Sample+Post',
      tags: ['javascript', 'astro', 'multilingual'],
      translations: [
        {
          language_code: 'en',
          title: 'Welcome to the new multilingual blog!',
          content: `# Welcome to our new multilingual blog system!

This is a sample post to demonstrate the new multilingual functionality. You can now create posts in multiple languages and display them based on the user's language preference.

## Features:
- **Multilingual support**: Posts can have translations in multiple languages
- **Language detection**: Automatic language detection and fallback
- **SEO optimization**: Meta titles and descriptions per language
- **Easy management**: Create and manage translations from the admin panel

This post demonstrates how the new system works. You can edit this post or create new ones from the admin dashboard.`,
          excerpt: 'A sample post demonstrating the new multilingual blog functionality.',
          meta_title: 'Welcome to Multilingual Blog - Sample Post',
          meta_description: 'Discover how our new multilingual blog system works with this sample post.'
        },
        {
          language_code: 'pl',
          title: 'Witamy w nowym wielojęzycznym blogu!',
          content: `# Witamy w naszym nowym wielojęzycznym systemie blogowym!

To jest przykładowy post demonstrujący nową funkcjonalność wielojęzyczną. Teraz możesz tworzyć posty w wielu językach i wyświetlać je na podstawie preferencji językowych użytkownika.

## Funkcje:
- **Wsparcie wielojęzyczne**: Posty mogą mieć tłumaczenia w wielu językach
- **Wykrywanie języka**: Automatyczne wykrywanie języka i fallback
- **Optymalizacja SEO**: Meta tytuły i opisy dla każdego języka
- **Łatwe zarządzanie**: Tworzenie i zarządzanie tłumaczeniami z panelu admina

Ten post pokazuje jak działa nowy system. Możesz edytować ten post lub utworzyć nowe z panelu administracyjnego.`,
          excerpt: 'Przykładowy post demonstrujący nową funkcjonalność wielojęzycznego bloga.',
          meta_title: 'Witamy w Wielojęzycznym Blogu - Przykładowy Post',
          meta_description: 'Odkryj jak działa nasz nowy wielojęzyczny system blogowy dzięki temu przykładowemu postowi.'
        }
      ]
    };
    
    return this.createPost(samplePostData);
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

// Make AdminAuth available globally for script tags
if (typeof window !== 'undefined') {
  (window as typeof window & { AdminAuth: typeof AdminAuth }).AdminAuth = AdminAuth;
}
