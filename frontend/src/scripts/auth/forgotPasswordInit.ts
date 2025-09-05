import type { ForgotPasswordPayload, ForgotPasswordResponse } from '../../types/auth';
import { validateEmail } from './validate';
import { AdminAuth } from '../../utils/adminAuth';
import { notifications } from '~/utils/notifications';
import { addEventListener } from '~/utils/pageLifecycle';
import { showNotification } from '~/utils/notifications';

// Global flag to prevent double initialization
let isForgotPasswordInitialized = false;

/**
 * Validates forgot password form data
 */
export function validateForgotPasswordForm(email: string): { isValid: boolean; error?: string } {
  return validateEmail(email);
}

/**
 * Requests password reset link
 */
export async function requestPasswordReset(payload: ForgotPasswordPayload): Promise<ForgotPasswordResponse> {
  // Validate email
  const emailValidation = validateEmail(payload.email);
  if (!emailValidation.isValid) {
    return { 
      success: false, 
      message: emailValidation.error || 'Invalid email address' 
    };
  }
  
  try {
    const response = await AdminAuth.requestPasswordReset(payload.email, payload.language);
    
    return { 
      success: response.success, 
      message: response.message,  // Use API message directly
      data: response.data
    };
    
  } catch (error) {
    console.error('Forgot password error:', error);
    
    let message = 'Failed to send reset link. Please try again.';
    
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      
      // Check for specific error conditions
      if (errorMsg.includes('email address not found') || errorMsg.includes('not found')) {
        message = 'This email address is not registered in our system.';
      } else if (errorMsg.includes('not verified') || errorMsg.includes('email verification')) {
        message = 'Please verify your email address before requesting a password reset.';
      } else if (errorMsg.includes('too many') || errorMsg.includes('rate limit')) {
        message = 'Too many reset attempts. Please wait before trying again.';
      } else if (!error.message.includes('Server error')) {
        // Use the original error message if it's user-friendly
        message = error.message;
      }
    }
    
    return { 
      success: false, 
      message 
    };
  }
}

/**
 * Sets loading state for the form
 */
function setLoadingState(loading: boolean): void {
  const resetButton = document.getElementById('reset-button') as HTMLButtonElement;
  const resetButtonText = document.getElementById('reset-button-text');
  const resetSpinner = document.getElementById('reset-loading-spinner');
  
  if (resetButton && resetButtonText && resetSpinner) {
    resetButton.disabled = loading;
    if (loading) {
      resetButtonText.textContent = 'Sending...';
      resetSpinner.classList.remove('hidden');
    } else {
      resetButtonText.textContent = 'Send Reset Link';
      resetSpinner.classList.add('hidden');
    }
  }
}

/**
 * Main initialization function for forgot password page
 */
export async function initForgotPasswordPage(currentLang?: string): Promise<void> {
  // Prevent double initialization
  if (isForgotPasswordInitialized) {
    console.warn('ForgotPassword page already initialized, skipping...');
    return;
  }
  
  isForgotPasswordInitialized = true;
  
  // Reset initialization flag on page navigation
  document.addEventListener('astro:before-swap', () => {
    isForgotPasswordInitialized = false;
  }, { once: true });
  
  // Get language from parameter or URL
  const lang = currentLang || window.location.pathname.split('/')[1] || 'en';

  // Check if already logged in
  if (AdminAuth.isAuthenticated()) {
    const user = await AdminAuth.getCurrentUser();
    const redirectUrl = AdminAuth.isUserAdmin(user)
      ? `/${lang}/admin/dashboard` 
      : `/${lang}/blog`;
    window.location.href = redirectUrl;
    return;
  }

  // Get form elements
  const resetForm = document.getElementById('reset-form') as HTMLFormElement;
  const emailInput = document.getElementById('email') as HTMLInputElement;

  // Form submission
  addEventListener(resetForm, 'submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    
    if (!email) {
      showNotification('Please enter your email address', 'error');
      emailInput.focus();
      return;
    }
    
    setLoadingState(true);
    
    try {
      const result = await requestPasswordReset({
        email,
        language: lang
      });
      
      if (result.success) {
        // Clear form
        resetForm.reset();
        
        // Show success message using API response message
        notifications.success(result.message);
      } else {
        showNotification(result.message || 'Failed to send reset link. Please try again.', 'error');
      }
      
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Password reset error:', error);
      }
      
      // Handle API error with translation_code
      if (error && typeof error === 'object' && 'translation_code' in error) {
        notifications.errorKey(error.translation_code, 'api.');
        
        // Handle special redirects for email verification
        if (error.translation_code === 'EMAIL_NOT_VERIFIED') {
          setTimeout(() => {
            const emailValue = emailInput.value.trim();
            window.location.href = `/${lang}/verify-email?email=${encodeURIComponent(emailValue)}`;
          }, 3000);
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        showNotification(error.message, 'error');
      } else {
        notifications.errorKey('UNKNOWN_ERROR', 'api.');
      }
    } finally {
      setLoadingState(false);
    }
  });

  // Auto-focus email input
  emailInput?.focus();

  console.log('Forgot password initialization complete - form listener attached');
}
