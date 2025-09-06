// Like/Dislike functionality for comments
interface PendingLikeState {
  likeState: boolean | null;
  likes: number;
  dislikes: number;
  action: 'like' | 'dislike';
  originalState?: string;
  originalLikes?: number;
  originalDislikes?: number;
  likeBtn?: HTMLElement;
  dislikeBtn?: HTMLElement;
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

// Enhanced likes functionality with debouncing and UI feedback
import { AuthHelper } from '../utils/authHelper.ts';

// Types
export class DebouncedLikes {
  private debounceTimers = new Map<number, NodeJS.Timeout>();
  private pendingStates = new Map<number, PendingLikeState>();

  async debouncedToggleLike(commentId: number, action: 'like' | 'dislike', delay: number = 500): Promise<void> {
    console.log(`🎯 DebouncedLikes.debouncedToggleLike: commentId=${commentId}, action=${action}`);
    
    // Clear any existing timer for this comment
    if (this.debounceTimers.has(commentId)) {
      clearTimeout(this.debounceTimers.get(commentId)!);
      console.log(`⏰ Cleared existing timer for comment ${commentId}`);
    }

    // Get current UI state
    const likeBtn = document.querySelector(`[data-action="like"][data-id="${commentId}"]`) as HTMLElement;
    const dislikeBtn = document.querySelector(`[data-action="dislike"][data-id="${commentId}"]`) as HTMLElement;
    
    console.log(`🔍 Found buttons:`, { likeBtn: !!likeBtn, dislikeBtn: !!dislikeBtn });
    
    if (!likeBtn || !dislikeBtn) {
      console.error(`❌ Buttons not found for comment ${commentId}`);
      return;
    }

    // Additional safety check - verify this is not user's own comment
    const authorId = likeBtn.dataset.authorId || dislikeBtn.dataset.authorId;
    if (authorId) {
      console.log(`🔒 Double-checking author ID: ${authorId} for comment ${commentId}`);
      // This is an additional safety layer - the main check should happen in handleLikeDislike
      // But we add this as a fallback in case someone calls this method directly
    }

    const currentState = likeBtn.dataset.currentState;
    const currentLikes = parseInt((likeBtn.querySelector('.like-count') as HTMLElement)?.textContent || '0') || 0;
    const currentDislikes = parseInt((dislikeBtn.querySelector('.dislike-count') as HTMLElement)?.textContent || '0') || 0;
    
    console.log(`📊 Current state: ${currentState}, likes: ${currentLikes}, dislikes: ${currentDislikes}`);

    // Calculate optimistic state with improved logic
    let newLikeState: boolean | null = null;
    let newLikes = currentLikes;
    let newDislikes = currentDislikes;

    if (action === 'like') {
      if (currentState === 'true') {
        // User already liked, remove like
        newLikeState = null;
        newLikes = Math.max(0, currentLikes - 1);
        console.log(`👎 Removing like: ${currentLikes} -> ${newLikes}`);
      } else if (currentState === 'false') {
        // User disliked, switch to like
        newLikeState = true;
        newLikes = currentLikes + 1;
        newDislikes = Math.max(0, currentDislikes - 1);
        console.log(`👍 Switching from dislike to like: likes ${currentLikes} -> ${newLikes}, dislikes ${currentDislikes} -> ${newDislikes}`);
      } else {
        // User neutral, add like
        newLikeState = true;
        newLikes = currentLikes + 1;
        console.log(`👍 Adding like: ${currentLikes} -> ${newLikes}`);
      }
    } else if (action === 'dislike') {
      if (currentState === 'false') {
        // User already disliked, remove dislike
        newLikeState = null;
        newDislikes = Math.max(0, currentDislikes - 1);
        console.log(`👍 Removing dislike: ${currentDislikes} -> ${newDislikes}`);
      } else if (currentState === 'true') {
        // User liked, switch to dislike
        newLikeState = false;
        newDislikes = currentDislikes + 1;
        newLikes = Math.max(0, currentLikes - 1);
        console.log(`👎 Switching from like to dislike: dislikes ${currentDislikes} -> ${newDislikes}, likes ${currentLikes} -> ${newLikes}`);
      } else {
        // User neutral, add dislike
        newLikeState = false;
        newDislikes = currentDislikes + 1;
        console.log(`👎 Adding dislike: ${currentDislikes} -> ${newDislikes}`);
      }
    }

    console.log(`🔄 New state will be: ${newLikeState}, likes: ${newLikes}, dislikes: ${newDislikes}`);

    // Store pending state for this comment with original values for reversion
    this.pendingStates.set(commentId, {
      likeState: newLikeState,
      likes: newLikes,
      dislikes: newDislikes,
      action: action,
      originalState: currentState,
      originalLikes: currentLikes,
      originalDislikes: currentDislikes,
      likeBtn: likeBtn,
      dislikeBtn: dislikeBtn
    });

    // Update UI immediately (optimistic update)
    this.updateLikeButtonsUI(commentId, newLikeState, newLikes, newDislikes);

    // Set debounced timer for API call
    const timer = setTimeout(async () => {
      console.log(`⏰ Timer fired for comment ${commentId}, making API call...`);
      const pendingState = this.pendingStates.get(commentId);
      if (pendingState) {
        try {
          await this.sendLikeToServer(commentId, pendingState.action, pendingState.likeState);
          this.pendingStates.delete(commentId);
        } catch (error) {
          console.error(`❌ Failed to send ${pendingState.action} to server:`, error);
          // Revert UI changes on error
          this.revertUIChanges(commentId);
          // Re-throw error to be handled by caller
          throw error;
        }
      }
      this.debounceTimers.delete(commentId);
    }, delay);

    this.debounceTimers.set(commentId, timer);
    console.log(`⏱️ Timer set for comment ${commentId} with ${delay}ms delay`);
  }

  private updateLikeButtonsUI(commentId: number, likeState: boolean | null, likes: number, dislikes: number): void {
    const likeBtn = document.querySelector(`[data-action="like"][data-id="${commentId}"]`) as HTMLElement;
    const dislikeBtn = document.querySelector(`[data-action="dislike"][data-id="${commentId}"]`) as HTMLElement;

    if (!likeBtn || !dislikeBtn) return;

    // Update counts
    const likeCount = likeBtn.querySelector('.like-count') as HTMLElement;
    const dislikeCount = dislikeBtn.querySelector('.dislike-count') as HTMLElement;
    
    if (likeCount) likeCount.textContent = likes.toString();
    if (dislikeCount) dislikeCount.textContent = dislikes.toString();

    // Update button states
    likeBtn.dataset.currentState = likeState === null ? '' : likeState.toString();
    dislikeBtn.dataset.currentState = likeState === null ? '' : likeState.toString();

    // Update visual state
    const likeIsActive = likeState === true;
    const dislikeIsActive = likeState === false;

    // Update SVG fill states
    const likeSvg = likeBtn.querySelector('svg');
    const dislikeSvg = dislikeBtn.querySelector('svg');
    
    if (likeSvg) {
      likeSvg.setAttribute('fill', likeIsActive ? 'currentColor' : 'none');
    }
    
    if (dislikeSvg) {
      dislikeSvg.setAttribute('fill', dislikeIsActive ? 'currentColor' : 'none');
    }

    // Update like button classes with new modern design
    if (likeIsActive) {
      likeBtn.className = 'like-btn flex items-center space-x-2 px-4 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-semibold border-2 text-blue-600 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700';
    } else {
      likeBtn.className = 'like-btn flex items-center space-x-2 px-4 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-semibold border-2 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600';
    }

    // Update dislike button classes with new modern design
    if (dislikeIsActive) {
      dislikeBtn.className = 'dislike-btn flex items-center space-x-2 px-4 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-semibold border-2 text-red-600 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700';
    } else {
      dislikeBtn.className = 'dislike-btn flex items-center space-x-2 px-4 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-semibold border-2 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600';
    }
  }

  private async sendLikeToServer(commentId: number, action: 'like' | 'dislike', likeState: boolean | null): Promise<void> {
    try {
      // Use API_URLS helper function instead of constructing URL manually
      const { API_URLS } = await import('~/config/api');
      const url = API_URLS.likeComment(commentId);
      
      console.log(`📡 Sending ${action} request for comment ${commentId} to: ${url}`);
      console.log(`📤 Request body:`, { is_like: likeState === true });
      
      // Use AuthHelper for automatic token refresh
      const response = await AuthHelper.makeAuthenticatedRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_like: likeState === true
        })
      });

      console.log(`📥 Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('❌ API Error Response:', errorData);
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError);
          errorData = {};
        }
        
        // Handle specific error codes
        if (errorData.detail?.translation_code === 'SELF_LIKE_ERROR') {
          throw new Error('SELF_LIKE_ERROR');
        }
        
        throw new Error(errorData.detail?.message || errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Successfully sent ${action} for comment ${commentId}:`, result);

      // Optionally update UI with server response to ensure consistency
      if (result.likes !== undefined && result.dislikes !== undefined) {
        this.updateLikeButtonsUI(commentId, result.userLikeStatus, result.likes, result.dislikes);
      }

    } catch (error) {
      console.error(`❌ Error sending ${action} for comment ${commentId}:`, error);
      // Revert optimistic update on error
      // You might want to reload comments or show an error message
      throw error; // Re-throw to be handled by caller
    }
  }

  private revertUIChanges(commentId: number): void {
    // Find original state before optimistic update
    console.log(`🔄 Reverting UI changes for comment ${commentId}`);
    
    const pendingState = this.pendingStates.get(commentId);
    if (!pendingState) {
      console.warn(`⚠️ No pending state found for comment ${commentId}, cannot revert`);
      return;
    }

    const { originalState, originalLikes, originalDislikes, likeBtn, dislikeBtn } = pendingState;
    
    if (likeBtn && dislikeBtn && originalState !== undefined && originalLikes !== undefined && originalDislikes !== undefined) {
      // Parse original state back to boolean | null
      const originalLikeState = originalState === 'true' ? true : originalState === 'false' ? false : null;
      
      // Revert to original state
      this.updateLikeButtonsUI(commentId, originalLikeState, originalLikes, originalDislikes);
      
      console.log(`✅ Reverted comment ${commentId} to original state: ${originalState}, likes: ${originalLikes}, dislikes: ${originalDislikes}`);
    } else {
      console.warn(`⚠️ Missing revert data for comment ${commentId}`);
    }
    
    // Remove pending state
    this.pendingStates.delete(commentId);
  }

  // Clean up method for component unmount
  cleanup(): void {
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.pendingStates.clear();
  }
}

// Handler function for like/dislike actions
export async function handleLikeDislike(
  commentId: number, 
  action: 'like' | 'dislike', 
  currentUser: User | null, 
  translations: Translations,
  debouncedLikes: DebouncedLikes,
  showError: (message: string) => void
): Promise<void> {
  console.log(`🎯 handleLikeDislike: commentId=${commentId}, action=${action}`);
  
  if (!currentUser) {
    const errorMsg = translations['comments.loginRequired'] || 'You must be logged in to vote';
    console.log('❌ User not logged in');
    showError(errorMsg);
    return;
  }

  // Check if comment is deleted
  const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`) as HTMLElement;
  if (commentElement) {
    const isDeleted = commentElement.dataset.isDeleted === 'true';
    if (isDeleted) {
      console.log(`❌ Cannot like/dislike deleted comment ${commentId}`);
      const errorMsg = translations['comments.deletedComment'] || 'This comment has been deleted';
      showError(errorMsg);
      return;
    }
  }

  // Check if user is trying to like/dislike their own comment
  const button = document.querySelector(`[data-action="${action}"][data-id="${commentId}"]`) as HTMLElement;
  const authorId = button?.dataset.authorId;
  
  if (authorId && parseInt(authorId) === currentUser.id) {
    console.log('ℹ️ User clicked on their own comment like/dislike button - ignoring action');
    // Simply return without doing anything or showing error
    // This allows the buttons to be visible but non-functional for own comments
    return;
  }

  try {
    console.log(`📡 Processing ${action} for comment ${commentId}...`);
    await debouncedLikes.debouncedToggleLike(commentId, action);
    console.log(`✅ ${action} processed successfully for comment ${commentId}`);
  } catch (error) {
    console.error(`❌ Error processing ${action} for comment ${commentId}:`, error);
    
    if ((error as Error).message === 'SELF_LIKE_ERROR') {
      const errorMsg = translations['comments.selfLikeError'] || 'Nie możesz polubić własnego komentarza';
      showError(errorMsg);
    } else {
      const errorMsg = translations['comments.likeError'] || 'Błąd podczas oceniania komentarza';
      showError(errorMsg);
    }
  }
}

// Function to disable like/dislike buttons for user's own comments
export function disableOwnCommentButtons(currentUser: User | null, translations?: Translations): void {
  if (!currentUser) return;

  // Find all like/dislike buttons
  const likeButtons = document.querySelectorAll('[data-action="like"]');
  const dislikeButtons = document.querySelectorAll('[data-action="dislike"]');

  [...likeButtons, ...dislikeButtons].forEach(button => {
    const htmlButton = button as HTMLElement;
    const authorId = htmlButton.dataset.authorId;
    
    if (authorId && parseInt(authorId) === currentUser.id) {
      // Disable the button and add visual indicator
      htmlButton.style.opacity = '0.5';
      htmlButton.style.cursor = 'not-allowed';
      htmlButton.style.pointerEvents = 'none';
      
      // Add a title attribute for tooltip with translation support
      const tooltipText = translations?.['comments.ownCommentTooltip'] || 'You cannot like/dislike your own comment';
      htmlButton.title = tooltipText;
      
      console.log(`🚫 Disabled like/dislike button for own comment ID: ${htmlButton.dataset.id}`);
    }
  });
}
