// Comments functionality for blog posts
class CommentsManager {
  constructor() {
    this.postId = null;
    this.lang = 'en';
    this.parentId = null;
    this.apiBaseUrl = window.API_URLS ? '' : (import.meta.env?.PUBLIC_API_URL || 'http://localhost:8000');
    this.isSubmitting = false;
    
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    const container = document.getElementById('comments-container');
    if (!container) return;

    this.postId = container.dataset.postId;
    this.lang = container.dataset.lang || 'en';

    this.setupEventListeners();
    this.loadComments();
  }

  setupEventListeners() {
    // Form submission
    const form = document.getElementById('comment-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Cancel reply
    const cancelReply = document.getElementById('cancel-reply');
    const cancelReplyBtn = document.getElementById('cancel-reply-btn');
    if (cancelReply) {
      cancelReply.addEventListener('click', () => this.cancelReply());
    }
    if (cancelReplyBtn) {
      cancelReplyBtn.addEventListener('click', () => this.cancelReply());
    }

    // Retry loading comments
    const retryBtn = document.getElementById('retry-comments');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.loadComments());
    }
  }

  async loadComments() {
    if (!this.postId) return;

    this.showLoading();

    try {
      const url = this.getApiUrl(`/api/blog/${this.postId}/comments?approved=true&per_page=100`);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.renderComments(data.items || []);
    } catch (error) {
      console.error('Error loading comments:', error);
      this.showError(error.message);
    }
  }

  renderComments(comments) {
    const container = document.getElementById('comments-list');
    const noComments = document.getElementById('no-comments');
    const loading = document.getElementById('comments-loading');
    const errorDiv = document.getElementById('comments-error');

    // Hide loading and error states
    loading?.classList.add('hidden');
    errorDiv?.classList.add('hidden');

    if (comments.length === 0) {
      container?.classList.add('hidden');
      noComments?.classList.remove('hidden');
      return;
    }

    // Group comments by parent
    const rootComments = comments.filter(c => !c.parentId);
    const replyMap = new Map();
    
    comments.filter(c => c.parentId).forEach(reply => {
      if (!replyMap.has(reply.parentId)) {
        replyMap.set(reply.parentId, []);
      }
      replyMap.get(reply.parentId).push(reply);
    });

    // Render comments
    if (container) {
      container.innerHTML = '';
      rootComments.forEach(comment => {
        const commentElement = this.createCommentElement(comment, replyMap.get(comment.id) || []);
        container.appendChild(commentElement);
      });
      
      container.classList.remove('hidden');
      noComments?.classList.add('hidden');
    }
  }

  createCommentElement(comment, replies = []) {
    const template = document.getElementById('comment-template');
    if (!template) return document.createElement('div');

    const clone = template.content.cloneNode(true);
    const commentDiv = clone.querySelector('.comment');
    
    // Set comment data
    const author = clone.querySelector('.comment-author');
    const date = clone.querySelector('.comment-date');
    const content = clone.querySelector('.comment-content');
    const replyBtn = clone.querySelector('.reply-btn');
    const repliesContainer = clone.querySelector('.comment-replies');

    if (author) author.textContent = comment.author;
    if (date) date.textContent = this.formatDate(comment.createdAt);
    if (content) {
      // Handle both plain text and potential HTML content
      if (comment.content.includes('<') && comment.content.includes('>')) {
        content.innerHTML = this.sanitizeHtml(comment.content);
      } else {
        content.textContent = comment.content;
      }
    }

    // Setup reply button
    if (replyBtn) {
      replyBtn.addEventListener('click', () => this.startReply(comment.id, comment.author));
    }

    // Add replies if any
    if (replies.length > 0 && repliesContainer) {
      replies.forEach(reply => {
        const replyElement = this.createCommentElement(reply);
        repliesContainer.appendChild(replyElement);
      });
      repliesContainer.classList.remove('hidden');
    }

    return commentDiv;
  }

  async handleSubmit(e) {
    e.preventDefault();
    
    if (this.isSubmitting) return;

    const form = e.target;
    const formData = new FormData(form);
    
    // Validate form
    const validation = this.validateForm(formData);
    if (!validation.isValid) {
      this.showValidationErrors(validation.errors);
      return;
    }

    this.isSubmitting = true;
    this.setSubmitButtonState(true);

    try {
      const commentData = {
        postId: parseInt(this.postId),
        author: formData.get('name'),
        email: formData.get('email'),
        website: formData.get('website') || '',
        content: formData.get('content'),
        parentId: this.parentId
      };

      const url = this.getApiUrl(`/api/blog/${this.postId}/comments`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commentData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Success
      this.showSuccess();
      form.reset();
      this.cancelReply();
      
      // Reload comments after a short delay
      setTimeout(() => this.loadComments(), 1000);

    } catch (error) {
      console.error('Error submitting comment:', error);
      this.showSubmissionError(error.message);
    } finally {
      this.isSubmitting = false;
      this.setSubmitButtonState(false);
    }
  }

  validateForm(formData) {
    const errors = {};
    
    const name = formData.get('name')?.trim();
    const email = formData.get('email')?.trim();
    const content = formData.get('content')?.trim();

    if (!name) {
      errors.name = this.getTranslation('comments.required');
    }

    if (!email) {
      errors.email = this.getTranslation('comments.required');
    } else if (!this.isValidEmail(email)) {
      errors.email = this.getTranslation('comments.invalidEmail');
    }

    if (!content) {
      errors.content = this.getTranslation('comments.required');
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  showValidationErrors(errors) {
    // Clear previous errors
    ['name-error', 'email-error', 'content-error'].forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = '';
        element.classList.add('hidden');
      }
    });

    // Show new errors
    Object.entries(errors).forEach(([field, message]) => {
      const errorElement = document.getElementById(`${field}-error`);
      if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
      }
    });
  }

  startReply(commentId, authorName) {
    this.parentId = commentId;
    
    const indicator = document.getElementById('reply-indicator');
    const replyText = document.getElementById('reply-text');
    const cancelBtn = document.getElementById('cancel-reply-btn');
    
    if (indicator && replyText) {
      replyText.textContent = `${this.getTranslation('comments.replyTo')} ${authorName}`;
      indicator.classList.remove('hidden');
      cancelBtn?.classList.remove('hidden');
    }

    // Scroll to form
    const form = document.getElementById('comment-form');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Focus on content textarea
      const textarea = document.getElementById('comment-content');
      if (textarea) {
        setTimeout(() => textarea.focus(), 300);
      }
    }
  }

  cancelReply() {
    this.parentId = null;
    
    const indicator = document.getElementById('reply-indicator');
    const cancelBtn = document.getElementById('cancel-reply-btn');
    
    indicator?.classList.add('hidden');
    cancelBtn?.classList.add('hidden');
  }

  setSubmitButtonState(isSubmitting) {
    const submitBtn = document.getElementById('submit-comment');
    const submitText = document.getElementById('submit-text');
    
    if (submitBtn && submitText) {
      submitBtn.disabled = isSubmitting;
      submitText.textContent = isSubmitting 
        ? this.getTranslation('comments.posting')
        : this.getTranslation('comments.submitComment');
    }
  }

  showSuccess() {
    const successDiv = document.getElementById('comment-success');
    if (successDiv) {
      successDiv.classList.remove('hidden');
      setTimeout(() => {
        successDiv.classList.add('hidden');
      }, 5000);
    }
  }

  showSubmissionError(message) {
    // You could show this in a toast or alert
    alert(this.getTranslation('comments.error') + '\n\n' + message);
  }

  showLoading() {
    const loading = document.getElementById('comments-loading');
    const list = document.getElementById('comments-list');
    const noComments = document.getElementById('no-comments');
    const errorDiv = document.getElementById('comments-error');
    
    loading?.classList.remove('hidden');
    list?.classList.add('hidden');
    noComments?.classList.add('hidden');
    errorDiv?.classList.add('hidden');
  }

  showError(message) {
    const loading = document.getElementById('comments-loading');
    const errorDiv = document.getElementById('comments-error');
    const errorMessage = document.getElementById('error-message');
    
    loading?.classList.add('hidden');
    if (errorDiv) {
      errorDiv.classList.remove('hidden');
      if (errorMessage) {
        errorMessage.textContent = message;
      }
    }
  }

  // Helper methods
  getApiUrl(endpoint) {
    if (window.API_URLS) {
      // Use the API_URLS from the config if available
      return `${this.apiBaseUrl}${endpoint}`;
    }
    return `${this.apiBaseUrl}${endpoint}`;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const locale = this.lang === 'pl' ? 'pl-PL' : 'en-US';
    
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  getTranslation(key) {
    // Basic translations - in a real app, you'd load these properly
    const translations = {
      en: {
        'comments.required': 'This field is required',
        'comments.invalidEmail': 'Please enter a valid email address',
        'comments.posting': 'Posting comment...',
        'comments.submitComment': 'Submit Comment',
        'comments.replyTo': 'Reply to',
        'comments.error': 'Error adding comment. Please try again.'
      },
      pl: {
        'comments.required': 'To pole jest wymagane',
        'comments.invalidEmail': 'Proszę wprowadzić poprawny adres email',
        'comments.posting': 'Wysyłanie komentarza...',
        'comments.submitComment': 'Wyślij Komentarz',
        'comments.replyTo': 'Odpowiedz na',
        'comments.error': 'Błąd podczas dodawania komentarza. Spróbuj ponownie.'
      }
    };

    return translations[this.lang]?.[key] || translations.en[key] || key;
  }

  sanitizeHtml(html) {
    // Basic HTML sanitization - remove dangerous elements
    const div = document.createElement('div');
    div.innerHTML = html;
    
    // Remove script tags and other dangerous elements
    const scripts = div.querySelectorAll('script, iframe, object, embed');
    scripts.forEach(script => script.remove());
    
    return div.innerHTML;
  }
}

// Initialize comments when script loads
new CommentsManager();
