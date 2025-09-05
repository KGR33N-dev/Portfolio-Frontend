// Enhanced Comments functionality for blog posts with authentication, likes, replies, edit/delete
import { AdminAuth } from '../utils/adminAuth.ts';
import { DebouncedLikes, handleLikeDislike, disableOwnCommentButtons } from './likes.ts';
import { handleSubmitComment } from './comment-submission.ts';
import { handleReply } from './comment-replies.ts';

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
  items: Comment[];
  total: number;
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

  constructor(postId: string, lang: string, translations: Translations, apiUrls: ApiUrls, isDev: boolean = false) {
    this.postId = postId;
    this.lang = lang;
    this.translations = translations;
    this.apiUrls = apiUrls;
    this.isDev = isDev;
    this.debouncedLikes = new DebouncedLikes();
    
    console.log('🚀 EnhancedCommentsManager constructor:', {
      postId: this.postId,
      lang: this.lang,
      apiUrls: this.apiUrls,
      isDev: this.isDev
    });
    
    this.init();
  }

  private async init(): Promise<void> {
    if (this.isDev) {
      console.log('🔄 Initializing comments system...', {
        readyState: document.readyState,
        hasCommentsContainer: !!document.getElementById('comments-list')
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        if (this.isDev) console.log('📄 DOM loaded, starting setup...');
        this.setup();
      });
    } else {
      if (this.isDev) console.log('📄 DOM already loaded, starting setup immediately...');
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
    if (this.isDev) console.log('🚀 Initializing enhanced comments system...');
    
    // Check if required HTML elements exist
    const loginPrompt = document.getElementById('login-prompt');
    const commentForm = document.getElementById('comment-form');
    const commentsContainer = document.getElementById('comments-list');
    
    if (this.isDev) {
      console.log('🔍 Required HTML elements check:', {
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
      
      if (this.isDev) console.log('✅ Comments system initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize comments:', error);
      // Even if there's an error, try to show the login prompt
      this.updateAuthUI();
      // And still try to load comments (they might be public)
      try {
        await this.loadComments();
      } catch (loadError) {
        console.error('❌ Failed to load comments:', loadError);
        this.showError('Failed to load comments');
      }
    }
  }

  private async checkAuth(): Promise<void> {
    console.log('🔐 Checking authentication...');
    
    try {
      // Use AdminAuth.verifyUser() to check session via HTTP-only cookies
      if (typeof AdminAuth !== 'undefined' && AdminAuth.verifyUser) {
        console.log('🔐 Using AdminAuth.verifyUser()...');
        const userData = await AdminAuth.verifyUser();
        if (userData && userData.id) {
          this.currentUser = userData;
          console.log('✅ User authenticated via AdminAuth:', userData.username);
          this.updateAuthUI();
          return;
        }
        console.log('❌ AdminAuth.verifyUser() returned null');
      }

      // Fallback: direct API call with credentials
      console.log('🔐 Trying direct API call to backend auth endpoint...');
      const { API_CONFIG } = await import('../config/api.ts');
      const response = await fetch(`${API_CONFIG.auth}/me`, {
        credentials: 'include'
      });

      console.log('📥 Auth response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        this.currentUser = await response.json();
        console.log('✅ User authenticated via direct API:', this.currentUser?.username);
      } else {
        // Try to get error details
        let errorText = '';
        try {
          const errorData = await response.json();
          errorText = errorData.detail || errorData.message || response.statusText;
          console.log('❌ Auth error details:', errorData);
        } catch (parseError) {
          errorText = response.statusText;
          console.log('❌ Could not parse error response:', parseError);
        }
        
        this.currentUser = null;
        console.log(`ℹ️ User not authenticated - ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      this.currentUser = null;
      console.log('ℹ️ Auth check failed - user will see login prompt');
    }

    // Always update UI regardless of auth status
    this.updateAuthUI();
  }

  private updateAuthUI(): void {
    if (this.isDev) {
      console.log('🎨 updateAuthUI: Current user:', this.currentUser ? this.currentUser.username : 'null');
    }

    const loginPrompt = document.getElementById('login-prompt');
    const commentForm = document.getElementById('comment-form');
    const userAvatarLetter = document.getElementById('user-avatar-letter');

    if (this.isDev) {
      console.log('🔍 updateAuthUI: Found elements:', {
        loginPrompt: !!loginPrompt,
        commentForm: !!commentForm,
        userAvatarLetter: !!userAvatarLetter
      });
    }

    if (this.currentUser) {
      // User is logged in
      if (loginPrompt) {
        loginPrompt.style.display = 'none';
        if (this.isDev) console.log('✅ Hidden login prompt');
      } else if (this.isDev) {
        console.warn('⚠️ Login prompt element not found');
      }
      
      if (commentForm) {
        commentForm.style.display = 'block';
        if (this.isDev) console.log('✅ Shown comment form');
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
        if (this.isDev) console.log('✅ Set avatar letter:', letter);
      } else if (this.isDev) {
        console.warn('⚠️ User avatar letter element not found');
      }
    } else {
      // User not logged in
      if (loginPrompt) {
        loginPrompt.style.display = 'block';
        if (this.isDev) console.log('✅ Shown login prompt');
      } else if (this.isDev) {
        console.warn('⚠️ Login prompt element not found - cannot show login message');
      }
      
      if (commentForm) {
        commentForm.style.display = 'none';
        if (this.isDev) console.log('✅ Hidden comment form');
      } else if (this.isDev) {
        console.warn('⚠️ Comment form element not found');
      }
    }

    if (this.isDev) {
      console.log('🎨 updateAuthUI: Auth UI updated successfully');
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
        console.log('📝 Comment form event listener attached');
      }
    }

    // Comment actions (like, dislike, reply, edit, delete)
    // Note: Using document delegation, so no need to clone
    document.addEventListener('click', (e) => this.handleCommentActions(e));
  }

  private async loadComments(): Promise<void> {
    if (this.isLoadingComments) {
      console.log('⏳ Comments already loading, skipping...');
      return;
    }
    this.isLoadingComments = true;

    console.log('📥 Loading comments for postId:', this.postId);
    console.log('📥 Using URL:', this.apiUrls.getPostComments);

    try {
      const response = await fetch(this.apiUrls.getPostComments, {
        credentials: 'include',
        cache: 'no-cache' // Force fresh data
      });

      console.log('📥 Load comments response:', {
        status: response.status,
        ok: response.ok,
        url: response.url
      });

      if (!response.ok) {
        // If unauthorized, try without credentials (for public comments)
        if (response.status === 401 || response.status === 403) {
          console.log('📥 Trying to load comments without credentials...');
          const publicResponse = await fetch(this.apiUrls.getPostComments, {
            cache: 'no-cache'
          });
          
          if (!publicResponse.ok) {
            throw new Error(`Failed to load comments: ${publicResponse.status}`);
          }
          
          const publicData: CommentsResponse = await publicResponse.json();
          console.log('📊 Public comments data:', publicData);
          
          // Use the same logic for public data
          let publicCommentsArray: Comment[] = [];
          if (publicData.items && Array.isArray(publicData.items)) {
            publicCommentsArray = publicData.items;
          } else if ('comments' in publicData && Array.isArray((publicData as { comments: Comment[] }).comments)) {
            publicCommentsArray = (publicData as { comments: Comment[] }).comments;
          } else if ('results' in publicData && Array.isArray((publicData as { results: Comment[] }).results)) {
            publicCommentsArray = (publicData as { results: Comment[] }).results;
          } else if (Array.isArray(publicData)) {
            publicCommentsArray = publicData as Comment[];
          }
          
          this.displayComments(publicCommentsArray);
          console.log(`📊 Loaded ${publicCommentsArray.length} public comments`);
          return;
        }
        
        throw new Error(`Failed to load comments: ${response.status}`);
      }

      const data: CommentsResponse = await response.json();
      console.log('📊 Comments data received:', data);
      console.log('📊 Data structure analysis:', {
        hasItems: 'items' in data,
        hasComments: 'comments' in data,
        hasResults: 'results' in data,
        isArray: Array.isArray(data),
        keys: Object.keys(data),
        itemsLength: data.items?.length || 'no items property',
        commentsLength: 'comments' in data ? (data as { comments: Comment[] }).comments?.length || 'empty comments' : 'no comments property',
        resultsLength: 'results' in data ? (data as { results: Comment[] }).results?.length || 'empty results' : 'no results property',
        directLength: Array.isArray(data) ? data.length : 'not array'
      });
      
      // Try different possible structures
      let commentsArray: Comment[] = [];
      if (data.items && Array.isArray(data.items)) {
        commentsArray = data.items;
        console.log('📊 Using data.items structure');
      } else if ('comments' in data && Array.isArray((data as { comments: Comment[] }).comments)) {
        commentsArray = (data as { comments: Comment[] }).comments;
        console.log('📊 Using data.comments structure');
      } else if ('results' in data && Array.isArray((data as { results: Comment[] }).results)) {
        commentsArray = (data as { results: Comment[] }).results;
        console.log('📊 Using data.results structure');
      } else if (Array.isArray(data)) {
        commentsArray = data as Comment[];
        console.log('📊 Using direct array structure');
      } else {
        console.error('❌ Unknown API response structure:', data);
        commentsArray = [];
      }
      
      this.displayComments(commentsArray);
      
      console.log(`📊 Loaded ${commentsArray.length} comments`);

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

  private displayComments(comments: Comment[]): void {
    console.log('🎨 Displaying comments:', comments.length, 'items');
    console.log('🎨 Sample comment structure:', comments[0]);
    
    const commentsList = document.getElementById('comments-list');
    if (!commentsList) {
      console.error('❌ Comments list element not found');
      return;
    }

    if (comments.length === 0) {
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
    let rootComments: Comment[] = [];
    const replyMap = new Map<number, Comment[]>();

    // Check if comments already have replies embedded
    const hasEmbeddedReplies = comments.some(c => c.replies && Array.isArray(c.replies) && c.replies.length > 0);
    
    if (hasEmbeddedReplies) {
      // Comments already have replies embedded - use them directly
      rootComments = comments.filter(c => !(c.parentId || c.parent_id));
      console.log('📊 Using embedded replies structure, root comments:', rootComments.length);
      console.log('📊 Sample comment with replies:', rootComments.find(c => c.replies && c.replies.length > 0));
    } else {
      // Group comments by parent manually - handle both parentId and parent_id
      rootComments = comments.filter(c => !(c.parentId || c.parent_id));
      
      comments.filter(c => c.parentId || c.parent_id).forEach(reply => {
        const parentId = reply.parentId || reply.parent_id;
        if (parentId) {
          if (!replyMap.has(parentId)) {
            replyMap.set(parentId, []);
          }
          replyMap.get(parentId)!.push(reply);
        }
      });
      console.log('📊 Using manual grouping structure, root comments:', rootComments.length, 'reply groups:', replyMap.size);
    }

    // Render comments
    commentsList.innerHTML = rootComments.map(comment => {
      // Use embedded replies if available, otherwise use grouped replies
      const replies = comment.replies || replyMap.get(comment.id) || [];
      console.log(`📊 Rendering comment ${comment.id} with ${replies.length} replies`);
      return this.renderComment(comment, replies);
    }).join('');
    
    // Disable like/dislike buttons for user's own comments after rendering
    setTimeout(() => {
      disableOwnCommentButtons(this.currentUser, this.translations);
    }, 100);
  }

  private renderComment(comment: Comment, replies: Comment[] = []): string {
    // Handle field mappings between API and frontend
    const authorId = comment.authorId || comment.user_id;
    const canEdit = this.currentUser && (this.currentUser.id === authorId || this.currentUser.rank === 'admin');
    const canDelete = this.currentUser && (this.currentUser.id === authorId || this.currentUser.rank === 'admin');
    
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

    // Log rendering details for debugging
    if (this.isDev && replies.length > 0) {
      console.log(`🎨 Rendering comment ${comment.id} with ${replies.length} replies:`, replies.map(r => ({id: r.id, content: r.content?.substring(0, 50)})));
    }

    return `
      <div class="comment bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-4" data-comment-id="${comment.id}">
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
              ${replies.length > 0 ? `<span class="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-full">${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}</span>` : ''}
            </div>
            
            <div class="comment-content text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4">
              ${comment.content}
            </div>
            
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <!-- Like/Dislike buttons -->
                ${this.currentUser ? `
                  <button 
                    class="like-btn flex items-center space-x-1 text-xs px-2 py-1 rounded-md transition-all duration-200 ${isLiked ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-green-600'}"
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
                    class="dislike-btn flex items-center space-x-1 text-xs px-2 py-1 rounded-md transition-all duration-200 ${isDisliked ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:text-red-600'}"
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
                  <span class="flex items-center space-x-1 text-xs text-gray-400">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 7m-5 4v6m4-6v6m8-4V7"></path>
                    </svg>
                    <span>${likesCount}</span>
                  </span>
                  <span class="flex items-center space-x-1 text-xs text-gray-400">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L15 17m-8-4v-6m4 6v-6m-8 4V7"></path>
                    </svg>
                    <span>${dislikesCount}</span>
                  </span>
                `}
                
                ${this.currentUser ? `
                  <button 
                    class="reply-btn text-xs text-blue-600 hover:text-blue-800 font-medium"
                    data-action="reply" 
                    data-id="${comment.id}"
                  >
                    ${this.translations['comments.reply'] || 'Reply'}
                  </button>
                ` : ''}
              </div>
              
              <div class="flex items-center space-x-2">
                ${canEdit ? `
                  <button 
                    class="edit-btn text-xs text-yellow-600 hover:text-yellow-800"
                    data-action="edit" 
                    data-id="${comment.id}"
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
            
            <!-- Reply Form (when replying) -->
            <div class="reply-form-container mt-4" id="reply-form-${comment.id}" style="display: none;"></div>
            
            <!-- Replies -->
            ${replies.length > 0 ? `
              <div class="replies mt-4 pl-4 border-l-2 border-gray-200 dark:border-gray-600 space-y-3">
                <div class="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">
                  ${replies.length} ${replies.length === 1 ? (this.translations['comments.reply'] || 'Reply') : (this.translations['comments.replies'] || 'Replies')}
                </div>
                ${replies.map(reply => this.renderReply(reply)).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  private renderReply(reply: Comment): string {
    // Handle field mappings between API and frontend
    const authorId = reply.authorId || reply.user_id;
    const canEdit = this.currentUser && (this.currentUser.id === authorId || this.currentUser.rank === 'admin');
    const canDelete = this.currentUser && (this.currentUser.id === authorId || this.currentUser.rank === 'admin');
    
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
      <div class="reply bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-600 p-4 mb-3" data-comment-id="${reply.id}">
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
              ${reply.content}
            </div>
            
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <!-- Like/Dislike buttons for replies -->
                ${this.currentUser ? `
                  <button 
                    class="like-btn flex items-center space-x-1 text-xs px-2 py-1 rounded-md transition-all duration-200 ${isLiked ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-green-600'}"
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
                    class="dislike-btn flex items-center space-x-1 text-xs px-2 py-1 rounded-md transition-all duration-200 ${isDisliked ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:text-red-600'}"
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
                  <span class="flex items-center space-x-1 text-xs text-gray-400">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 7m-5 4v6m4-6v6m8-4V7"></path>
                    </svg>
                    <span>${likesCount}</span>
                  </span>
                  <span class="flex items-center space-x-1 text-xs text-gray-400">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.60L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L15 17m-8-4v-6m4 6v-6m-8 4V7"></path>
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
    
    if (!button) return;

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
    // Implementation for edit functionality
    console.log('Edit comment:', commentId);
    // You can add edit form creation logic here
  }

  private async handleDeleteComment(commentId: number): Promise<void> {
    if (!confirm(this.translations['comments.confirmDelete'] || 'Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      const deleteUrl = this.apiUrls.deleteCommentTemplate.replace('{id}', commentId.toString());
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete comment: ${response.status}`);
      }

      this.showSuccess(this.translations['comments.deleted'] || 'Comment deleted successfully');
      await this.loadComments();

    } catch (error) {
      console.error('❌ Error deleting comment:', error);
      this.showError('Failed to delete comment');
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
    if ('NotificationManager' in window) {
      const nm = (window as { NotificationManager: { success: (msg: string) => void } }).NotificationManager;
      nm?.success(message);
    } else {
      // Show success message in a non-intrusive way
      console.log(`✅ Success: ${message}`);
      this.showInlineMessage(message, 'success');
    }
  }

  private showError(message: string): void {
    if ('NotificationManager' in window) {
      const nm = (window as { NotificationManager: { error: (msg: string) => void } }).NotificationManager;
      nm?.error(message);
    } else {
      // Show error message in a non-intrusive way
      console.error(`❌ Error: ${message}`);
      this.showInlineMessage(message, 'error');
    }
  }

  private showInlineMessage(message: string, type: 'success' | 'error'): void {
    // Create or get existing message container
    let messageContainer = document.getElementById('comments-message-container');
    if (!messageContainer) {
      messageContainer = document.createElement('div');
      messageContainer.id = 'comments-message-container';
      messageContainer.className = 'fixed top-4 right-4 z-50';
      document.body.appendChild(messageContainer);
    }

    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `px-4 py-3 rounded-md shadow-md text-sm font-medium transition-all duration-300 mb-2 ${
      type === 'success' 
        ? 'bg-green-100 border border-green-400 text-green-700' 
        : 'bg-red-100 border border-red-400 text-red-700'
    }`;
    messageEl.textContent = message;

    // Add to container
    messageContainer.appendChild(messageEl);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      messageEl.style.opacity = '0';
      setTimeout(() => {
        if (messageEl.parentNode) {
          messageEl.parentNode.removeChild(messageEl);
        }
      }, 300);
    }, 3000);
  }

  // Public methods for external use
  public async refreshComments(): Promise<void> {
    await this.loadComments();
  }

  public reset(): void {
    this.isInitialized = false;
    this.currentUser = null;
  }

  // Add real comment from API response
  public addRealComment(comment: Comment): void {
    if (!comment) return;

    if (this.isDev) {
      console.log('✨ Adding real comment from API:', comment);
    }

    const commentsList = document.getElementById('comments-list');
    if (!commentsList) return;

    // Add as new root comment at the top
    const realCommentHtml = this.renderComment(comment);
    commentsList.insertAdjacentHTML('afterbegin', realCommentHtml);
    
    // Disable like/dislike buttons for user's own comments after rendering
    setTimeout(() => {
      disableOwnCommentButtons(this.currentUser, this.translations);
    }, 100);
  }

  // Add real reply from API response
  public addRealReply(reply: Comment, parentId: number): void {
    if (!reply || !parentId) return;

    if (this.isDev) {
      console.log('✨ Adding real reply from API:', reply, 'to parent:', parentId);
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
    
    // Update reply count badge in parent comment header
    const parentHeader = parentElement.querySelector('.flex.items-center.space-x-2.mb-2');
    if (parentHeader) {
      const badge = parentHeader.querySelector('.text-blue-500.bg-blue-50');
      const allReplies = parentElement.querySelectorAll('.reply').length;
      
      if (badge) {
        badge.textContent = `${allReplies} ${allReplies === 1 ? 'reply' : 'replies'}`;
      } else if (allReplies > 0) {
        const badgeHtml = `<span class="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-full">${allReplies} ${allReplies === 1 ? 'reply' : 'replies'}</span>`;
        parentHeader.insertAdjacentHTML('beforeend', badgeHtml);
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
      console.log('✨ Added optimistic comment:', tempComment);
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
              ${comment.content}
            </div>
            
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <span class="flex items-center space-x-1 text-xs text-gray-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 7m-5 4v6m4-6v6m8-4V7"></path>
                  </svg>
                  <span>0</span>
                </span>
                <span class="flex items-center space-x-1 text-xs text-gray-400">
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
              ${reply.content}
            </div>
            
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <span class="flex items-center space-x-1 text-xs text-gray-400">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.60L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 7m-5 4v6m4-6v6m8-4V7"></path>
                  </svg>
                  <span>0</span>
                </span>
                <span class="flex items-center space-x-1 text-xs text-gray-400">
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

export function initCommentsPage(lang: string): void {
  // Prevent multiple initializations
  if (globalCommentsManager) {
    if (import.meta.env.DEV) {
      console.log('ℹ️ Comments manager already initialized, skipping...');
    }
    return;
  }

  const commentsContainer = document.getElementById('comments-section-wrapper');
  if (!commentsContainer) {
    if (import.meta.env.DEV) {
      console.log('ℹ️ Comments container not found on this page, skipping initialization.');
    }
    return;
  }

  const { postId, translations, apiUrls, isDev } = commentsContainer.dataset;

  if (!postId) {
    console.error('❌ Post ID not found in comments container dataset. Cannot initialize comments.');
    return;
  }

  try {
    const parsedTranslations = JSON.parse(translations || '{}');
    const parsedApiUrls = JSON.parse(apiUrls || '{}');
    const devMode = isDev === 'true';

    globalCommentsManager = new EnhancedCommentsManager(postId, lang, parsedTranslations, parsedApiUrls, devMode);
    
    if (import.meta.env.DEV) {
      console.log('✅ Comments manager initialized successfully');
    }
  } catch (error) {
    console.error('❌ Failed to parse data attributes for comments initialization:', error);
  }
}
