import type { ResetPasswordPayload, ResetPasswordResponse, ResetTokenData } from '../../types/auth';
import { validatePassword, validatePasswordMatch, updatePasswordRequirements } from './validate';
import { AdminAuth } from '../../utils/adminAuth';
import { notifications } from '~/utils/notifications';
import { addEventListener } from '~/utils/pageLifecycle';
import { showNotification } from '~/utils/notifications';
import { getAuthTranslations } from '~/i18n/auth';

// Global flag to prevent double initialization
let isResetPasswordInitialized = false;

/**
 * Parses reset token from URL parameters
 */
export function parseResetToken(): ResetTokenData {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const email = urlParams.get('email');
  
  if (!token) {
    return {
      token: '',
      email: '',
      isValid: false,
      errorMessage: 'Missing reset token. The link may be invalid.'
    };
  }
  
  if (!email) {
    return {
      token: '',
      email: '',
      isValid: false,
      errorMessage: 'Missing email address. The link may be invalid.'
    };
  }
  
  // Basic token format validation
  if (token.length < 20) {
    return {
      token: '',
      email: '',
      isValid: false,
      errorMessage: 'Invalid reset token format.'
    };
  }
  
  return {
    token,
    email,
    isValid: true
  };
}

/**
 * Resets user password with token validation
 */
export async function resetPassword(payload: ResetPasswordPayload): Promise<ResetPasswordResponse> {
  // Validate password strength
  const passwordValidation = validatePassword(payload.password);
  if (!passwordValidation.isValid) {
    return { 
      success: false, 
      message: passwordValidation.errors[0] 
    };
  }
  
  // Validate password match
  const matchError = validatePasswordMatch(payload.password, payload.confirmPassword);
  if (matchError) {
    return { 
      success: false, 
      message: matchError 
    };
  }
  
  try {
    const response = await AdminAuth.confirmPasswordReset(
      payload.email,
      payload.token,
      payload.password
    );
    
    if (response.success) {
      return { 
        success: true, 
        message: response.message  // Use API message directly
      };
    } else {
      return { 
        success: false, 
        message: response.message || 'Password reset failed. Please try again.' 
      };
    }
    
  } catch (error) {
    console.error('Password reset error:', error);
    
    const message = error instanceof Error ? error.message : 'Password reset failed. Please try again.';
    
    return { 
      success: false, 
      message 
    };
  }
}

/**
 * Starts countdown timer for token expiration
 */
export function startCountdownTimer(minutes: number, onExpired?: () => void): void {
  const countdownElement = document.getElementById('countdown');
  if (!countdownElement) return;
  
  let totalSeconds = minutes * 60;
  
  const interval = setInterval(() => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    
    countdownElement.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    
    if (totalSeconds <= 0) {
      clearInterval(interval);
      countdownElement.textContent = 'Link Expired';
      
      // Disable form
      const form = document.getElementById('reset-form');
      if (form) {
        const inputs = form.querySelectorAll('input, button');
        inputs.forEach(input => {
          if (input instanceof HTMLInputElement || input instanceof HTMLButtonElement) {
            input.disabled = true;
          }
        });
      }
      
      onExpired?.();
    }
    
    totalSeconds--;
  }, 1000);
}

/**
 * UI helper functions
 */
class ResetPasswordUI {
  private translations: ReturnType<typeof getAuthTranslations>;
  private currentLang: string;

  constructor(translations: ReturnType<typeof getAuthTranslations>, currentLang: string) {
    this.translations = translations;
    this.currentLang = currentLang;
  }

  // Use centralized showNotification instead of local method

  showTokenError(message: string): void {
    const tokenErrorDiv = document.getElementById('token-error');
    const tokenErrorMessage = document.getElementById('token-error-message');
    const formContainer = document.getElementById('reset-form-container');
    
    if (tokenErrorDiv && tokenErrorMessage && formContainer) {
      tokenErrorMessage.textContent = message;
      tokenErrorDiv.classList.remove('hidden');
      formContainer.classList.add('hidden');
    }
  }

  showFieldError(fieldId: string, message: string): void {
    const errorDiv = document.getElementById(`${fieldId}-error`);
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.remove('hidden');
    }
  }

  hideFieldError(fieldId: string): void {
    const errorDiv = document.getElementById(`${fieldId}-error`);
    if (errorDiv) {
      errorDiv.classList.add('hidden');
    }
  }

  setLoadingState(loading: boolean): void {
    const resetButton = document.getElementById('reset-button') as HTMLButtonElement;
    const resetButtonText = document.getElementById('reset-button-text');
    const resetSpinner = document.getElementById('reset-loading-spinner');
    
    if (resetButton && resetButtonText && resetSpinner) {
      resetButton.disabled = loading;
      if (loading) {
        resetButtonText.textContent = this.translations.resettingPassword;
        resetSpinner.classList.remove('hidden');
      } else {
        resetButtonText.textContent = this.translations.resetPassword;
        resetSpinner.classList.add('hidden');
      }
    }
  }

  showSuccess(): void {
    const successDiv = document.getElementById('success-message');
    const formContainer = document.getElementById('reset-form-container');
    if (successDiv && formContainer) {
      successDiv.classList.remove('hidden');
      formContainer.classList.add('hidden');
    }
  }

  setupPasswordToggle(): void {
    const togglePasswordBtn = document.getElementById('toggle-password');
    const newPasswordInput = document.getElementById('new-password') as HTMLInputElement;
    const passwordShowIcon = document.getElementById('password-show-icon');
    const passwordHideIcon = document.getElementById('password-hide-icon');
    
    addEventListener(togglePasswordBtn, 'click', () => {
      const isPassword = newPasswordInput.type === 'password';
      newPasswordInput.type = isPassword ? 'text' : 'password';
      
      if (isPassword) {
        passwordShowIcon?.classList.add('hidden');
        passwordHideIcon?.classList.remove('hidden');
      } else {
        passwordShowIcon?.classList.remove('hidden');
        passwordHideIcon?.classList.add('hidden');
      }
    });
  }
}

/**
 * Main initialization function for the reset password page
 */
export async function initResetPasswordPage(currentLang: string): Promise<void> {
  // Prevent double initialization
  if (isResetPasswordInitialized) {
    console.warn('ResetPassword page already initialized, skipping...');
    return;
  }
  
  isResetPasswordInitialized = true;
  
  // Reset initialization flag on page navigation
  document.addEventListener('astro:before-swap', () => {
    isResetPasswordInitialized = false;
  }, { once: true });
  
  if (AdminAuth.isAuthenticated()) {
    window.location.href = `/${currentLang}/blog`;
    return;
  }

  const translations = getAuthTranslations(currentLang as keyof typeof import('~/i18n').ui);
  const ui = new ResetPasswordUI(translations, currentLang);
  
  const { isValid, email, token } = parseResetToken();

  if (!isValid || !email) {
    notifications.errorKey('auth.invalidResetToken');
    return;
  }

  // Display user email
  const emailElement = document.getElementById('user-email');
  if (emailElement) {
    emailElement.textContent = email;
  }

  // Start countdown timer (30 minutes)
  startCountdownTimer(30, () => {
    showNotification('Reset link has expired. Please request a new one.', 'error');
  });

  // Get form elements
  const resetForm = document.getElementById('reset-form') as HTMLFormElement;
  const newPasswordInput = document.getElementById('new-password') as HTMLInputElement;
  const confirmPasswordInput = document.getElementById('confirm-password') as HTMLInputElement;

  // Setup password visibility toggle
  ui.setupPasswordToggle();

  // Real-time password validation
  addEventListener(newPasswordInput, 'input', () => {
    updatePasswordRequirements(newPasswordInput.value);
    ui.hideFieldError('password');
  });

  // Confirm password validation
  addEventListener(confirmPasswordInput, 'input', () => {
    ui.hideFieldError('confirm-password');
  });

  // Form submission
  addEventListener(resetForm, 'submit', async (e) => {
    e.preventDefault();
    
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    // Clear previous errors
    ui.hideFieldError('password');
    ui.hideFieldError('confirm-password');
    
    ui.setLoadingState(true);
    
    try {
      const result = await resetPassword({
        token: token,
        email: email,
        password: newPassword,
        confirmPassword: confirmPassword
      });
      
      if (result.success) {
        // Show success message using API response message
        notifications.success(result.message);
        ui.showSuccess();
        
        // Clear sensitive data from memory
        newPasswordInput.value = '';
        confirmPasswordInput.value = '';
        
        // Auto-redirect after 5 seconds
        setTimeout(() => {
          window.location.href = `/${currentLang}/login`;
        }, 5000);
      } else {
        if (result.message.includes('match')) {
          ui.showFieldError('confirm-password', result.message);
        } else if (result.message.includes('Password')) {
          ui.showFieldError('password', result.message);
        }
        showNotification(result.message, 'error');
      }
      
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Password reset error:', error);
      }
      
      // Handle API error with translation_code from response.detail
      if (error && error.response && error.response.detail && error.response.detail.translation_code) {
        console.log('🔑 Using translation code:', error.response.detail.translation_code);
        notifications.errorKey(error.response.detail.translation_code, 'api.');
      } else if (error && error.response && error.response.detail && error.response.detail.message) {
        console.log('💬 Using error message:', error.response.detail.message);
        showNotification(error.response.detail.message, 'error');
      } else if (error && typeof error === 'object' && 'message' in error) {
        console.log('💬 Using fallback error message:', error.message);
        showNotification(error.message, 'error');
      } else {
        console.log('❓ Using fallback error');
        notifications.errorKey('UNKNOWN_ERROR', 'api.');
      }
    } finally {
      ui.setLoadingState(false);
    }
  });

  // Auto-focus first input
  newPasswordInput?.focus();
}
