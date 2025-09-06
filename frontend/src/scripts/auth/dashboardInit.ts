/**
 * Dashboard page auto-initialization
 */

import { DashboardManager } from '~/scripts/dashboard';
import { AdminAuth } from '~/utils/adminAuth';
import { API_URLS } from '~/config/api';

export function initDashboardPage(lang: string): void {
  if (import.meta.env.DEV) {
    console.log(`🏠 Initializing dashboard page for language: ${lang}`);
  }

  // Check if we're actually on the dashboard page
  const requiredElements = ['total-posts', 'published-posts', 'draft-posts'];
  const missingElements = requiredElements.filter(id => !document.getElementById(id));
  
  if (missingElements.length > 0) {
    if (import.meta.env.DEV) {
      console.log('Dashboard: Required elements not found, skipping initialization. Missing:', missingElements);
    }
    return;
  }

  // Make necessary globals available
  if (typeof window !== 'undefined') {
    window.AdminAuth = AdminAuth;
    window.API_URLS = API_URLS;
  }

  // Basic translations (these would normally come from the page)
  const translations = {
    loadingPosts: lang === 'pl' ? 'Ładowanie postów...' : 'Loading posts...',
    noPostsYet: lang === 'pl' ? 'Brak postów' : 'No posts yet',
    errorLoadingData: lang === 'pl' ? 'Błąd ładowania danych' : 'Error loading data',
    connected: lang === 'pl' ? 'Połączono' : 'Connected',
    disconnected: lang === 'pl' ? 'Rozłączono' : 'Disconnected',
    published: lang === 'pl' ? 'Opublikowany' : 'Published',
    draft: lang === 'pl' ? 'Szkic' : 'Draft',
    edit: lang === 'pl' ? 'Edytuj' : 'Edit',
    checking: lang === 'pl' ? 'Sprawdzanie...' : 'Checking...'
  };

  try {
    // Initialize dashboard manager
    const dashboardManager = new DashboardManager(translations, import.meta.env.DEV);
    dashboardManager.init();

    if (import.meta.env.DEV) {
      console.log('✅ Dashboard initialized successfully');
    }
  } catch (error) {
    console.error('❌ Failed to initialize dashboard:', error);
  }
}

// Add global types for AdminAuth and API_URLS
declare global {
  interface Window {
    AdminAuth: typeof AdminAuth;
    API_URLS: typeof API_URLS;
  }
}
