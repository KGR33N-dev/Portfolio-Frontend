import { AdminAuth } from '../utils/adminAuth';
import { API_URLS } from '../config/api';

declare global {
  interface Window {
    AdminAuth: typeof AdminAuth;
    API_URLS: typeof API_URLS;
  }
}

interface DashboardTranslations {
  loadingPosts: string;
  noPostsYet: string;
  errorLoadingData: string;
  connected: string;
  disconnected: string;
  published: string;
  draft: string;
  edit: string;
  checking: string;
}

interface Post {
  id: number;
  title: string;
  slug: string;
  is_published: boolean;
  created_at: string;
  language?: string;
}

interface DashboardData {
  posts?: Post[];
  items?: Post[];
}

export class DashboardManager {
  private translations: DashboardTranslations;
  private isDev: boolean;

  constructor(translations: DashboardTranslations, isDev: boolean = false) {
    this.translations = translations;
    this.isDev = isDev;
  }

  async init(): Promise<void> {
    if (this.isDev) console.log('Dashboard: Starting initialization');
    
    // Check auth first via HTTP-only cookies
    try {
      const user = await AdminAuth.verifyUser();
      if (!user || !AdminAuth.isUserAdmin(user)) {
        this.showAccessDenied();
        return;
      }

      if (this.isDev) console.log('Dashboard: Auth verified, loading data');
      
      // Load dashboard data once
      await this.loadDashboardData();
      
      // Setup navigation buttons
      this.setupButtons();
      
      // Check API status
      this.checkAPIStatus();
      
    } catch (error) {
      if (this.isDev) console.error('Dashboard init failed:', error);
      this.redirectToLogin();
    }
  }

  private async loadDashboardData(): Promise<void> {
    try {
      if (this.isDev) {
        console.log('🔄 Loading dashboard data...');
        console.log('🎯 Using endpoint:', API_URLS.getAdminPosts({ status: 'all', per_page: 100 }));
      }
      
      // Load ALL posts (published and drafts) for admin dashboard using authenticated admin endpoint
      const response = await AdminAuth.makeAuthenticatedRequest(
        API_URLS.getAdminPosts({ status: 'all', per_page: 100 })
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        if (this.isDev) {
          console.error('❌ API Response failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          });
        }
        throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
      }
      
      const data: DashboardData = await response.json();
      const posts = data.posts || data.items || (Array.isArray(data) ? data : []) as Post[];
      
      if (this.isDev) {
        console.log('📊 Dashboard data loaded successfully:', {
          dataStructure: Object.keys(data),
          postsCount: posts.length,
          samplePost: posts[0] ? {
            id: posts[0].id,
            title: posts[0].title,
            slug: posts[0].slug,
            is_published: posts[0].is_published,
            created_at: posts[0].created_at,
            language: posts[0].language
          } : 'No posts found'
        });
      }
      
      // Update stats
      this.updateStats(posts);
      
      // Show recent drafts (filter unpublished posts and show first 5)
      const draftPosts = posts.filter(post => !post.is_published);
      this.showDrafts(draftPosts.slice(0, 5));
      
      // Show all posts
      this.showAllPosts(posts);
      
    } catch (error) {
      if (this.isDev) console.error('❌ Failed to load dashboard data:', error);
      this.showError();
    }
  }

  private updateStats(posts: Post[]): void {
    const total = posts.length;
    const published = posts.filter(p => p.is_published).length;
    const drafts = total - published;

    const totalElement = document.getElementById('total-posts');
    const publishedElement = document.getElementById('published-posts');
    const draftElement = document.getElementById('draft-posts');
    
    if (totalElement) totalElement.textContent = total.toString();
    if (publishedElement) publishedElement.textContent = published.toString();
    if (draftElement) draftElement.textContent = drafts.toString();
    
    // If any elements are missing, log warning
    if (!totalElement || !publishedElement || !draftElement) {
      if (this.isDev) console.warn('Some stats elements not found in DOM');
    }
  }

  private showDrafts(drafts: Post[]): void {
    const container = document.getElementById('draft-posts-list');
    if (!container) return;

    if (drafts.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-600 dark:text-gray-400">${this.translations.noPostsYet}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = drafts.map(post => `
      <div class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
        <div>
          <h4 class="font-medium text-gray-900 dark:text-white">${post.title || 'Untitled'}</h4>
          <p class="text-sm text-gray-600 dark:text-gray-400">${new Date(post.created_at).toLocaleDateString()}</p>
        </div>
        <button onclick="editPost(${post.id})" class="text-blue-600 hover:text-blue-800 text-sm">
          ${this.translations.edit}
        </button>
      </div>
    `).join('');
  }

  private showAllPosts(posts: Post[]): void {
    const container = document.getElementById('all-posts-list');
    if (!container) return;

    if (posts.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-600 dark:text-gray-400">${this.translations.noPostsYet}</p>
        </div>
      `;
      return;
    }

    if (this.isDev) {
      console.log('📄 Rendering all posts:', posts.map(post => ({id: post.id, title: post.title, published: post.is_published})));
    }

    container.innerHTML = posts.map(post => {
      if (!post.id) {
        console.error('❌ Post missing ID:', post);
        return '';
      }
      return `
        <div class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900 dark:text-white">${post.slug || 'No slug'}</h4>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Title: ${post.title || 'Untitled'} • ${new Date(post.created_at).toLocaleDateString()}
            </p>
          </div>
          <div class="flex items-center space-x-3">
            <span class="px-2 py-1 text-xs font-medium ${post.is_published 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
            } rounded-full">
              ${post.is_published ? this.translations.published : this.translations.draft}
            </span>
            <button onclick="editPost(${post.id})" class="text-blue-600 hover:text-blue-800 text-sm">
              ${this.translations.edit}
            </button>
            <button onclick="deletePost(${post.id})" class="text-red-600 hover:text-red-800 text-sm">
              Delete
            </button>
          </div>
        </div>
      `;
    }).filter(html => html !== '').join('');
  }

  private setupButtons(): void {
    const newPostBtn = document.getElementById('new-post-btn');
    const languagesBtn = document.getElementById('languages-btn');
    const settingsBtn = document.getElementById('settings-btn');

    if (newPostBtn) {
      newPostBtn.onclick = () => {
        const currentLang = window.location.pathname.split('/')[1];
        window.location.href = `/${currentLang}/admin/create-post`;
      };
    }

    if (languagesBtn) {
      languagesBtn.onclick = () => {
        const currentLang = window.location.pathname.split('/')[1];
        window.location.href = `/${currentLang}/admin/languages`;
      };
    }

    if (settingsBtn) {
      settingsBtn.onclick = () => {
        const currentLang = window.location.pathname.split('/')[1];
        window.location.href = `/${currentLang}/account`;
      };
    }
  }

  private async checkAPIStatus(): Promise<void> {
    const icon = document.getElementById('api-status-icon');
    const text = document.getElementById('api-status-text');
    
    try {
      const response = await fetch(API_URLS.health());
      if (response.ok) {
        if (icon) icon.className = 'w-3 h-3 rounded-full bg-green-500 mr-2';
        if (text) {
          text.textContent = this.translations.connected;
          text.className = 'text-sm font-medium text-green-600 ml-1';
        }
      } else {
        throw new Error('API not responding');
      }
    } catch (error) {
      if (this.isDev) console.error('API status check failed:', error);
      if (icon) icon.className = 'w-3 h-3 rounded-full bg-red-500 mr-2';
      if (text) {
        text.textContent = this.translations.disconnected;
        text.className = 'text-sm font-medium text-red-600 ml-1';
      }
    }
  }

  private showAccessDenied(): void {
    const element = document.getElementById('access-denied');
    if (element) {
      element.classList.remove('hidden');
    }
    
    // Hide main content
    const mainContent = document.getElementById('dashboard-content');
    if (mainContent) {
      mainContent.style.display = 'none';
    }
  }

  private redirectToLogin(): void {
    const currentLang = window.location.pathname.split('/')[1];
    window.location.href = `/${currentLang}/login`;
  }

  private showError(): void {
    // Show error in all posts container
    const container = document.getElementById('all-posts-list');
    if (container) {
      container.innerHTML = `
        <div class="text-center py-8">
          <p class="text-red-600 dark:text-red-400">${this.translations.errorLoadingData}</p>
        </div>
      `;
    }
  }

  // Notification helper functions
  private showInfo(message: string): void {
    // Simple console log for now - can be enhanced with toast notifications later
    console.info('Dashboard Info:', message);
  }

  private showSuccess(message: string): void {
    // Simple console log for now - can be enhanced with toast notifications later
    console.info('Dashboard Success:', message);
  }

  private showErrorNotification(message: string): void {
    // Simple console log for now - can be enhanced with toast notifications later
    console.error('Dashboard Error:', message);
  }
}

// Global functions for post actions (called from HTML onclick)
declare global {
  function editPost(postId: number): void;
  function deletePost(postId: number): Promise<void>;
}

window.editPost = function(postId: number): void {
  const currentLang = window.location.pathname.split('/')[1];
  window.location.href = `/${currentLang}/admin/edit-post/${postId}`;
};

window.deletePost = async function(postId: number): Promise<void> {
  if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
    try {
      // Show loading state
      const button = document.querySelector(`button[onclick="deletePost(${postId})"]`) as HTMLButtonElement;
      if (button) {
        button.disabled = true;
        button.textContent = 'Deleting...';
        button.classList.add('opacity-50');
      }

      // Make delete request
      const response = await AdminAuth.makeAuthenticatedRequest(
        API_URLS.deletePost(postId),
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete post: ${response.status} ${response.statusText}`);
      }

      // Success - refresh the page to update the dashboard
      window.location.reload();

    } catch (error) {
      console.error('Error deleting post:', error);
      
      // Restore button state
      const button = document.querySelector(`button[onclick="deletePost(${postId})"]`) as HTMLButtonElement;
      if (button) {
        button.disabled = false;
        button.textContent = 'Delete';
        button.classList.remove('opacity-50');
      }
      
      alert('Failed to delete post. Please try again.');
    }
  }
};
