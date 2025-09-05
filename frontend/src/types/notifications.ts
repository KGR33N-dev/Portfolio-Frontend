/**
 * Global type declarations for the Static Notification System
 * This file provides TypeScript types for the notification system used across the application
 */

/**
 * Notification type union for type safety
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Notification function signature
 */
export type NotificationFunction = (message: string, duration?: number) => string | null;

/**
 * Enhanced notification interface with i18n support
 */
export interface IStaticNotifications {
  // Core methods
  show: (message: string, type?: NotificationType, duration?: number, isTranslationKey?: boolean) => string | null;
  close: (notificationId: string) => void;
  
  // Direct message methods (backward compatibility)
  error: NotificationFunction;
  success: NotificationFunction;
  info: NotificationFunction;
  warning: NotificationFunction;
  
  // i18n translation key methods
  showTranslated?: (translationKey: string, type?: NotificationType, duration?: number) => string | null;
  successKey?: (translationKey: string, duration?: number) => string | null;
  errorKey?: (translationKey: string, duration?: number) => string | null;
  warningKey?: (translationKey: string, duration?: number) => string | null;
  infoKey?: (translationKey: string, duration?: number) => string | null;
  
  // Utility methods
  getCurrentLanguage?: () => string;
  getTranslation?: (key: string, lang?: string) => string;
}

/**
 * Legacy notification manager interface for backward compatibility
 */
export interface INotificationManager {
  success: (message: string) => string | null;
  error: (message: string) => string | null;
  warning: (message: string) => string | null;
  info: (message: string) => string | null;
  close: (id: string) => void;
}

// Global Window interface extensions for StaticNotifications
declare global {
  interface Window {
    /**
     * Static notification system - always available without initialization
     */
    StaticNotifications?: IStaticNotifications;

    /**
     * Legacy notification manager - for backward compatibility
     * @deprecated Use StaticNotifications instead
     */
    NotificationManager?: INotificationManager;
  }
}
