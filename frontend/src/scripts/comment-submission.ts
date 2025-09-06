// Comment submission functionality
import type { Comment } from '../types/blog.ts';
import { AuthHelper } from '../utils/authHelper.ts';

interface CommentData {
  postId: number;
  content: string;
  parentId?: number | null;
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

// Main comment submission handler
export async function handleSubmitComment(
  e: Event,
  postId: string,
  currentUser: User | null,
  translations: Translations,
  apiUrls: ApiUrls,
  showError: (message: string) => void,
  showSuccess: (message: string) => void,
  loadComments: () => Promise<void>,
  addRealComment: (comment: Comment) => void,
  isDev: boolean = false
): Promise<void> {
  e.preventDefault();
  
  const form = e.target as HTMLFormElement;
  const formData = new FormData(form);
  const content = (formData.get('content') as string)?.trim();

  if (!content) {
    console.log('❌ Comment content is required');
    showError(translations['comments.contentRequired'] || 'Content is required');
    return;
  }

  if (!currentUser) {
    console.log('❌ User must be logged in to comment');
    showError(translations['comments.loginRequired'] || 'You must be logged in to comment');
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
  const originalText = submitBtn?.textContent || '';
  
  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = translations['comments.posting'] || 'Posting...';
    }

    const commentData: CommentData = {
      postId: parseInt(postId),
      content: content
    };

    // Clear form immediately for better UX
    form.reset();

    if (isDev) {
      console.log('📤 About to send comment:', {
        url: apiUrls.createPostComment,
        data: commentData,
        postId: postId,
        hasUser: !!currentUser,
        userInfo: currentUser ? { id: currentUser.id, username: currentUser.username } : 'not logged in'
      });
    }

    // Use AuthHelper for automatic token refresh
    const response = await AuthHelper.makeAuthenticatedRequest(apiUrls.createPostComment, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commentData)
    });

    if (isDev) {
      console.log('📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
    }

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

    let result;
    try {
      result = await response.json();
      if (isDev) {
        console.log('✅ Comment created successfully:', result);
      }
      
      // Add the real comment from API response immediately
      if (result && (result.id || result.comment)) {
        const commentFromApi = result.comment || result;
        if (isDev) {
          console.log('✨ Adding real comment from API response:', commentFromApi);
        }
        addRealComment(commentFromApi);
        
        // Show success message
        showSuccess(translations['comments.success'] || 'Comment posted successfully!');
        if (isDev) {
          console.log('✅ Comment posted successfully!');
        }
        return; // Exit early since we added the comment directly
      }
      
    } catch {
      if (isDev) {
        console.log('✅ Comment created (no JSON response), reloading comments');
      }
      // If no JSON response, reload comments to get the new comment
      await loadComments();
      result = { success: true };
    }

    // Fallback: reload comments if API didn't return comment data
    if (isDev) {
      console.log('🔄 Fallback: reloading comments to sync with server');
    }
    
    await loadComments();

    // Show success message
    showSuccess(translations['comments.success'] || 'Comment posted successfully!');
    if (isDev) {
      console.log('✅ Comment posted successfully!');
    }

  } catch (error) {
    console.error('❌ Error submitting comment:', error);
    
    // If error occurred, reload comments to remove optimistic comment and show actual state
    if (isDev) {
      console.log('❌ Error occurred, reloading comments to sync with server');
    }
    await loadComments();
    
    showError((error as Error).message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }
}
