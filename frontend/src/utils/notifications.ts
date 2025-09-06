import '../types/notifications';
import type { NotificationType } from '../types/notifications';

/**
 * Central notification utility for displaying messages
 * Supports both direct messages and i18n translation keys
 */
export function showNotification(message: string, type: NotificationType = 'info'): void {
  if (!window.StaticNotifications) {
    console.warn('StaticNotifications not available, falling back to console:', type, message);
    console[type === 'error' ? 'error' : 'log'](`[${type.toUpperCase()}] ${message}`);
    return;
  }

  window.StaticNotifications[type](message);
}

/**
 * Show notification using i18n translation key
 * @param translationKey - Key from i18n translations (e.g., 'error.network')
 * @param type - Type of notification
 * @param prefix - Optional prefix to add to translation key (e.g., 'api.' for API errors)
 */
export function showNotificationKey(translationKey: string, type: NotificationType = 'info', prefix?: string): void {
  const finalKey = prefix ? `${prefix}${translationKey}` : translationKey;
  
  if (!window.StaticNotifications) {
    console.warn('StaticNotifications not available, falling back to console:', type, finalKey);
    console[type === 'error' ? 'error' : 'log'](`[${type.toUpperCase()}] ${finalKey}`);
    return;
  }

  if (window.StaticNotifications.showTranslated) {
    window.StaticNotifications.showTranslated(finalKey, type);
  } else {
    // Fallback for older versions
    window.StaticNotifications[type](finalKey);
  }
}

/**
 * Convenience functions for specific notification types
 * @deprecated Use showNotification with type parameter instead
 */
export function showError(message: string): void {
  showNotification(message, 'error');
}

export function showSuccess(message: string): void {
  showNotification(message, 'success');
}

export function showWarning(message: string): void {
  showNotification(message, 'warning');
}

export function showInfo(message: string): void {
  showNotification(message, 'info');
}

export function hideMessages(): void {
  // Not needed with StaticNotifications - they auto-dismiss
  // This function exists for API compatibility
}

/**
 * Modern notification object with type-safe methods
 * Recommended approach for new code
 */
export const notifications = {
  // Direct message methods
  show: showNotification,
  error: (message: string) => showNotification(message, 'error'),
  success: (message: string) => showNotification(message, 'success'),
  warning: (message: string) => showNotification(message, 'warning'),
  info: (message: string) => showNotification(message, 'info'),
  
  // i18n translation key methods
  showKey: showNotificationKey,
  errorKey: (key: string, prefix?: string) => showNotificationKey(key, 'error', prefix),
  successKey: (key: string, prefix?: string) => showNotificationKey(key, 'success', prefix),
  warningKey: (key: string, prefix?: string) => showNotificationKey(key, 'warning', prefix),
  infoKey: (key: string, prefix?: string) => showNotificationKey(key, 'info', prefix),
} as const;

/**
 * Legacy compatibility
 * @deprecated Use showNotification or notifications object instead
 */
export const notify = showNotification;

// Default export for convenience
export default notifications;
