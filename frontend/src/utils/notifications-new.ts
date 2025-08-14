// Notification System - Reusable notification module
export interface NotificationOptions {
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number; // Duration in milliseconds, 0 for manual close only
  closable?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export class NotificationManager {
  private container: HTMLElement | null = null;
  private notifications: Map<string, HTMLElement> = new Map();
  private isDev: boolean = false;

  constructor(isDev: boolean = false) {
    this.isDev = isDev;
    this.createContainer();
  }

  private createContainer(): void {
    // Find existing container (should always exist as it's in Layout.astro)
    this.container = document.getElementById('notification-container');
    
    if (!this.container) {
      // Fallback: create container if it somehow doesn't exist
      console.warn('⚠️ Notification container not found in DOM, creating fallback...');
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      this.container.className = 'fixed top-20 right-4 space-y-3 pointer-events-none';
      this.container.style.zIndex = '999999';
      document.body.appendChild(this.container);
      
      if (this.isDev) {
        console.log('✅ Fallback notification container created and added to body');
      }
    } else {
      if (this.isDev) {
        console.log('✅ Found existing notification container in DOM');
        console.log('📍 Container position:', this.container.getBoundingClientRect());
        console.log('🎯 Container parent:', this.container.parentElement);
      }
    }
  }

  private generateId(): string {
    return 'notification-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  private getNotificationStyles(type: string): { bgColor: string; textColor: string; borderColor: string; icon: string } {
    const styles = {
      success: {
        bgColor: 'bg-green-50/90 dark:bg-green-900/90',
        textColor: 'text-green-800 dark:text-green-200',
        borderColor: 'border-green-200/90 dark:border-green-700/90',
        icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
        </svg>`
      },
      error: {
        bgColor: 'bg-red-50/90 dark:bg-red-900/90',
        textColor: 'text-red-800 dark:text-red-200',
        borderColor: 'border-red-200/90 dark:border-red-700/90',
        icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
        </svg>`
      },
      warning: {
        bgColor: 'bg-yellow-50/90 dark:bg-yellow-900/90',
        textColor: 'text-yellow-800 dark:text-yellow-200',
        borderColor: 'border-yellow-200/90 dark:border-yellow-700/90',
        icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>`
      },
      info: {
        bgColor: 'bg-blue-50/90 dark:bg-blue-900/90',
        textColor: 'text-blue-800 dark:text-blue-200',
        borderColor: 'border-blue-200/90 dark:border-blue-700/90',
        icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
        </svg>`
      }
    };

    return styles[type as keyof typeof styles] || styles.info;
  }

  show(message: string, options: NotificationOptions = {}): string {
    if (this.isDev) {
      console.log('🚀 NotificationManager.show() called with:', { message, options });
    }

    if (!this.container) {
      if (this.isDev) {
        console.log('📦 Container not found, creating...');
      }
      this.createContainer();
    }

    // If container still not found, it means Layout.astro hasn't loaded yet
    if (!this.container) {
      if (this.isDev) {
        console.error('❌ Static notification container not available - Layout.astro may not be loaded');
      }
      return '';
    }

    const {
      type = 'info',
      duration = 5000,
      closable = true
    } = options;

    const notificationId = this.generateId();
    const styles = this.getNotificationStyles(type);

    if (this.isDev) {
      console.log('🎨 Notification styles:', styles);
      console.log('🆔 Generated ID:', notificationId);
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.id = notificationId;
    notification.className = `pointer-events-auto transform transition-all duration-300 ease-in-out translate-x-full opacity-0`;
    
    notification.innerHTML = `
      <div class="w-auto ${styles.bgColor} border ${styles.borderColor} rounded-lg shadow-lg px-4 py-3">
        <div class="flex items-center whitespace-nowrap">
          <div class="flex-shrink-0 ${styles.textColor}">
            ${styles.icon}
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium ${styles.textColor}">
              ${message}
            </p>
          </div>
          ${closable ? `
            <div class="ml-4 flex-shrink-0 flex">
              <button 
                class="inline-flex ${styles.textColor} hover:${styles.textColor.replace('text-', 'text-').replace('800', '900').replace('200', '100')} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                onclick="window.NotificationManager?.close('${notificationId}')"
              >
                <span class="sr-only">Close</span>
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    if (this.isDev) {
      console.log('🏗️ Notification element created:', notification);
      console.log('📍 Container ready to append:', this.container);
    }

    // Add to container
    this.container.appendChild(notification);
    this.notifications.set(notificationId, notification);

    if (this.isDev) {
      console.log('✅ Notification added to container');
      console.log('📊 Total notifications:', this.notifications.size);
      console.log('🎯 Container children count:', this.container.children.length);
    }

    // Animate in
    requestAnimationFrame(() => {
      notification.className = `pointer-events-auto transform transition-all duration-300 ease-in-out translate-x-0 opacity-100`;
      
      if (this.isDev) {
        console.log('🎬 Animation applied to notification:', notificationId);
      }
    });

    // Auto-close if duration is set
    if (duration > 0) {
      setTimeout(() => {
        this.close(notificationId);
      }, duration);
    }

    if (this.isDev) {
      console.log(`📢 Notification shown: ${type} - ${message}`);
    }

    return notificationId;
  }

  close(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (!notification) return;

    // Animate out
    notification.className = `pointer-events-auto transform transition-all duration-300 ease-in-out translate-x-full opacity-0`;
    
    // Remove after animation
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.notifications.delete(notificationId);
      
      if (this.isDev) {
        console.log(`📢 Notification closed: ${notificationId}`);
      }
    }, 300);
  }

  closeAll(): void {
    for (const [id] of this.notifications) {
      this.close(id);
    }
  }

  // Convenience methods
  success(message: string, options?: Omit<NotificationOptions, 'type'>): string {
    return this.show(message, { ...options, type: 'success' });
  }

  error(message: string, options?: Omit<NotificationOptions, 'type'>): string {
    return this.show(message, { ...options, type: 'error' });
  }

  warning(message: string, options?: Omit<NotificationOptions, 'type'>): string {
    return this.show(message, { ...options, type: 'warning' });
  }

  info(message: string, options?: Omit<NotificationOptions, 'type'>): string {
    return this.show(message, { ...options, type: 'info' });
  }
}

// Global instance
let globalNotificationManager: NotificationManager | null = null;

export function initNotifications(isDev: boolean = false): NotificationManager {
  // Always create/return a fresh manager to ensure it's working
  if (!globalNotificationManager) {
    globalNotificationManager = new NotificationManager(isDev);
    // Make it globally accessible for onclick handlers
    (window as unknown as { NotificationManager: NotificationManager }).NotificationManager = globalNotificationManager;
    
    if (isDev) {
      console.log('🆕 New NotificationManager created and attached to window');
    }
  } else {
    // Ensure it's still attached to window
    (window as unknown as { NotificationManager: NotificationManager }).NotificationManager = globalNotificationManager;
    
    if (isDev) {
      console.log('♻️ Existing NotificationManager reattached to window');
    }
  }
  
  return globalNotificationManager;
}

export function getNotificationManager(): NotificationManager | null {
  return globalNotificationManager;
}

// Simple API for quick use
export const notify = {
  success: (message: string, options?: Omit<NotificationOptions, 'type'>) => {
    const manager = getNotificationManager();
    return manager ? manager.success(message, options) : '';
  },
  error: (message: string, options?: Omit<NotificationOptions, 'type'>) => {
    const manager = getNotificationManager();
    return manager ? manager.error(message, options) : '';
  },
  warning: (message: string, options?: Omit<NotificationOptions, 'type'>) => {
    const manager = getNotificationManager();
    return manager ? manager.warning(message, options) : '';
  },
  info: (message: string, options?: Omit<NotificationOptions, 'type'>) => {
    const manager = getNotificationManager();
    return manager ? manager.info(message, options) : '';
  }
};
