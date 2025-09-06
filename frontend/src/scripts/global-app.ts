/**
 * Global application script loaded on all pages
 * Handles automatic page initialization and global functionality
 */

// Import the auto-initializer
import './global-auto-init.ts';

// Global initialization
(() => {
  if (typeof window === 'undefined') return;

  // Global error handler
  window.addEventListener('unhandledrejection', (event) => {
    if (import.meta.env.DEV) {
      console.error('Unhandled promise rejection:', event.reason);
    }
  });

  // Global click handler for smooth navigation
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest('a[href]') as HTMLAnchorElement;
    
    if (link && link.href && !link.target && !link.download) {
      const url = new URL(link.href);
      // Only handle internal links
      if (url.origin === window.location.origin) {
        // Let Astro handle the navigation
        return;
      }
    }
  });

  if (import.meta.env.DEV) {
    console.log('🌍 Global app script loaded');
  }
})();
