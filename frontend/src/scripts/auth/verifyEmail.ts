import { AdminAuth } from '../../utils/adminAuth';
import pageLifecycle from '../../utils/pageLifecycle';
import { notifications } from '~/utils/notifications';

// Global flags to prevent double initialization
let isVerifyEmailInitialized = false;

export function initVerifyEmailPage(_lang: string) {
  console.log('🚀 initVerifyEmailPage called, isInitialized:', isVerifyEmailInitialized);
  
  // Prevent double initialization
  if (isVerifyEmailInitialized) {
    console.warn('⚠️ VerifyEmail page already initialized, skipping...');
    return;
  }
  
  // Check if already logged in
  if (AdminAuth.isAuthenticated()) {
    const currentLang = window.location.pathname.split('/')[1];
    window.location.href = `/${currentLang}/blog`;
    return;
  }
  
  isVerifyEmailInitialized = true;
  console.log('✅ VerifyEmail page initialization started');
  
  // Reset initialization flag on page navigation
  document.addEventListener('astro:before-swap', () => {
    console.log('🔄 Page navigation detected, resetting initialization flag');
    isVerifyEmailInitialized = false;
  }, { once: true });
  
  const verifyForm = document.getElementById('verify-form') as HTMLFormElement;
  const emailInput = document.getElementById('email') as HTMLInputElement;
  const codeInput = document.getElementById('verification-code') as HTMLInputElement;
  const verifyButton = document.getElementById('verify-button') as HTMLButtonElement;
  const verifyButtonText = document.getElementById('verify-button-text') as HTMLSpanElement;
  const verifySpinner = document.getElementById('verify-loading-spinner') as HTMLElement;
  const resendButton = document.getElementById('resend-button') as HTMLButtonElement;
  const resendButtonText = document.getElementById('resend-button-text') as HTMLSpanElement;
  const emailDisplay = document.getElementById('email-display') as HTMLParagraphElement;
  
  // Auto-format verification code input
  if (codeInput) {
    const formatCodeInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      target.value = target.value.replace(/\D/g, '').slice(0, 6);
    };
    
    pageLifecycle.addEventListener(codeInput, 'input', formatCodeInput);
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const emailFromUrl = urlParams.get('email');
  const emailFromStorage = localStorage.getItem('pending_verification_email');
  
  if (emailFromUrl && emailInput && emailDisplay) {
    emailInput.value = emailFromUrl;
    emailDisplay.textContent = `Verification code sent to ${emailFromUrl}`;
    localStorage.setItem('pending_verification_email', emailFromUrl);
  } else if (emailFromStorage && emailInput && emailDisplay) {
    emailInput.value = emailFromStorage;
    emailDisplay.textContent = `Verification code sent to ${emailFromStorage}`;
  }
  
  // Verification form submission
  if (verifyForm) {
    const handleVerifySubmit = async (e: Event) => {
      e.preventDefault();
      
      // Prevent double submission
      if (verifyButton.disabled) return;
      
      const email = emailInput.value.trim();
      const code = codeInput.value.trim();
      
      if (!email || !code) {
        notifications.errorKey('verifyEmail.enterEmailAndCode');
        return;
      }
      
      if (code.length !== 6) {
        notifications.errorKey('verifyEmail.verificationCodeLength');
        return;
      }
      
      // Show loading state
      verifyButton.disabled = true;
      verifyButtonText.textContent = 'Verifying...';
      verifySpinner.classList.remove('hidden');
      
      try {
        const response = await AdminAuth.verifyEmail(email, code);
        
        // Show success notification using translation_code if available, otherwise fallback
        if (response.translation_code) {
          notifications.successKey(response.translation_code, 'api.');
        } else {
          // Fallback to hardcoded key if API doesn't provide translation_code
          notifications.successKey('EMAIL_VERIFICATION_SUCCESS', 'api.');
        }
        
        // Clear pending email from storage
        localStorage.removeItem('pending_verification_email');
        
        // Redirect to login after delay
        setTimeout(() => {
          const currentLang = window.location.pathname.split('/')[1];
          window.location.href = `/${currentLang}/login`;
        }, 2000);
        
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Verification failed';
        notifications.errorKey(message, 'api.');
      } finally {
        // Reset button state
        verifyButton.disabled = false;
        verifyButtonText.textContent = 'Verify Email';
        verifySpinner.classList.add('hidden');
      }
    };
    
    pageLifecycle.addEventListener(verifyForm, 'submit', handleVerifySubmit);
  }
  
  // Resend verification code
  if (resendButton) {
    const handleResendClick = async (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('🔄 Resend button clicked, disabled state:', resendButton.disabled);
      
      // Immediate protection against double clicks
      if (resendButton.disabled) {
        console.log('❌ Button already disabled, preventing execution');
        return;
      }
      
      const email = emailInput.value.trim();
      
      if (!email) {
        console.log('❌ No email provided');
        notifications.errorKey('verifyEmail.enterEmail');
        return;
      }

      console.log('✅ Starting resend process for email:', email);
      
      // Disable button immediately and change text
      resendButton.disabled = true;
      resendButtonText.textContent = 'Sending...';
      console.log('🔒 Button disabled, text changed to "Sending..."');
      
      try {
        // Get current language from URL
        const currentLang = window.location.pathname.split('/')[1] || 'en';
        
        console.log('📤 Making API call to resendVerification...');
        const response = await AdminAuth.resendVerification(email, currentLang);
        console.log('✅ API call successful, response:', response);
        
        // Show success notification using translation_code if available, otherwise fallback
        if (response.translation_code) {
          notifications.successKey(response.translation_code, 'api.');
        } else {
          // Fallback to hardcoded key if API doesn't provide translation_code
          notifications.successKey('VERIFICATION_CODE_SENT', 'api.');
        }
        
        // Permanently disable button and change text
        resendButtonText.textContent = 'Code Sent';
        console.log('✅ Button permanently disabled with "Code Sent" text');
        
      } catch (error) {
        console.log('❌ API call failed, error:', error);
        
        // Check if this is an info message (like EMAIL_ALREADY_VERIFIED)
        if (error instanceof Error && 'type' in error && (error as Error & { type: string }).type === 'info') {
          console.log('📧 Handling as info message');
          // For info messages, show as info notification and keep button disabled
          notifications.infoKey(error.message, 'api.');
          resendButtonText.textContent = 'Already Verified';
        } else {
          // Re-enable button only on actual errors
          resendButton.disabled = false;
          resendButtonText.textContent = 'Resend Code';
          notifications.errorKey(error, 'api.');
          console.log('🔓 Button re-enabled due to error');
        }
      }
    };

    console.log('🎯 Adding click event listener to resend button');
    pageLifecycle.addEventListener(resendButton, 'click', handleResendClick);
  }  // Auto-focus code input if email is prefilled
  if (emailInput && emailInput.value && codeInput) {
    codeInput.focus();
  } else if (emailInput) {
    emailInput.focus();
  }
}
