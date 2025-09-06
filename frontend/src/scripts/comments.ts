import { AdminAuth } from '../utils/adminAuth.ts';
import { AuthHelper } from '../utils/authHelper.ts';
import { notifications } from '../utils/notifications.ts';
import { DebouncedLikes, handleLikeDislike, disableOwnCommentButtons } from './likes.ts';
import { handleSubmitComment } from './comment-submission.ts';
import { handleReply } from './comment-replies.ts';
import { showEditForm, handleEditSubmit, cancelEdit } from './comment-edit.ts';

interface Comment {
  id: number;
  postId?: number;
  post_id?: number; // API uses snake_case
  author: string | {
    id: number;
    username: string;
    role?: {
      id: number;
      name: string;
      display_name: string;
      color: string;
      level: number;
    };
    rank?: {
      id: number;
      name: string;
      display_name: string;
      color: string;
      level: number;
      icon: string;
    };
  };
  email?: string;
  website?: string;
  content: string;
  parentId?: number | null;
  parent_id?: number | null; // API uses snake_case
  createdAt?: string;
  created_at?: string; // API uses snake_case
  updatedAt?: string;
  updated_at?: string; // API uses snake_case
  approved?: boolean;
  likes?: number;
  likes_count?: number; // API uses snake_case
  dislikes?: number;
  dislikes_count?: number; // API uses snake_case
  userLikeStatus?: boolean | null; // true = liked, false = disliked, null = no action
  user_like_status?: boolean | null; // API uses snake_case
  authorId?: number;
  user_id?: number; // API uses snake_case
  canEdit?: boolean;
  can_edit?: boolean; // API uses snake_case
  canDelete?: boolean;
  can_delete?: boolean; // API uses snake_case
  replies?: Comment[];
  replies_count?: number;
  is_deleted?: boolean;
}

interface User {
  id: number;
  username: string;
  email: string;
  rank?: string | {
    id: number;
    name: string;
    display_name: string;
    icon: string;
    color: string;
    level: number;
  } | null;
}

interface CommentsResponse {
  items?: Comment[];
  comments?: Comment[];
  results?: Comment[];
  total?: number;
  count?: number;
}

interface Translations {
  [key: string]: string;
}

interface ApiUrls {
  getPostComments: string;
  createPostComment: string;
  likeCommentTemplate: string;
  updateCommentTemplate: string;
  deleteCommentTemplate: string;
}

export class EnhancedCommentsManager {
  private postId: string | null = null;
  private lang: string = 'en';
  private translations: Translations = {};
  private apiUrls: ApiUrls;
  private isDev: boolean = false;
  private currentUser: User | null = null;
  private isInitialized: boolean = false;
  private isLoadingComments: boolean = false;
  private debouncedLikes: DebouncedLikes;
  
  // Pagination properties - now using server-side pagination
  private allComments: Comment[] = [];
  private commentsPerPage: number = 20; // API returns 20 comments per page
  private currentPage: number = 1;
  private hasMoreComments: boolean = false;
  private totalComments: number = 0;

  constructor(postId: string, lang: string, translations: Translations, apiUrls: ApiUrls, isDev: boolean = false) {
    this.postId = postId;
    this.lang = lang;
    this.translations = translations;
    this.apiUrls = apiUrls;
    this.isDev = isDev;
    this.debouncedLikes = new DebouncedLikes();
    
    if (import.meta.env.DEV) {
      if (import.meta.env.DEV) console.log('🚀 EnhancedCommentsManager constructor:', {
        postId: this.postId,
        lang: this.lang,
        apiUrls: this.apiUrls,
        isDev: this.isDev
      });
    }
    
    this.init();
  }

  private async init(): Promise<void> {
    if (this.isDev) {
      if (import.meta.env.DEV) console.log('🔄 Initializing comments system...', {
        readyState: document.readyState,
        hasCommentsContainer: !!document.getElementById('comments-list')
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        if (this.isDev) if (import.meta.env.DEV) console.log('📄 DOM loaded, starting setup...');
        this.setup();
      });
    } else {
      if (this.isDev) if (import.meta.env.DEV) console.log('📄 DOM already loaded, starting setup immediately...');
      this.setup();
    }
  }

  private async setup(): Promise<void> {
    if (this.isInitialized) return;
    
    await this.initComments();
    this.setupEventListeners();
    this.isInitialized = true;
  }

  private async initComments(): Promise<void> {
    if (this.isDev) if (import.meta.env.DEV) console.log('🚀 Initializing enhanced comments system...');
    
    // Check if required HTML elements exist
    const loginPrompt = document.getElementById('login-prompt');
    const commentForm = document.getElementById('comment-form');
    const commentsContainer = document.getElementById('comments-list');
    
    if (this.isDev) {
      if (import.meta.env.DEV) console.log('🔍 Required HTML elements check:', {
        loginPrompt: !!loginPrompt,
        commentForm: !!commentForm,
        commentsContainer: !!commentsContainer
      });
    }
    
    if (!commentsContainer) {
      console.warn('⚠️ Comments container not found - skipping comments initialization');
      return;
    }
    
    try {
      // Check auth but don't let it block comments loading
      await this.checkAuth();
      
      // Always load comments regardless of auth status
      await this.loadComments();
      
      if (this.isDev) if (import.meta.env.DEV) console.log('✅ Comments system initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize comments:', error);
      // Even if there's an error, try to show the login prompt
      this.updateAuthUI();
      // And still try to load comments (they might be public)
      try {
        await this.loadComments();
      } catch (loadError) {
        console.error('❌ Failed to load comments:', loadError);
        this.showError(this.translations['comments.loadError'] || 'Failed to load comments');
      }
    }
  }

  private async checkAuth(): Promise<void> {
    if (import.meta.env.DEV) console.log('🔐 Checking authentication...');
    
    try {
      // Use AdminAuth.verifyUser() to check session via HTTP-only cookies
      if (typeof AdminAuth !== 'undefined' && AdminAuth.verifyUser) {
        if (import.meta.env.DEV) console.log('🔐 Using AdminAuth.verifyUser()...');
        const userData = await AdminAuth.verifyUser();
        if (userData && userData.id) {
          this.currentUser = userData;
          if (import.meta.env.DEV) console.log('✅ User authenticated via AdminAuth:', userData.username);
          this.updateAuthUI();
          return;
        }
        if (import.meta.env.DEV) console.log('❌ AdminAuth.verifyUser() returned null');
      }

      // Fallback: direct API call with credentials using AuthHelper
      if (import.meta.env.DEV) console.log('🔐 Trying direct API call to backend auth endpoint...');
      const { API_CONFIG } = await import('../config/api.ts');
      const response = await AuthHelper.makeAuthenticatedRequest(`${API_CONFIG.auth}/me`);

      if (import.meta.env.DEV) console.log('📥 Auth response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        this.currentUser = await response.json();
        if (import.meta.env.DEV) console.log('✅ User authenticated via direct API:', this.currentUser?.username);
      } else {
        // Try to get error details
        let errorText = '';
        try {
          const errorData = await response.json();
          errorText = errorData.detail || errorData.message || response.statusText;
          if (import.meta.env.DEV) console.log('❌ Auth error details:', errorData);
        } catch (parseError) {
          errorText = response.statusText;
          if (import.meta.env.DEV) console.log('❌ Could not parse error response:', parseError);
        }
        
        this.currentUser = null;
        if (import.meta.env.DEV) console.log(`ℹ️ User not authenticated - ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      this.currentUser = null;
      if (import.meta.env.DEV) console.log('ℹ️ Auth check failed - user will see login prompt');
    }

    // Always update UI regardless of auth status
    this.updateAuthUI();
  }

  private updateAuthUI(): void {
    if (this.isDev) {
      if (import.meta.env.DEV) console.log('🎨 updateAuthUI: Current user:', this.currentUser ? this.currentUser.username : 'null');
    }

    const loginPrompt = document.getElementById('login-prompt');
    const commentForm = document.getElementById('comment-form');
    const userAvatarLetter = document.getElementById('user-avatar-letter');

    if (this.isDev) {
      if (import.meta.env.DEV) console.log('🔍 updateAuthUI: Found elements:', {
        loginPrompt: !!loginPrompt,
        commentForm: !!commentForm,
        userAvatarLetter: !!userAvatarLetter
      });
    }

    if (this.currentUser) {
      // User is logged in
      if (loginPrompt) {
        loginPrompt.style.display = 'none';
        if (this.isDev) if (import.meta.env.DEV) console.log('✅ Hidden login prompt');
      } else if (this.isDev) {
        console.warn('⚠️ Login prompt element not found');
      }
      
      if (commentForm) {
        commentForm.style.display = 'block';
        if (this.isDev) if (import.meta.env.DEV) console.log('✅ Shown comment form');
      } else if (this.isDev) {
        console.warn('⚠️ Comment form element not found');
      }
      
      if (userAvatarLetter) {
        const letter = this.currentUser.username ? 
          this.currentUser.username.charAt(0).toUpperCase() : 
          this.currentUser.email ? 
          this.currentUser.email.charAt(0).toUpperCase() : 
          'U';
        userAvatarLetter.textContent = letter;
        if (this.isDev) if (import.meta.env.DEV) console.log('✅ Set avatar letter:', letter);
      } else if (this.isDev) {
        console.warn('⚠️ User avatar letter element not found');
      }
    } else {
      // User not logged in
      if (loginPrompt) {
        loginPrompt.style.display = 'block';
        if (this.isDev) if (import.meta.env.DEV) console.log('✅ Shown login prompt');
      } else if (this.isDev) {
        console.warn('⚠️ Login prompt element not found - cannot show login message');
      }
      
      if (commentForm) {
        commentForm.style.display = 'none';
        if (this.isDev) if (import.meta.env.DEV) console.log('✅ Hidden comment form');
      } else if (this.isDev) {
        console.warn('⚠️ Comment form element not found');
      }
    }

    if (this.isDev) {
      if (import.meta.env.DEV) console.log('🎨 updateAuthUI: Auth UI updated successfully');
    }
  }

  private setupEventListeners(): void {
    // Remove any existing event listeners first to prevent duplicates
    const commentForm = document.getElementById('comment-form') as HTMLFormElement;
    if (commentForm) {
      // Clone the form to remove all event listeners
      const newForm = commentForm.cloneNode(true) as HTMLFormElement;
      commentForm.parentNode?.replaceChild(newForm, commentForm);
      
      // Add our event listener to the new form
      newForm.addEventListener('submit', (e) => 
        handleSubmitComment(
          e, 
          this.postId!, 
          this.currentUser, 
          this.translations, 
          this.apiUrls, 
          this.showError.bind(this), 
          this.showSuccess.bind(this), 
          this.loadComments.bind(this), 
          this.addRealComment.bind(this),
          this.isDev
        )
      );
      
      if (this.isDev) {
        if (import.meta.env.DEV) console.log('📝 Comment form event listener attached');
      }
    }

    // Comment actions (like, dislike, reply, edit, delete)
    // Note: Using document delegation, so no need to clone
    document.addEventListener('click', (e) => this.handleCommentActions(e));

    // Handle character count in edit textareas
    document.addEventListener('input', (e) => {
      const target = e.target as HTMLTextAreaElement;
      if (target.id === 'edit-textarea') {
        const commentId = target.closest('[data-comment-id]')?.getAttribute('data-comment-id');
        if (commentId) {
          const charCount = document.getElementById(`char-count-${commentId}`);
          if (charCount) {
            const count = target.value.length;
            charCount.textContent = `${count}/2000`;
            charCount.className = count > 2000 ? 'text-red-500' : 'text-gray-500';
          }
        }
      }
    });

    // Handle Escape key to cancel edit
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const activeEditForm = document.querySelector('.edit-form');
        if (activeEditForm) {
          const commentId = activeEditForm.id.replace('edit-form-', '');
          if (commentId) {
            this.handleEditCancel(parseInt(commentId));
          }
        }
      }
    });
  }

  private async loadComments(page: number = 1, append: boolean = false): Promise<void> {
    if (this.isLoadingComments) {
      if (import.meta.env.DEV) console.log('⏳ Comments already loading, skipping...');
      return;
    }
    this.isLoadingComments = true;

    // Build URL with pagination
    const baseUrl = this.apiUrls.getPostComments;
    const url = new URL(baseUrl);
    url.searchParams.set('page', page.toString());

    if (import.meta.env.DEV) console.log('📥 Loading comments for postId:', this.postId, 'page:', page);
    if (import.meta.env.DEV) console.log('📥 Using URL:', url.toString());

    try {
      // Use AuthHelper for automatic token refresh
      const response = await AuthHelper.makeAuthenticatedRequest(url.toString(), {
        cache: 'no-cache' // Force fresh data
      });

      if (import.meta.env.DEV) console.log('📥 Load comments response:', {
        status: response.status,
        ok: response.ok,
        url: response.url
      });

      if (!response.ok) {
        // If unauthorized, try without credentials (for public comments)
        if (response.status === 401 || response.status === 403) {
          if (import.meta.env.DEV) console.log('📥 Trying to load comments without credentials...');
          const publicResponse = await fetch(url.toString(), {
            cache: 'no-cache'
          });
          
          if (!publicResponse.ok) {
            throw new Error(`Failed to load comments: ${publicResponse.status}`);
          }
          
          const publicData: CommentsResponse = await publicResponse.json();
          if (import.meta.env.DEV) console.log('📊 Public comments data:', publicData);
          
          this.handlePaginatedResponse(publicData, append);
          return;
        }
        
        throw new Error(`Failed to load comments: ${response.status}`);
      }

      const data: CommentsResponse = await response.json();
      if (import.meta.env.DEV) console.log('📊 Comments data received:', data);
      
      // Log individual comment IDs for debugging
      if (Array.isArray(data)) {
        const commentIds = data.map(comment => comment.id);
        if (import.meta.env.DEV) console.log('📋 Comment IDs loaded:', commentIds);
      } else if (data.comments && Array.isArray(data.comments)) {
        const commentIds = data.comments.map(comment => comment.id);
        if (import.meta.env.DEV) console.log('📋 Comment IDs loaded:', commentIds);
      }
      
      this.handlePaginatedResponse(data, append);

    } catch (error) {
      console.error('❌ Error loading comments:', error);
      
      // Show a user-friendly message but don't completely fail
      const commentsListElement = document.getElementById('comments-list');
      if (commentsListElement) {
        commentsListElement.innerHTML = `
          <div class="text-center py-12">
            <div class="text-gray-400 dark:text-gray-500 mb-4">
              <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <p class="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
              ${this.translations['comments.loadError'] || 'Unable to load comments'}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-500">
              ${this.translations['comments.tryAgain'] || 'Please try refreshing the page'}
            </p>
          </div>
        `;
      }
    } finally {
      this.isLoadingComments = false;
      
      // Hide loading spinner
      const loadingElement = document.getElementById('comments-loading');
      if (loadingElement) {
        loadingElement.style.display = 'none';
      }
    }
  }

  private handlePaginatedResponse(data: CommentsResponse, append: boolean): void {
    if (import.meta.env.DEV) console.log('📊 Handling paginated response:', data, 'append:', append);
    
    // Extract comments array from API response
    let commentsArray: Comment[] = [];
    let totalComments = 0;
    
    // Handle different API response structures
    if (data.items && Array.isArray(data.items)) {
      commentsArray = data.items;
      totalComments = data.total || data.count || 0;
      if (import.meta.env.DEV) console.log('📊 Using data.items structure');
    } else if ('comments' in data && Array.isArray((data as { comments: Comment[] }).comments)) {
      commentsArray = (data as { comments: Comment[] }).comments;
      totalComments = data.total || data.count || 0;
      if (import.meta.env.DEV) console.log('📊 Using data.comments structure');
    } else if ('results' in data && Array.isArray((data as { results: Comment[] }).results)) {
      commentsArray = (data as { results: Comment[] }).results;
      totalComments = data.total || data.count || 0;
      if (import.meta.env.DEV) console.log('📊 Using data.results structure');
    } else if (Array.isArray(data)) {
      commentsArray = data as Comment[];
      totalComments = commentsArray.length;
      if (import.meta.env.DEV) console.log('📊 Using direct array structure');
    } else {
      console.error('❌ Unknown API response structure:', data);
      commentsArray = [];
      totalComments = 0;
    }

    // Update pagination state based on API response
    this.totalComments = totalComments;
    
    // Determine if there are more comments based on response size:
    // If API returned less than 20 comments, no more pages
    // If API returned 0 comments, no more pages
    if (commentsArray.length < this.commentsPerPage) {
      this.hasMoreComments = false;
    } else if (commentsArray.length === 0) {
      this.hasMoreComments = false;
    } else {
      // Assume more comments if we got full page (20 comments)
      this.hasMoreComments = commentsArray.length === this.commentsPerPage;
    }

    if (import.meta.env.DEV) console.log(`📊 Pagination state: hasMore=${this.hasMoreComments}, received=${commentsArray.length}, total=${this.totalComments}`);

    if (append) {
      // Add new comments to existing ones
      this.allComments = [...this.allComments, ...commentsArray];
      if (import.meta.env.DEV) console.log(`📊 Appended ${commentsArray.length} comments, total: ${this.allComments.length}`);
    } else {
      // Replace all comments (first load)
      this.allComments = commentsArray;
      if (import.meta.env.DEV) console.log(`📊 Loaded ${commentsArray.length} comments`);
    }

    // Display all loaded comments
    this.renderPaginatedComments();
  }


  private renderLoadMoreButton(): string {
    // Calculate remaining comments based on server pagination
    const currentlyLoaded = this.allComments.filter(c => !(c.parentId || c.parent_id)).length;
    const remainingComments = Math.max(0, this.totalComments - currentlyLoaded);
    
    return `
      <div class="load-more-container text-center py-6">
        <button 
          id="load-more-comments" 
          class="inline-flex items-center space-x-2 px-6 py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-700 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-200 font-semibold text-sm"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
          <span>${this.translations['blog.loadMoreComments'] || this.translations['comments.loadMore'] || 'Load More Comments'}${remainingComments > 0 ? ` (${remainingComments})` : ''}</span>
        </button>
      </div>
    `;
  }



  private renderPaginatedComments(): void {
    const commentsList = document.getElementById('comments-list');
    if (!commentsList) {
      console.error('❌ Comments list element not found');
      return;
    }

    // Filter root comments (non-replies) - these are what we display
    const rootComments = this.allComments.filter(c => !(c.parentId || c.parent_id));
    
    // No client-side pagination - server handles it
    if (import.meta.env.DEV) console.log(`📊 Displaying ${rootComments.length} root comments, hasMoreComments: ${this.hasMoreComments}`);

    if (rootComments.length === 0) {
      commentsList.innerHTML = `
        <div class="text-center py-12">
          <div class="text-gray-400 dark:text-gray-500 mb-4">
            <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
          </div>
          <p class="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
            ${this.translations['comments.noComments'] || 'No comments yet'}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-500">
            ${this.translations['comments.beFirst'] || 'Be the first to share your thoughts!'}
          </p>
        </div>
      `;
      return;
    }

    // Handle comments structure - they can have replies embedded or need to be grouped
    const replyMap = new Map<number, Comment[]>();

    // Check if comments already have replies embedded
    const hasEmbeddedReplies = this.allComments.some(c => c.replies && Array.isArray(c.replies) && c.replies.length > 0);
    
    if (!hasEmbeddedReplies) {
      // Group comments by parent manually - handle both parentId and parent_id
      this.allComments.filter(c => c.parentId || c.parent_id).forEach(reply => {
        const parentId = reply.parentId || reply.parent_id;
        if (parentId) {
          if (!replyMap.has(parentId)) {
            replyMap.set(parentId, []);
          }
          replyMap.get(parentId)!.push(reply);
        }
      });
    }

    // Render ALL root comments (server already handles pagination)
    const commentsHtml = rootComments.map(comment => {
      // Use embedded replies if available, otherwise use grouped replies
      const replies = comment.replies || replyMap.get(comment.id) || [];
      return this.renderComment(comment, replies);
    }).join('');

    // Show load more button if server says there are more comments
    const loadMoreButton = this.hasMoreComments ? this.renderLoadMoreButton() : '';
    
    // Replace all content
    commentsList.innerHTML = commentsHtml + loadMoreButton;
    
    // Disable like/dislike buttons for user's own comments after rendering
    setTimeout(() => {
      disableOwnCommentButtons(this.currentUser, this.translations);
    }, 100);
  }

  private renderComment(comment: Comment, replies: Comment[] = []): string {
    // Handle field mappings between API and frontend
    const authorId = comment.authorId || comment.user_id;
    const isDeleted = comment.is_deleted || false;
    
    // Use only API response for edit permission - no local time checking
    // Disable editing and interactions for deleted comments
    const canEdit = this.currentUser && !isDeleted && (comment.canEdit || comment.can_edit);
    const canDelete = this.currentUser && !isDeleted && (this.currentUser.id === authorId || this.currentUser.rank === 'admin');
    
    const userLikeStatus = comment.userLikeStatus ?? comment.user_like_status;
    const isLiked = userLikeStatus === true;
    const isDisliked = userLikeStatus === false;
    
    const likesCount = comment.likes ?? comment.likes_count ?? 0;
    const dislikesCount = comment.dislikes ?? comment.dislikes_count ?? 0;
    const createdAt = comment.createdAt || comment.created_at || '';

    // Handle different author data structures
    const authorName = typeof comment.author === 'string' 
      ? comment.author 
      : comment.author?.username || 'Unknown';
    
    const authorInitial = authorName.charAt(0).toUpperCase();

    // Debug logging for edit button visibility
    if (this.isDev) {
      if (import.meta.env.DEV) console.log(`🔍 Edit button debug for comment ${comment.id}:`, {
        currentUser: this.currentUser?.username,
        currentUserId: this.currentUser?.id,
        commentAuthorId: authorId,
        commentCreatedAt: createdAt,
        canEditFromAPI: comment.canEdit || comment.can_edit,
        canEdit: canEdit,
        isOwner: this.currentUser?.id === authorId,
        isAdmin: this.currentUser?.rank === 'admin'
      });
    }

    // Log rendering details for debugging
    if (this.isDev && replies.length > 0) {
      if (import.meta.env.DEV) console.log(`🎨 Rendering comment ${comment.id} with ${replies.length} replies:`, replies.map(r => ({id: r.id, content: r.content?.substring(0, 50)})));
    }

    return `
      <div class="comment bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-4" data-comment-id="${comment.id}" data-is-deleted="${isDeleted}">
        <div class="flex items-start space-x-4">
          <div class="flex-shrink-0">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              ${authorInitial}
            </div>
          </div>
          
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-2 mb-2">
              <h4 class="font-semibold text-gray-900 dark:text-white text-sm">${authorName}</h4>
              <span class="text-xs text-gray-500 dark:text-gray-400">${this.formatDate(createdAt)}</span>
            </div>
            
            <div class="comment-content text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4">
              ${comment.is_deleted ? 
                `<em class="text-gray-500 dark:text-gray-400">${this.translations['comments.deleted'] || 'This comment has been deleted'}</em>` : 
                comment.content
              }
            </div>
            
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <!-- Like/Dislike buttons -->
                ${this.currentUser && !isDeleted ? `
                  <button 
                    class="like-btn flex items-center space-x-2 px-4 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-semibold border-2 ${isLiked ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700' : 'text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'}"
                    data-action="like" 
                    data-id="${comment.id}"
                    data-author-id="${authorId}"
                    data-current-state="${isLiked ? 'true' : isDisliked ? 'false' : ''}"
                  >
                    <svg class="w-4 h-4" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 7m-5 4v6m4-6v6m8-4V7"></path>
                    </svg>
                    <span class="like-count">${likesCount}</span>
                  </button>
                  
                  <button 
                    class="dislike-btn flex items-center space-x-2 px-4 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-semibold border-2 ${isDisliked ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700' : 'text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'}"
                    data-action="dislike" 
                    data-id="${comment.id}"
                    data-author-id="${authorId}"
                    data-current-state="${isDisliked ? 'false' : isLiked ? 'true' : ''}"
                  >
                    <svg class="w-4 h-4" fill="${isDisliked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L15 17m-8-4v-6m4 6v-6m-8 4V7"></path>
                    </svg>
                    <span class="dislike-count">${dislikesCount}</span>
                  </button>
                ` : `
                  <span class="flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold border-2 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 7m-5 4v6m4-6v6m8-4V7"></path>
                    </svg>
                    <span>${likesCount}</span>
                  </span>
                  <span class="flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold border-2 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L15 17m-8-4v-6m4 6v-6m-8 4V7"></path>
                    </svg>
                    <span>${dislikesCount}</span>
                  </span>
                `}
                
                ${this.currentUser && !isDeleted ? `
                  <button 
                    class="reply-btn flex items-center space-x-2 px-4 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-semibold border-2 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600"
                    data-action="reply" 
                    data-id="${comment.id}"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                    </svg>
                    <span>${this.translations['comments.reply'] || 'Reply'}</span>
                  </button>
                ` : ''}
              </div>
              
              <div class="flex items-center space-x-2">
                ${canEdit ? `
                  <button 
                    class="edit-btn text-xs text-yellow-600 hover:text-yellow-800"
                    data-action="edit" 
                    data-id="${comment.id}"
                    title="${this.translations['comments.editTimeLimit'] || 'Edit this comment'}"
                  >
                    ${this.translations['comments.edit'] || 'Edit'}
                  </button>
                ` : ''}
                
                ${canDelete ? `
                  <button 
                    class="delete-btn text-xs text-red-600 hover:text-red-800"
                    data-action="delete" 
                    data-id="${comment.id}"
                  >
                    ${this.translations['comments.delete'] || 'Delete'}
                  </button>
                ` : ''}
              </div>
            </div>
            <!-- Replies -->
            ${replies.length > 0 ? `
              <div class="replies mt-4 pl-4 border-l-2 border-gray-200 dark:border-gray-600 space-y-3">
                <!-- Reply Form (when replying) - placed in replies section before existing replies -->
                <div class="reply-form-container mb-4" id="reply-form-${comment.id}" style="display: none;"></div>
                
                <div class="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">
                  ${replies.length} ${replies.length === 1 ? (this.translations['comments.reply'] || 'Reply') : (this.translations['comments.replies'] || 'Replies')}
                </div>
                ${replies.map(reply => this.renderReply(reply)).join('')}
              </div>
            ` : `
              <!-- Reply Form (when replying) - shown even when no replies exist -->
              <div class="reply-form-container mt-4" id="reply-form-${comment.id}" style="display: none;"></div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  private renderReply(reply: Comment): string {
    // Handle field mappings between API and frontend
    const authorId = reply.authorId || reply.user_id;
    const isDeleted = reply.is_deleted || false;
    
    // Use only API response for edit permission - no local time checking
    // Disable editing and interactions for deleted comments
    const canEdit = this.currentUser && !isDeleted && (reply.canEdit || reply.can_edit);
    const canDelete = this.currentUser && !isDeleted && (this.currentUser.id === authorId || this.currentUser.rank === 'admin');
    
    const userLikeStatus = reply.userLikeStatus ?? reply.user_like_status;
    const isLiked = userLikeStatus === true;
    const isDisliked = userLikeStatus === false;
    
    const likesCount = reply.likes ?? reply.likes_count ?? 0;
    const dislikesCount = reply.dislikes ?? reply.dislikes_count ?? 0;
    const createdAt = reply.createdAt || reply.created_at || '';

    // Handle different author data structures
    const authorName = typeof reply.author === 'string' 
      ? reply.author 
      : reply.author?.username || 'Unknown';
    
    const authorInitial = authorName.charAt(0).toUpperCase();

    return `
      <div class="reply bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-3" data-comment-id="${reply.id}" data-is-deleted="${isDeleted}">
        <div class="flex items-start space-x-3">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
              ${authorInitial}
            </div>
          </div>
          
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-2 mb-1">
              <h5 class="font-semibold text-gray-900 dark:text-white text-xs">${authorName}</h5>
              <span class="text-xs text-gray-500 dark:text-gray-400">${this.formatDate(createdAt)}</span>
            </div>
            
            <div class="reply-content text-gray-700 dark:text-gray-300 text-xs leading-relaxed mb-3">
              ${reply.is_deleted ? 
                `<em class="text-gray-500 dark:text-gray-400">${this.translations['comments.deleted'] || 'This comment has been deleted'}</em>` : 
                reply.content
              }
            </div>
            
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <!-- Like/Dislike buttons for replies -->
                ${this.currentUser && !isDeleted ? `
                  <button 
                    class="like-btn flex items-center space-x-2 px-4 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-semibold border-2 ${isLiked ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700' : 'text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'}"
                    data-action="like" 
                    data-id="${reply.id}"
                    data-author-id="${authorId}"
                    data-current-state="${isLiked ? 'true' : isDisliked ? 'false' : ''}"
                  >
                    <svg class="w-3 h-3" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 7m-5 4v6m4-6v6m8-4V7"></path>
                    </svg>
                    <span class="like-count">${likesCount}</span>
                  </button>
                  
                  <button 
                    class="dislike-btn flex items-center space-x-2 px-4 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-semibold border-2 ${isDisliked ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700' : 'text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'}"
                    data-action="dislike" 
                    data-id="${reply.id}"
                    data-author-id="${authorId}"
                    data-current-state="${isDisliked ? 'false' : isLiked ? 'true' : ''}"
                  >
                    <svg class="w-3 h-3" fill="${isDisliked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L15 17m-8-4v-6m4 6v-6m-8 4V7"></path>
                    </svg>
                    <span class="dislike-count">${dislikesCount}</span>
                  </button>
                ` : `
                  <span class="flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 text-xs font-semibold border-2 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 7m-5 4v6m4-6v6m8-4V7"></path>
                    </svg>
                    <span>${likesCount}</span>
                  </span>
                  <span class="flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 text-xs font-semibold border-2 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485-.60L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L15 17m-8-4v-6m4 6v-6m-8 4V7"></path>
                    </svg>
                    <span>${dislikesCount}</span>
                  </span>
                `}
                
                <!-- NO REPLY BUTTON for replies (only one level deep) -->
              </div>
              
              <div class="flex items-center space-x-2">
                ${canEdit ? `
                  <button 
                    class="edit-btn text-xs text-yellow-600 hover:text-yellow-800"
                    data-action="edit" 
                    data-id="${reply.id}"
                    title="${this.translations['comments.editTimeLimit'] || 'Edit this comment'}"
                  >
                    ${this.translations['comments.edit'] || 'Edit'}
                  </button>
                ` : ''}
                
                ${canDelete ? `
                  <button 
                    class="delete-btn text-xs text-red-600 hover:text-red-800"
                    data-action="delete" 
                    data-id="${reply.id}"
                  >
                    ${this.translations['comments.delete'] || 'Delete'}
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private handleCommentActions(e: Event): void {
    const target = e.target as HTMLElement;
    const button = target.closest('[data-action]') as HTMLElement;
    
    // Handle load more button
    if (target.id === 'load-more-comments' || target.closest('#load-more-comments')) {
      this.handleLoadMoreComments();
      return;
    }
    
    if (!button) {
      // Handle edit form buttons that don't use data-action
      if (target.classList.contains('save-edit-btn') || target.closest('.save-edit-btn')) {
        const saveButton = target.closest('.save-edit-btn') as HTMLElement;
        const commentId = parseInt(saveButton?.dataset.commentId || '0');
        if (commentId) {
          this.handleEditSave(commentId);
        }
        return;
      }
      
      if (target.classList.contains('cancel-edit-btn') || target.closest('.cancel-edit-btn')) {
        const cancelButton = target.closest('.cancel-edit-btn') as HTMLElement;
        const commentId = parseInt(cancelButton?.dataset.commentId || '0');
        if (commentId) {
          this.handleEditCancel(commentId);
        }
        return;
      }
      
      return;
    }

    const action = button.dataset.action;
    const commentId = parseInt(button.dataset.id || '0');

    if (!commentId) return;

    switch (action) {
      case 'like':
      case 'dislike':
        handleLikeDislike(commentId, action as 'like' | 'dislike', this.currentUser, this.translations, this.debouncedLikes, this.showError.bind(this));
        break;
      case 'reply':
        handleReply(
          commentId, 
          this.postId!, 
          this.currentUser, 
          this.translations, 
          this.showError.bind(this),
          this.showSuccess.bind(this),
          this.loadComments.bind(this),
          this.isLoadingComments,
          this.addRealReply.bind(this)
        );
        break;
      case 'edit':
        this.handleEditComment(commentId);
        break;
      case 'delete':
        this.handleDeleteComment(commentId);
        break;
    }
  }

  private async handleEditComment(commentId: number): Promise<void> {
    // Use the new edit functionality
    showEditForm(
      commentId,
      this.currentUser,
      this.translations,
      this.showError.bind(this)
    );
  }

  private async handleEditSave(commentId: number): Promise<void> {
    // Use the edit functionality from comment-edit.ts
    await handleEditSubmit(
      commentId,
      this.currentUser,
      this.translations,
      this.apiUrls,
      this.showError.bind(this),
      this.showSuccess.bind(this),
      this.loadComments.bind(this)
    );
  }

  private handleEditCancel(commentId: number): void {
    // Use the cancel functionality from comment-edit.ts
    cancelEdit(commentId);
  }

  private async handleLoadMoreComments(): Promise<void> {
    if (this.isLoadingComments || !this.hasMoreComments) return;
    
    if (import.meta.env.DEV) console.log('📥 Loading more comments, current page:', this.currentPage);
    
    // Show loading state on button
    const loadMoreButton = document.getElementById('load-more-comments');
    if (loadMoreButton) {
      loadMoreButton.textContent = this.translations['comments.loading'] || 'Loading...';
      loadMoreButton.setAttribute('disabled', 'true');
    }
    
    this.currentPage += 1;
    
    try {
      await this.loadComments(this.currentPage, true); // true = append
    } catch (error) {
      console.error('❌ Error loading more comments:', error);
      this.showError(this.translations['comments.loadError'] || 'Failed to load more comments');
      // Reset button state on error
      if (loadMoreButton) {
        loadMoreButton.textContent = this.translations['blog.loadMoreComments'] || 'Load More Comments';
        loadMoreButton.removeAttribute('disabled');
      }
      // Rollback page increment on error
      this.currentPage -= 1;
    }
  }

  private async handleDeleteComment(commentId: number): Promise<void> {
    if (!confirm(this.translations['comments.confirmDelete'] || 'Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      const deleteUrl = this.apiUrls.deleteCommentTemplate.replace('{id}', commentId.toString());
      // Use AuthHelper for automatic token refresh
      const response = await AuthHelper.makeAuthenticatedRequest(deleteUrl, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete comment: ${response.status}`);
      }

      this.showSuccess(this.translations['comments.deleted'] || 'Comment deleted successfully');
      await this.loadComments();

    } catch (error) {
      console.error('❌ Error deleting comment:', error);
      this.showError(this.translations['comments.deleteError'] || 'Failed to delete comment');
    }
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const locale = this.lang === 'pl' ? 'pl-PL' : 'en-US';
    
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private showSuccess(message: string): void {
    notifications.success(message);
  }

  private showError(message: string): void {
    notifications.error(message);
  }

  // Public methods for external use
  public async refreshComments(): Promise<void> {
    await this.loadComments();
  }

  public reset(): void {
    this.isInitialized = false;
    this.currentUser = null;
    
    // Reset pagination state
    this.allComments = [];
    this.currentPage = 1;
    this.hasMoreComments = false;
    this.totalComments = 0;
  }

  // Add real comment from API response
  public addRealComment(comment: Comment): void {
    if (!comment) return;

    if (this.isDev) {
      if (import.meta.env.DEV) console.log('✨ Adding real comment from API:', comment);
    }

    // Add to the beginning of allComments array for pagination
    this.allComments.unshift(comment);
    
    // Re-render the comments with updated pagination
    this.renderPaginatedComments();
  }

  // Add real reply from API response
  public addRealReply(reply: Comment, parentId: number): void {
    if (!reply || !parentId) return;

    if (this.isDev) {
      if (import.meta.env.DEV) console.log('✨ Adding real reply from API:', reply, 'to parent:', parentId);
    }

    const parentElement = document.querySelector(`[data-comment-id="${parentId}"]`);
    if (!parentElement) return;

    const repliesContainer = parentElement.querySelector('.replies');
    if (repliesContainer) {
      const realReplyHtml = this.renderReply(reply);
      repliesContainer.insertAdjacentHTML('beforeend', realReplyHtml);
      
      // Update replies count
      const repliesHeader = repliesContainer.querySelector('.text-xs');
      if (repliesHeader) {
        const currentReplies = repliesContainer.querySelectorAll('.reply').length;
        repliesHeader.textContent = `${currentReplies} ${currentReplies === 1 ? (this.translations['comments.reply'] || 'Reply') : (this.translations['comments.replies'] || 'Replies')}`;
      }
    } else {
      // Create replies container if it doesn't exist
      const replyFormContainer = parentElement.querySelector('.reply-form-container');
      if (replyFormContainer) {
        const repliesHtml = `
          <div class="replies mt-4 pl-4 border-l-2 border-gray-200 dark:border-gray-600 space-y-3">
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">
              1 ${this.translations['comments.reply'] || 'Reply'}
            </div>
            ${this.renderReply(reply)}
          </div>
        `;
        replyFormContainer.insertAdjacentHTML('afterend', repliesHtml);
      }
    }
    
    // Disable like/dislike buttons for user's own comments after rendering
    setTimeout(() => {
      disableOwnCommentButtons(this.currentUser, this.translations);
    }, 100);
  }

  // Optimistic updates for better UX
  public addOptimisticComment(content: string, parentId?: number | null): void {
    if (!this.currentUser) return;

    const tempComment: Comment = {
      id: Date.now(), // Temporary ID
      content: content,
      author: this.currentUser.username,
      authorId: this.currentUser.id,
      user_id: this.currentUser.id,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      likes: 0,
      likes_count: 0,
      dislikes: 0,
      dislikes_count: 0,
      userLikeStatus: null,
      user_like_status: null,
      canEdit: true,
      can_edit: true,
      canDelete: true,
      can_delete: true,
      replies: [],
      parentId: parentId || undefined,
      parent_id: parentId || undefined,
      is_deleted: false
    };

    // Add optimistic styling to show it's pending
    const commentsList = document.getElementById('comments-list');
    if (!commentsList) return;

    if (!parentId) {
      // Add as new root comment at the top
      const optimisticHtml = this.renderOptimisticComment(tempComment);
      commentsList.insertAdjacentHTML('afterbegin', optimisticHtml);
    } else {
      // Add as reply to parent comment
      const parentElement = document.querySelector(`[data-comment-id="${parentId}"]`);
      if (parentElement) {
        const repliesContainer = parentElement.querySelector('.replies');
        if (repliesContainer) {
          const optimisticHtml = this.renderOptimisticReply(tempComment);
          repliesContainer.insertAdjacentHTML('beforeend', optimisticHtml);
        } else {
          // Create replies container if it doesn't exist
          const replyFormContainer = parentElement.querySelector('.reply-form-container');
          if (replyFormContainer) {
            const repliesHtml = `
              <div class="replies mt-4 pl-4 border-l-2 border-gray-200 dark:border-gray-600 space-y-3">
                <div class="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">
                  1 ${this.translations['comments.reply'] || 'Reply'}
                </div>
                ${this.renderOptimisticReply(tempComment)}
              </div>
            `;
            replyFormContainer.insertAdjacentHTML('afterend', repliesHtml);
          }
        }
      }
    }

    if (this.isDev) {
      if (import.meta.env.DEV) console.log('✨ Added optimistic comment:', tempComment);
    }
  }

  private renderOptimisticComment(comment: Comment): string {
    const authorName = typeof comment.author === 'string' 
      ? comment.author 
      : comment.author?.username || 'Unknown';
    const authorInitial = authorName.charAt(0).toUpperCase();
    
    return `
      <div class="comment optimistic bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-blue-200 dark:border-blue-700 p-6 mb-4 opacity-75" data-comment-id="${comment.id}">
        <div class="flex items-start space-x-4">
          <div class="flex-shrink-0">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              ${authorInitial}
            </div>
          </div>
          
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-2 mb-2">
              <h4 class="font-semibold text-gray-900 dark:text-white text-sm">${authorName}</h4>
              <span class="text-xs text-gray-500 dark:text-gray-400">${this.formatDate(comment.createdAt || '')}</span>
              <span class="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-full">
                ${this.translations['comments.posting'] || 'Posting...'}
              </span>
            </div>
            
            <div class="comment-content text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4">
              ${comment.is_deleted ? 
                `<em class="text-gray-500 dark:text-gray-400">${this.translations['comments.deleted'] || 'This comment has been deleted'}</em>` : 
                comment.content
              }
            </div>
            
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <span class="flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 text-xs font-semibold border-2 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 7m-5 4v6m4-6v6m8-4V7"></path>
                  </svg>
                  <span>0</span>
                </span>
                <span class="flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 text-xs font-semibold border-2 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.60L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L15 17m-8-4v-6m4 6v-6m-8 4V7"></path>
                  </svg>
                  <span>0</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderOptimisticReply(reply: Comment): string {
    const authorName = typeof reply.author === 'string' 
      ? reply.author 
      : reply.author?.username || 'Unknown';
    const authorInitial = authorName.charAt(0).toUpperCase();
    
    return `
      <div class="reply optimistic bg-gray-50 dark:bg-gray-750 rounded-lg border border-blue-200 dark:border-blue-600 p-4 mb-3 opacity-75" data-comment-id="${reply.id}">
        <div class="flex items-start space-x-3">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
              ${authorInitial}
            </div>
          </div>
          
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-2 mb-1">
              <h5 class="font-semibold text-gray-900 dark:text-white text-xs">${authorName}</h5>
              <span class="text-xs text-gray-500 dark:text-gray-400">${this.formatDate(reply.createdAt || '')}</span>
              <span class="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-full">
                ${this.translations['comments.posting'] || 'Posting...'}
              </span>
            </div>
            
            <div class="reply-content text-gray-700 dark:text-gray-300 text-xs leading-relaxed mb-3">
              ${reply.is_deleted ? 
                `<em class="text-gray-500 dark:text-gray-400">${this.translations['comments.deleted'] || 'This comment has been deleted'}</em>` : 
                reply.content
              }
            </div>
            
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <span class="flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 text-xs font-semibold border-2 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.60L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 7m-5 4v6m4-6v6m8-4V7"></path>
                  </svg>
                  <span>0</span>
                </span>
                <span class="flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 text-xs font-semibold border-2 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.60L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L15 17m-8-4v-6m4 6v-6m-8 4V7"></path>
                  </svg>
                  <span>0</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

// Make it available globally for backward compatibility
declare global {
  interface Window {
    EnhancedCommentsManager: typeof EnhancedCommentsManager;
    AdminAuth: typeof AdminAuth;
  }
}

if (typeof window !== 'undefined') {
  window.EnhancedCommentsManager = EnhancedCommentsManager;
}

// Global instance to prevent multiple initializations
let globalCommentsManager: EnhancedCommentsManager | null = null;

export function resetCommentsManager(): void {
  if (globalCommentsManager) {
    if (import.meta.env.DEV) {
      if (import.meta.env.DEV) console.log('🔄 Resetting comments manager for new page...');
    }
    globalCommentsManager = null;
    
    // Clear initialization flag from any existing containers
    const commentsContainer = document.getElementById('comments-section-wrapper');
    if (commentsContainer) {
      commentsContainer.dataset.initialized = 'false';
    }
  }
}

export function initCommentsPage(lang: string): void {
  const commentsContainer = document.getElementById('comments-section-wrapper');
  if (!commentsContainer) {
    if (import.meta.env.DEV) {
      if (import.meta.env.DEV) console.log('ℹ️ Comments container not found on this page, skipping initialization.');
    }
    return;
  }

  const { postId, translations, apiUrls, isDev } = commentsContainer.dataset;

  if (!postId) {
    if (import.meta.env.DEV) {
      console.error('❌ Post ID not found in comments container dataset. Cannot initialize comments.');
    }
    return;
  }

  // Check if we already have a manager for this specific post
  if (globalCommentsManager && commentsContainer.dataset.initialized === 'true') {
    const currentPostId = commentsContainer.dataset.postId;
    // Only skip if it's the same post and already initialized
    if (currentPostId === postId) {
      if (import.meta.env.DEV) {
        if (import.meta.env.DEV) console.log(`ℹ️ Comments already initialized for post ${postId}, skipping.`);
      }
      return;
    }
  }

  try {
    const parsedTranslations = JSON.parse(translations || '{}');
    const parsedApiUrls = JSON.parse(apiUrls || '{}');
    const devMode = isDev === 'true';

    globalCommentsManager = new EnhancedCommentsManager(postId, lang, parsedTranslations, parsedApiUrls, devMode);
    
    // Mark container as initialized for this specific post
    commentsContainer.dataset.initialized = 'true';
    commentsContainer.dataset.currentPostId = postId;
    
    if (import.meta.env.DEV) {
      if (import.meta.env.DEV) console.log('✅ Comments manager initialized successfully for post:', postId);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('❌ Failed to parse data attributes for comments initialization:', error);
    }
  }
}
