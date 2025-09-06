import { AdminAuth } from '../../utils/adminAuth';
import { RateLimiter } from '../../utils/rateLimiter';
import { PasswordValidator } from '../../utils/passwordValidator';
import { getAuthTranslations } from '~/i18n/auth';
import { notifications } from '~/utils/notifications';
import { addEventListener, setTimeout } from '~/utils/pageLifecycle';

// Global flag to prevent double initialization
let isRegisterInitialized = false;

// No need for local showNotification - using centralized one

function updatePasswordStrength(password: string) {
  try {
    const validation = PasswordValidator.validate(password);
    
    const checks = {
      'length-check': password.length >= 8,
      'uppercase-check': /[A-Z]/.test(password),
      'lowercase-check': /[a-z]/.test(password),
      'number-check': /\d/.test(password),
      'special-check': /[!@#$%^&*(),.?":{}|<>_]/.test(password),
    };

    for (const [id, isValid] of Object.entries(checks)) {
      const el = document.getElementById(id);
      if (el) {
        const span = el.querySelector('span');
        if (span) {
          span.textContent = isValid ? '✓' : '✗';
          span.className = isValid ? 'w-4 h-4 mr-2 text-green-500' : 'w-4 h-4 mr-2 text-red-500';
        }
      }
    }
    
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    if (password.length > 0 && passwordInput) {
      const strengthColor = validation.strength === 'weak' ? '#ef4444' :
                           validation.strength === 'medium' ? '#f59e0b' :
                           validation.strength === 'strong' ? '#3b82f6' : '#10b981';
      passwordInput.style.borderColor = strengthColor;
    }
    
    return validation.isValid;
  } catch (error) {
    console.error('Error in updatePasswordStrength:', error);
    return false;
  }
}

export function initRegisterPage(currentLang: string) {
  // Prevent double initialization
  if (isRegisterInitialized) {
    console.warn('Register page already initialized, skipping...');
    return;
  }
  
  console.log('🔄 Initializing register page for language:', currentLang);
  isRegisterInitialized = true;
  
  // Reset initialization flag on page navigation
  document.addEventListener('astro:before-swap', () => {
    isRegisterInitialized = false;
  }, { once: true });
  
  const translations = getAuthTranslations(currentLang as keyof typeof import('~/i18n').ui);

  const registerForm = document.getElementById('register-form') as HTMLFormElement;
  const emailInput = document.getElementById('email') as HTMLInputElement;
  const usernameInput = document.getElementById('username') as HTMLInputElement;
  const passwordInput = document.getElementById('password') as HTMLInputElement;
  const confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement;
  const fullNameInput = document.getElementById('fullName') as HTMLInputElement;
  const termsCheckbox = document.getElementById('terms') as HTMLInputElement;
  const registerButton = document.getElementById('register-button') as HTMLButtonElement;

  if (!registerForm) return;

  function validateForm() {
    if (!passwordInput || !confirmPasswordInput || !emailInput || !usernameInput || !registerButton || !termsCheckbox) return false;
    
    const isPasswordStrong = updatePasswordStrength(passwordInput.value);
    const passwordsMatch = passwordInput.value === confirmPasswordInput.value;
    const termsAccepted = termsCheckbox.checked;
    const emailValid = emailInput.validity.valid && emailInput.value.length > 0;
    const usernameValid = usernameInput.validity.valid && usernameInput.value.length >= 3;
    
    const isValid = isPasswordStrong && passwordsMatch && termsAccepted && emailValid && usernameValid;
    registerButton.disabled = !isValid;
    
    if (confirmPasswordInput.value.length > 0) {
      confirmPasswordInput.style.borderColor = passwordsMatch ? '#10b981' : '#ef4444';
    }
    
    return isValid;
  }
  
  function setLoadingState(loading: boolean) {
    if (!registerButton) return;
    
    const buttonText = document.getElementById('button-text');
    const spinner = document.getElementById('loading-spinner');
    
    if (registerButton && buttonText && spinner) {
      registerButton.disabled = loading;
      if (loading) {
        buttonText.textContent = translations.creatingAccount;
        spinner.classList.remove('hidden');
      } else {
        buttonText.textContent = translations.registerButton;
        spinner.classList.add('hidden');
      }
    }
  }

  // Check if user is already authenticated - redirect to blog if yes
  if (AdminAuth.isAuthenticated()) {
    console.log('👤 User already authenticated, redirecting to blog');
    window.location.href = `/${currentLang}/blog`;
    return;
  }

  const validationHandler = () => validateForm();
  [passwordInput, confirmPasswordInput, emailInput, usernameInput, termsCheckbox].forEach(input => {
    addEventListener(input, 'input', validationHandler);
    addEventListener(input, 'change', validationHandler);
  });

  const submitHandler = async (e: Event) => {
    e.preventDefault();
    
    if (!validateForm()) {
      notifications.errorKey('auth.fixErrors');
      return;
    }
    
    const email = emailInput.value.trim();
    
    // Check rate limit BEFORE attempting registration
    const rateLimitResult = RateLimiter.checkLimit(email, 'REGISTER');
    if (!rateLimitResult.allowed) {
      console.warn('🚫 Rate limit exceeded for email:', email);
      notifications.errorKey('auth.tooManyRegistrationAttempts');
      return;
    }
    
    setLoadingState(true);
    
    try {
      const userData = {
        email,
        username: usernameInput.value.trim(),
        password: passwordInput.value,
        full_name: fullNameInput.value.trim() || null,
        language: currentLang
      };
      
      console.log('📤 Sending registration request for:', email);
      const response = await AdminAuth.register(userData);
      
      // Show success message using API response message
      console.log('✅ Registration successful:', response.message);
      notifications.success(response.message);
      
      // Clear rate limit only on success
      RateLimiter.clearLimit(email, 'REGISTER');
      
      registerForm.reset();
      // Don't call validateForm() after reset to avoid conflicts
      
      console.log('🔄 Redirecting to verify-email in 2 seconds...');
      
      // Use pageLifecycle setTimeout to avoid recursion
      setTimeout(() => {
        window.location.href = `/${currentLang}/verify-email`;
      }, 2000);
      
      // Don't execute any more code after successful registration
      return;
      
    } catch (error) {
      console.error('❌ Registration error:', error);
      console.log('Error structure:', {
        hasResponse: !!error?.response,
        hasData: !!error?.response?.data,
        hasDetail: !!error?.response?.data?.detail,
        detail: error?.response?.data?.detail
      });
      RateLimiter.recordAttempt(email, 'REGISTER');
      
      // Handle API error with translation_code from response.data.detail
      if (error && error.response && error.response.data && error.response.data.detail) {
        const detail = error.response.data.detail;
        console.log('🔑 Detail object:', detail);
        if (detail.translation_code) {
          console.log('🔑 Using translation code:', detail.translation_code);
          notifications.errorKey(detail.translation_code, 'api.');
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
      // Don't call validateForm() here to avoid conflicts after successful registration
    }
  };
  
  addEventListener(registerForm, 'submit', submitHandler);
  
  emailInput?.focus();
  // Call validateForm only once at init, not continuously
  if (import.meta.env.DEV) {
    console.log('Register page initialized.');
  }
}
