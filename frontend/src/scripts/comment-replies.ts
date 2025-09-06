// Comment replies functionality  
import type { Comment } from '../types/blog.ts';
import { AuthHelper } from '../utils/authHelper.ts';
import { API_CONFIG } from '../config/api.ts';

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

// Main reply handler function
export function handleReply(
  commentId: number,
  postId: string,
  currentUser: User | null,
  translations: Translations,
  showError: (message: string) => void,
  showSuccess?: (message: string) => void,
  loadComments?: () => Promise<void>,
  isLoadingComments?: boolean,
  addRealReply?: (reply: Comment, parentId: number) => void
): void {
  console.log('Reply to comment:', commentId);
  
  // Check authentication
  if (!currentUser) {
    const loginRequiredText = translations['comments.loginRequired'] || 'Please login to reply';
    showError(loginRequiredText);
    return;
  }
  
  // Find the comment element
  const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`) as HTMLElement;
  if (!commentElement) {
    console.error('Comment element not found for ID:', commentId);
    return;
  }
  
  // Check if reply form already exists
  const existingReplyForm = commentElement.querySelector('.reply-form');
  if (existingReplyForm) {
    existingReplyForm.remove(); // Remove existing form
    return;
  }
  
  // Create reply form
  const replyForm = document.createElement('div');
  replyForm.className = 'reply-form mt-4 bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700';
  
  // Get the username to display in "Replying to" section
  const usernameElement = commentElement.querySelector('h4');
  const replyToUsername = usernameElement ? usernameElement.textContent : 'user';
  
  replyForm.innerHTML = `
    <div class="flex items-start space-x-3">
      <!-- User Avatar -->
      <div class="flex-shrink-0">
        <div class="w-7 h-7 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
          ${currentUser.username ? currentUser.username.charAt(0).toUpperCase() : currentUser.email.charAt(0).toUpperCase()}
        </div>
      </div>
      
      <!-- Reply Form Content -->
      <div class="flex-1">
        <form class="reply-form-content">
          <div class="mb-3">
            <textarea 
              name="reply-content" 
              rows="3" 
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 text-sm resize-none placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="${translations['comments.writeReply'] || 'Write your reply...'}"
              required
            ></textarea>
          </div>
          <div class="flex items-center justify-between">
            <div class="flex space-x-2">
              <button 
                type="submit" 
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
                <span>${translations['comments.submitReply'] || 'Reply'}</span>
              </button>
              <button 
                type="button" 
                class="cancel-reply bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              >
                ${translations['comments.cancel'] || 'Cancel'}
              </button>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              ${translations['comments.replyTo'] || 'Replying to'} <strong>${replyToUsername}</strong>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
  
  // Add reply form to comment
  commentElement.appendChild(replyForm);
  
  // Add event listeners
  const form = replyForm.querySelector('.reply-form-content') as HTMLFormElement;
  const cancelBtn = replyForm.querySelector('.cancel-reply') as HTMLButtonElement;
  
  if (form) {
    form.addEventListener('submit', (e) => {
      handleSubmitReply(e, commentId, postId, translations, showError, showSuccess, loadComments, isLoadingComments, addRealReply);
    });
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => replyForm.remove());
  }
  
  // Focus on textarea
  const textarea = replyForm.querySelector('textarea') as HTMLTextAreaElement;
  if (textarea) {
    textarea.focus();
  }
}

// Submit reply handler
export async function handleSubmitReply(
  e: Event,
  parentCommentId: number,
  postId: string,
  translations: Translations,
  showError: (message: string) => void,
  showSuccess?: (message: string) => void,
  loadComments?: () => Promise<void>,
  isLoadingComments?: boolean,
  addRealReply?: (reply: Comment, parentId: number) => void
): Promise<void> {
  e.preventDefault();
  
  const form = e.target as HTMLFormElement;
  const formData = new FormData(form);
  const content = (formData.get('reply-content') as string)?.trim();
  
  if (!content) {
    const requiredText = translations['comments.required'] || 'Reply content is required';
    showError(requiredText);
    return;
  }

  // Disable submit button during request
  const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
  const originalText = submitBtn?.textContent || '';
  const postingText = translations['comments.posting'] || 'Posting...';
  
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = postingText;
  }

  try {
    // Remove reply form immediately for better UX
    const replyForm = form.closest('.reply-form');
    if (replyForm) {
      replyForm.remove();
    }

    // Use the correct URL format: /api/comments/post/{post_id}
    const url = `${API_CONFIG.comments}/post/${postId}`;
    console.log('Creating reply at URL:', url, 'for parent:', parentCommentId);
    
    // Use AuthHelper for automatic token refresh
    const response = await AuthHelper.makeAuthenticatedRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: content,
        parent_id: parentCommentId // ID komentarza na który odpowiadamy
      })
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('❌ API Error Response:', errorData);
      } catch (parseError) {
        console.error('❌ Failed to parse error response:', parseError);
        errorData = {};
      }
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Try to get the reply data from API response
    let result;
    try {
      result = await response.json();
      console.log('✅ Reply created successfully:', result);
      
      // Add the real reply from API response immediately
      if (result && (result.id || result.reply) && addRealReply) {
        const replyFromApi = result.reply || result;
        console.log('✨ Adding real reply from API response:', replyFromApi);
        addRealReply(replyFromApi, parentCommentId);
        
        const successText = translations['comments.replySuccess'] || 'Reply added successfully';
        if (showSuccess) {
          showSuccess(successText);
        }
        
        console.log('✅ Reply posted successfully');
        return; // Exit early since we added the reply directly
      }
      
    } catch {
      console.log('✅ Reply created (no JSON response), reloading comments');
      // If no JSON response, reload comments to get the new reply
      if (loadComments && !isLoadingComments) {
        await loadComments();
      }
      result = { success: true };
    }

    // Fallback: reload comments if API didn't return reply data
    console.log('🔄 Fallback: reloading comments to sync with server');
    if (loadComments && !isLoadingComments) {
      await loadComments();
    }
    
    const successText = translations['comments.replySuccess'] || 'Reply added successfully';
    if (showSuccess) {
      showSuccess(successText);
    }
    
    console.log('✅ Reply posted successfully');

  } catch (error) {
    console.error('❌ Error posting reply:', error);
    
    // If error occurred, reload comments to sync with server state
    if (loadComments && !isLoadingComments) {
      await loadComments();
    }
    
    const errorText = translations['comments.error'] || 'Error adding reply';
    showError(errorText);
  } finally {
    // Re-enable submit button
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }
}

// Enhanced submit reply handler with all dependencies
export async function handleSubmitReplyWithDependencies(
  e: Event,
  parentCommentId: number,
  postId: string,
  translations: Translations,
  apiUrls: ApiUrls,
  showError: (message: string) => void,
  showSuccess: (message: string) => void,
  loadComments: () => Promise<void>,
  isLoadingComments: boolean,
  addRealReply?: (reply: Comment, parentId: number) => void
): Promise<void> {
  await handleSubmitReply(
    e,
    parentCommentId,
    postId,
    translations,
    showError,
    showSuccess,
    loadComments,
    isLoadingComments,
    addRealReply
  );
}
