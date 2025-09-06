import { AdminAuth } from '~/utils/adminAuth';
import { getAuthTranslations } from '~/i18n/auth';
import { notifications } from '~/utils/notifications';
import { addEventListener } from '~/utils/pageLifecycle';

// Global flag to prevent double initialization
let isLoginInitialized = false;

export function initLoginPage(currentLang: string) {
  // Prevent double initialization
  if (isLoginInitialized) {
    if (import.meta.env.DEV) {
      console.warn('Login page already initialized, skipping...');
    }
    return;
  }
  
  isLoginInitialized = true;
  
  // Reset initialization flag on page navigation
  document.addEventListener('astro:before-swap', () => {
    isLoginInitialized = false;
  }, { once: true });
  
  const translations = getAuthTranslations(currentLang as keyof typeof import('~/i18n').ui);

  if (AdminAuth.isAuthenticated()) {
    window.location.href = `/${currentLang}/blog`;
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('verified') === 'true') {
    notifications.errorKey('auth.emailVerifiedSuccess');
  }

  const loginForm = document.getElementById('login-form') as HTMLFormElement;
  const emailInput = document.getElementById('email') as HTMLInputElement;
  const passwordInput = document.getElementById('password') as HTMLInputElement;
  const loginButton = document.getElementById('login-button') as HTMLButtonElement;
  const buttonText = document.getElementById('button-text') as HTMLSpanElement;
  const spinner = document.getElementById('loading-spinner') as HTMLElement;

  // No need for local notification functions - using centralized showNotification

  addEventListener(loginForm, 'submit', async (e) => {
    e.preventDefault();
    if (loginButton.disabled) return;

    loginButton.disabled = true;
    buttonText.textContent = translations.signingIn;
    spinner.classList.remove('hidden');

    try {
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        throw new Error(translations.fillAllFields);
      }

      const user = await AdminAuth.login(email, password);
      notifications.successKey('auth.loginSuccess');



      if (import.meta.env.DEV) {
        console.log('Login successful:', user);
        console.log('Tokens are now set as HTTP-only cookies');
      }
      
      
      // Redirect to dashboard or intended page
      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get('redirect') || `/${currentLang}/blog`;
      
      // Small delay to ensure cookies are set
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 1000);


    } catch (error) {
      const currentLang = window.location.pathname.split('/')[1] as 'en' | 'pl';
      console.error('Login error:', error);
      console.log('Error structure:', {
        hasResponse: !!error?.response,
        hasData: !!error?.response?.data,
        hasDetail: !!error?.response?.data?.detail,
        detail: error?.response?.data?.detail
      });
      
      // Handle API error with translation_code
      if (error && typeof error === 'object' && 'response' in error && error.response?.data?.detail) {
        const detail = error.response.data.detail;
        console.log('🔑 Detail object:', detail);
        if (detail.translation_code) {
          console.log('🔑 Using translation code:', detail.translation_code);
          notifications.errorKey(detail.translation_code, 'api.');

          // Handle special redirects for email verification
          if (detail.translation_code === 'EMAIL_NOT_VERIFIED' || 
              detail.translation_code === 'ACCOUNT_NOT_ACTIVATED') {
            setTimeout(() => {
              const emailValue = emailInput.value.trim();
              window.location.href = `/${currentLang}/verify-email?email=${encodeURIComponent(emailValue)}`;
            }, 3000);
          }
        } else {
          console.log('❌ API error without translation_code');
          notifications.errorKey('UNKNOWN_ERROR', 'api.');
        }
      } else {
        console.log('❌ Generic error (not from API)');
        notifications.errorKey('UNKNOWN_ERROR', 'api.');
      }
    } finally {
      loginButton.disabled = false;
      buttonText.textContent = translations.loginButton;
      spinner.classList.add('hidden');
    }
  });

  emailInput?.focus();
  if (import.meta.env.DEV) {
    console.log('Login page initialized.');
  }
}
