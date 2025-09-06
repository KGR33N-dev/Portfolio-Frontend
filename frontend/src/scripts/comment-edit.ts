// Comment editing functionality
import { AuthHelper } from '../utils/authHelper.ts';

// Comment interface matching the actual API structure used in comments.ts
interface ApiComment {
  id: number;
  postId?: number;
  post_id?: number;
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
  parent_id?: number | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  approved?: boolean;
  likes?: number;
  likes_count?: number;
  dislikes?: number;
  dislikes_count?: number;
  userLikeStatus?: boolean | null;
  user_like_status?: boolean | null;
  authorId?: number;
  user_id?: number;
  canEdit?: boolean;
  can_edit?: boolean;
  canDelete?: boolean;
  can_delete?: boolean;
  replies?: ApiComment[];
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

interface Translations {
  [key: string]: string;
}

interface ApiUrls {
  updateCommentTemplate: string;
}

// Check if comment can be edited (15 minutes limit)
export function canEditComment(comment: ApiComment, currentUser: User | null): boolean {
  console.log(`🔍 canEditComment check for comment ${comment.id}:`, {
    currentUser: currentUser?.username,
    currentUserId: currentUser?.id,
    commentAuthorId: comment.authorId || comment.user_id,
    commentCreatedAt: comment.createdAt || comment.created_at,
    canEditFromAPI: comment.canEdit || comment.can_edit
  });

  if (!currentUser) {
    console.log('❌ No current user');
    return false;
  }
  
  // Admin can always edit
  if (currentUser.rank === 'admin') {
    console.log('✅ User is admin - can edit');
    return true;
  }
  
  // Check if user owns the comment
  const commentAuthorId = comment.authorId || comment.user_id;
  if (currentUser.id !== commentAuthorId) {
    console.log('❌ User does not own comment');
    return false;
  }
  
  // Check 15-minute edit window
  const createdAt = comment.createdAt || comment.created_at;
  if (!createdAt) {
    console.log('❌ No created date');
    return false;
  }
  
  const commentDate = new Date(createdAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - commentDate.getTime()) / (1000 * 60);
  
  console.log(`⏰ Time check: ${diffMinutes.toFixed(2)} minutes elapsed, limit is 15 minutes`);
  
  const canEdit = diffMinutes <= 15;
  console.log(`${canEdit ? '✅' : '❌'} Time-based edit permission: ${canEdit}`);
  
  return canEdit;
}

// Get remaining edit time in minutes
export function getRemainingEditTime(comment: ApiComment): number {
  const createdAt = comment.createdAt || comment.created_at;
  if (!createdAt) return 0;
  
  const commentDate = new Date(createdAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - commentDate.getTime()) / (1000 * 60);
  
  return Math.max(0, 15 - diffMinutes);
}

// Show edit form for comment
export function showEditForm(
  commentId: number,
  currentUser: User | null,
  translations: Translations,
  showError: (message: string) => void
): void {
  if (!currentUser) {
    showError(translations['comments.loginRequired'] || 'You must be logged in to edit comments');
    return;
  }

  const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
  if (!commentElement) {
    showError(translations['comments.commentNotFound'] || 'Comment not found');
    return;
  }

  const contentElement = commentElement.querySelector('.comment-content, .reply-content');
  if (!contentElement) {
    showError(translations['comments.contentNotFound'] || 'Comment content not found');
    return;
  }

  const originalContent = contentElement.textContent?.trim() || '';
  
  // Create edit form
  const editForm = createEditForm(commentId, originalContent, translations);
  
  // Hide original content and show edit form
  (contentElement as HTMLElement).style.display = 'none';
  contentElement.insertAdjacentHTML('afterend', editForm);
  
  // Focus on textarea
  const textarea = commentElement.querySelector('#edit-textarea') as HTMLTextAreaElement;
  if (textarea) {
    textarea.focus();
    // Place cursor at end
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }
}

// Create edit form HTML
function createEditForm(commentId: number, originalContent: string, translations: Translations): string {
  return `
    <div id="edit-form-${commentId}" class="edit-form mt-2">
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
        <div class="mb-3">
          <textarea
            id="edit-textarea"
            class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white resize-vertical min-h-[100px]"
            placeholder="${translations['comments.editPlaceholder'] || 'Edit your comment...'}"
            maxlength="2000"
          >${originalContent}</textarea>
          <div class="flex justify-between items-center mt-2 text-xs text-gray-500">
            <span class="edit-info">
              <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              ${translations['comments.editTimeLimit'] || 'You can edit this comment for 15 minutes after posting'}
            </span>
            <span id="char-count-${commentId}">0/2000</span>
          </div>
        </div>
        
        <div class="flex justify-end space-x-2">
          <button
            type="button"
            class="cancel-edit-btn px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
            data-comment-id="${commentId}"
          >
            ${translations['comments.cancel'] || 'Cancel'}
          </button>
          <button
            type="button"
            class="save-edit-btn px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-comment-id="${commentId}"
          >
            <span class="save-text">${translations['comments.save'] || 'Save'}</span>
            <span class="saving-text hidden">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              ${translations['comments.saving'] || 'Saving...'}
            </span>
          </button>
        </div>
      </div>
    </div>
  `;
}

// Handle edit form submission
export async function handleEditSubmit(
  commentId: number,
  currentUser: User | null,
  translations: Translations,
  apiUrls: ApiUrls,
  showError: (message: string) => void,
  showSuccess: (message: string) => void,
  _loadComments: () => Promise<void>
): Promise<void> {
  if (!currentUser) {
    showError(translations['comments.loginRequired'] || 'You must be logged in to edit comments');
    return;
  }

  const editForm = document.getElementById(`edit-form-${commentId}`);
  const textarea = document.getElementById('edit-textarea') as HTMLTextAreaElement;
  const saveBtn = editForm?.querySelector('.save-edit-btn') as HTMLButtonElement;
  
  if (!editForm || !textarea || !saveBtn) {
    showError(translations['comments.formNotFound'] || 'Edit form not found');
    return;
  }

  const newContent = textarea.value.trim();
  
  if (!newContent) {
    showError(translations['comments.contentRequired'] || 'Comment content is required');
    return;
  }

  if (newContent.length > 2000) {
    showError(translations['comments.contentTooLong'] || 'Comment is too long (max 2000 characters)');
    return;
  }

  // Show loading state
  saveBtn.disabled = true;
  const saveText = saveBtn.querySelector('.save-text');
  const savingText = saveBtn.querySelector('.saving-text');
  if (saveText) saveText.classList.add('hidden');
  if (savingText) savingText.classList.remove('hidden');

  try {
    // Check if updateCommentTemplate exists
    if (!apiUrls.updateCommentTemplate) {
      console.error('❌ updateCommentTemplate not found in apiUrls:', apiUrls);
      throw new Error('Update comment API URL not configured');
    }
    
    const updateUrl = apiUrls.updateCommentTemplate.replace('{id}', commentId.toString());
    
    const response = await AuthHelper.makeAuthenticatedRequest(updateUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: newContent
      })
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: response.statusText };
      }
      
      if (response.status === 403) {
        showError(translations['comments.editTimeExpired'] || 'Edit time has expired (15 minutes limit)');
      } else if (response.status === 404) {
        showError(translations['comments.commentNotFound'] || 'Comment not found');
      } else {
        showError(errorData.detail || translations['comments.editFailed'] || 'Failed to update comment');
      }
      return;
    }

    const updatedComment = await response.json();
    
    // Update comment content in UI
    updateCommentContent(commentId, updatedComment.content || newContent);
    
    // Hide edit form and show original content
    hideEditForm(commentId);
    
    showSuccess(translations['comments.editSuccess'] || 'Comment updated successfully');
    
  } catch (error) {
    console.error('❌ Error updating comment:', error);
    showError(translations['comments.editFailed'] || 'Failed to update comment');
  } finally {
    // Reset button state
    saveBtn.disabled = false;
    if (saveText) saveText.classList.remove('hidden');
    if (savingText) savingText.classList.add('hidden');
  }
}

// Cancel edit and hide form
export function cancelEdit(commentId: number): void {
  hideEditForm(commentId);
}

// Hide edit form and show original content
function hideEditForm(commentId: number): void {
  const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
  if (!commentElement) return;

  const editForm = document.getElementById(`edit-form-${commentId}`);
  const contentElement = commentElement.querySelector('.comment-content, .reply-content');
  
  if (editForm) {
    editForm.remove();
  }
  
  if (contentElement) {
    (contentElement as HTMLElement).style.display = 'block';
  }
}

// Update comment content in UI
function updateCommentContent(commentId: number, newContent: string): void {
  const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
  if (!commentElement) return;

  const contentElement = commentElement.querySelector('.comment-content, .reply-content');
  if (contentElement) {
    contentElement.textContent = newContent;
  }
}

// Setup event listeners for edit functionality
export function setupEditEventListeners(
  currentUser: User | null,
  translations: Translations,
  apiUrls: ApiUrls,
  showError: (message: string) => void,
  showSuccess: (message: string) => void,
  _loadComments: () => Promise<void>
): void {
  // Handle edit button clicks
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Edit button
    if (target.classList.contains('edit-btn') || target.closest('.edit-btn')) {
      const button = target.closest('.edit-btn') as HTMLElement;
      const commentId = parseInt(button?.dataset.id || '0');
      if (commentId) {
        showEditForm(commentId, currentUser, translations, showError);
      }
    }
    
    // Save edit button
    if (target.classList.contains('save-edit-btn') || target.closest('.save-edit-btn')) {
      const button = target.closest('.save-edit-btn') as HTMLElement;
      const commentId = parseInt(button?.dataset.commentId || '0');
      if (commentId) {
        handleEditSubmit(commentId, currentUser, translations, apiUrls, showError, showSuccess, _loadComments);
      }
    }
    
    // Cancel edit button
    if (target.classList.contains('cancel-edit-btn') || target.closest('.cancel-edit-btn')) {
      const button = target.closest('.cancel-edit-btn') as HTMLElement;
      const commentId = parseInt(button?.dataset.commentId || '0');
      if (commentId) {
        cancelEdit(commentId);
      }
    }
  });

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
          cancelEdit(parseInt(commentId));
        }
      }
    }
  });
}
