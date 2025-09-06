/**
 * Auth Guard - Universal authentication checker for protected pages
 */

import { AdminAuth } from './adminAuth';

export interface AuthGuardOptions {
  requireAdmin?: boolean; // Czy wymagana jest rola admin
  requireAuth?: boolean;  // Czy wymagane jest logowanie (domyślnie true)
  redirectTo?: string;    // Niestandardowa strona przekierowania
  showLoader?: boolean;   // Czy pokazać loader podczas sprawdzania
}

export class AuthGuard {
  private static isDev = import.meta.env?.DEV || false;

  /**
   * Sprawdza autoryzację użytkownika i przekierowuje jeśli potrzeba
   */
  static async checkAuth(options: AuthGuardOptions = {}): Promise<boolean> {
    const {
      requireAdmin = false,
      requireAuth = true,
      redirectTo,
      showLoader = true
    } = options;

    if (this.isDev) {
      console.log('🔐 AuthGuard: Checking authentication...', { requireAdmin, requireAuth });
    }

    try {
      // Pokazuj loader jeśli żądany
      if (showLoader) {
        this.showLoader(true);
      }

      // Sprawdź czy użytkownik jest zalogowany
      if (requireAuth) {
        const user = await AdminAuth.verifyUser();
        
        if (!user) {
          if (this.isDev) console.log('❌ AuthGuard: User not authenticated');
          this.redirectToLogin(redirectTo);
          return false;
        }

        // Sprawdź czy użytkownik jest adminem (jeśli wymagane)
        if (requireAdmin && !AdminAuth.isUserAdmin(user)) {
          if (this.isDev) console.log('❌ AuthGuard: User not admin');
          this.redirectToLogin(redirectTo);
          return false;
        }

        if (this.isDev) {
          console.log('✅ AuthGuard: Authentication successful', { 
            username: user.username,
            isAdmin: AdminAuth.isUserAdmin(user)
          });
        }
      }

      // Ukryj loader
      if (showLoader) {
        this.showLoader(false);
      }

      return true;

    } catch (error) {
      if (this.isDev) console.error('❌ AuthGuard: Error checking auth:', error);
      
      // Ukryj loader w przypadku błędu
      if (showLoader) {
        this.showLoader(false);
      }

      // Przekieruj w przypadku błędu autoryzacji
      this.redirectToLogin(redirectTo);
      return false;
    }
  }

  /**
   * Przekierowuje do strony logowania
   */
  private static redirectToLogin(customRedirect?: string): void {
    if (customRedirect) {
      window.location.href = customRedirect;
      return;
    }

    // Automatycznie wykryj język z URL
    const currentLang = this.getCurrentLanguage();
    const loginUrl = `/${currentLang}/login`;
    
    if (this.isDev) console.log(`🔄 AuthGuard: Redirecting to login: ${loginUrl}`);
    window.location.href = loginUrl;
  }

  /**
   * Pobiera aktualny język z URL
   */
  private static getCurrentLanguage(): string {
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const supportedLangs = ['en', 'pl', 'de', 'fr', 'es', 'it'];
    
    if (pathSegments.length > 0 && supportedLangs.includes(pathSegments[0])) {
      return pathSegments[0];
    }
    
    return 'en'; // Domyślny język
  }

  /**
   * Pokazuje/ukrywa loader
   */
  private static showLoader(show: boolean): void {
    const loadingElement = document.getElementById('loading-state') || 
                          document.getElementById('auth-loading') ||
                          document.querySelector('.loading-state');
    
    const contentElement = document.getElementById('main-content') ||
                          document.getElementById('dashboard-content') ||
                          document.querySelector('.main-content');

    if (loadingElement) {
      if (show) {
        loadingElement.classList.remove('hidden');
      } else {
        loadingElement.classList.add('hidden');
      }
    }

    if (contentElement) {
      if (show) {
        contentElement.classList.add('hidden');
      } else {
        contentElement.classList.remove('hidden');
      }
    }
  }

  /**
   * Sprawdza autoryzację tylko jeśli elementy DOM są gotowe
   */
  static async initAuthGuard(options: AuthGuardOptions = {}): Promise<void> {
    const checkAndInit = async () => {
      await this.checkAuth(options);
    };

    // Sprawdź czy DOM jest gotowy
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkAndInit);
    } else {
      // DOM już gotowy
      await checkAndInit();
    }

    // Obsługa Astro navigation
    document.addEventListener('astro:page-load', checkAndInit);
  }
}

// Export dla backward compatibility
export const checkAuth = AuthGuard.checkAuth.bind(AuthGuard);
export const initAuthGuard = AuthGuard.initAuthGuard.bind(AuthGuard);
