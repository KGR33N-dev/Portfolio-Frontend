/**
 * Global auto-initialization system for Astro pages
 * Automatically detects and initializes page-specific scripts
 */

import { initRegisterPage } from '~/scripts/auth/registerInit';
import { initLoginPage } from '~/scripts/auth/loginInit';
import { initForgotPasswordPage } from '~/scripts/auth/forgotPasswordInit';
import { initResetPasswordPage } from '~/scripts/auth/resetPasswordInit';
import { initVerifyEmailPage } from '~/scripts/auth/verifyEmail';
import { initDashboardPage } from '~/scripts/auth/dashboardInit';
import { initCommentsPage } from '~/scripts/comments';

interface PageInitializer {
  pattern: RegExp;
  init: (lang: string) => void;
  name: string;
}

class AutoPageInitializer {
  private initializers: PageInitializer[] = [
    {
      pattern: /^\/[a-z]{2}\/register\/?$/,
      init: initRegisterPage,
      name: 'register'
    },
    {
      pattern: /^\/[a-z]{2}\/login\/?$/,
      init: initLoginPage,
      name: 'login'
    },
    {
      pattern: /^\/[a-z]{2}\/forgot-password\/?$/,
      init: initForgotPasswordPage,
      name: 'forgot-password'
    },
    {
      pattern: /^\/[a-z]{2}\/reset-password\/?$/,
      init: initResetPasswordPage,
      name: 'reset-password'
    },
    {
      pattern: /^\/[a-z]{2}\/verify-email\/?$/,
      init: initVerifyEmailPage,
      name: 'verify-email'
    },
    {
      pattern: /^\/[a-z]{2}\/admin\/dashboard\/?$/,
      init: initDashboardPage,
      name: 'dashboard'
    },
    {
      pattern: /^\/[a-z]{2}\/blog\/[a-zA-Z0-9-]+$/,
      init: initCommentsPage,
      name: 'comments'
    },
  ];

  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.isInitialized || typeof window === 'undefined') return;

    // Auto-detect and initialize on page load
    document.addEventListener('astro:page-load', this.autoInitialize.bind(this));
    
    // Initial load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.autoInitialize.bind(this));
    } else {
      this.autoInitialize();
    }

    this.isInitialized = true;
    if (import.meta.env.DEV) {
      console.log('🚀 AutoPageInitializer activated');
    }
  }

  private autoInitialize() {
    const pathname = window.location.pathname;
    const lang = pathname.split('/')[1] || 'en';

    // Find matching initializer
    const matchedInitializer = this.initializers.find(init => 
      init.pattern.test(pathname)
    );

    if (matchedInitializer) {
      try {
        if (import.meta.env.DEV) {
          console.log(`🎯 Auto-initializing ${matchedInitializer.name} page for ${lang}`);
        }
        matchedInitializer.init(lang);
      } catch (error) {
        console.error(`❌ Failed to initialize ${matchedInitializer.name} page:`, error);
      }
    } else if (import.meta.env.DEV) {
      console.log(`ℹ️ No auto-initializer found for: ${pathname}`);
    }
  }

  /**
   * Register a new page initializer
   */
  register(pattern: RegExp, init: (lang: string) => void, name: string) {
    this.initializers.push({ pattern, init, name });
    if (import.meta.env.DEV) {
      console.log(`📝 Registered new initializer: ${name}`);
    }
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      registeredInitializers: this.initializers.length,
      currentPage: window.location.pathname
    };
  }
}

// Global instance
const autoInit = new AutoPageInitializer();

// Export for manual use if needed
export const registerPageInitializer = autoInit.register.bind(autoInit);
export const getAutoInitStats = autoInit.getStats.bind(autoInit);

export default autoInit;
