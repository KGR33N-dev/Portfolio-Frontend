import type { ForgotPasswordPayload, ForgotPasswordResponse } from '../../types/auth';
import { validateEmail } from './validate';
import { AdminAuth } from '../../utils/adminAuth';
import { notifications } from '~/utils/notifications';
import { addEventListener } from '~/utils/pageLifecycle';

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
    console.log('Error details:', error?.response?.data);
    
    // Handle API error with translation_code from response.data.detail
    if (error && typeof error === 'object' && 'response' in error && error.response?.data?.detail) {
        const detail = error.response.data.detail;
        console.log('🔑 Using translation code:', detail.translation_code);
        return { 
          success: false, 
          translation_code: detail.translation_code,
          message: detail.message || 'Failed to send reset link. Please try again.'
        };
    } else if (error && typeof error === 'object' && 'message' in error) {
      console.log('💬 Using fallback error message:', error.message);
      return { 
        success: false, 
        message: error.message
      };
    } else {
      console.log('❓ Using fallback error');
      return { 
        success: false, 
        translation_code: 'UNKNOWN_ERROR',
        message: 'Failed to send reset link. Please try again.'
      };
    }
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
      notifications.error('Please enter your email address');
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
        // Handle API error with translation_code similar to registration
        if (result.translation_code) {
          console.log('🔑 Using translation code:', result.translation_code);
          notifications.errorKey(result.translation_code, 'api.');
        } else {
          console.log('💬 Using error message:', result.message);
          notifications.error(result.message || 'Failed to send reset link. Please try again.');
        }
      }
      
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Password reset error:', error);
        console.log('Error structure:', {
          hasResponse: !!error?.response,
          hasData: !!error?.response?.data,
          hasDetail: !!error?.response?.data?.detail,
          detail: error?.response?.data?.detail
        });
      }
      
      // Handle API error with translation_code from response.data.detail
      if (error && error.response && error.response.data && error.response.data.detail) {
        const detail = error.response.data.detail;
        console.log('🔑 Detail object:', detail);
        if (detail.translation_code) {
          console.log('🔑 Using translation code:', detail.translation_code);
          notifications.errorKey(detail.translation_code, 'api.');
          
          // Handle special redirects for email verification
          if (detail.translation_code === 'EMAIL_NOT_VERIFIED') {
            setTimeout(() => {
              const emailValue = emailInput.value.trim();
              window.location.href = `/${lang}/verify-email?email=${encodeURIComponent(emailValue)}`;
            }, 3000);
          }
        } else if (detail.message) {
          console.log('💬 Using error message:', detail.message);
          notifications.error(detail.message);
        } else {
          console.log('❌ Detail without translation_code or message');
          notifications.errorKey('UNKNOWN_ERROR', 'api.');
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        console.log('💬 Using fallback error message:', error.message);
        notifications.error(error.message);
      } else {
        console.log('❓ Using fallback error');
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
