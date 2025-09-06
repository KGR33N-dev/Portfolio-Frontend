/**
 * Global page lifecycle management for Astro View Transitions
 * Automatically handles event listener cleanup between page navigations
 */

interface PageEventListener {
  element: EventTarget;
  type: string;
  listener: EventListener;
  options?: boolean | AddEventListenerOptions;
}

class PageLifecycleManager {
  private eventListeners: PageEventListener[] = [];
  private timeouts: NodeJS.Timeout[] = [];
  private intervals: NodeJS.Timeout[] = [];
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    
    // Auto-cleanup on page navigation
    document.addEventListener('astro:before-swap', this.cleanup.bind(this));
    
    this.isInitialized = true;
    if (import.meta.env.DEV) {
      console.log('🔄 PageLifecycleManager initialized');
    }
  }

  /**
   * Add an event listener that will be automatically removed on page navigation
   */
  addEventListener(
    element: EventTarget | null, 
    type: string, 
    listener: EventListener, 
    options?: boolean | AddEventListenerOptions
  ): void {
    if (!element) return;
    
    element.addEventListener(type, listener, options);
    this.eventListeners.push({ element, type, listener, options });
  }

  /**
   * Set a timeout that will be automatically cleared on page navigation
   */
  setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timeoutId = globalThis.setTimeout(callback, delay);
    this.timeouts.push(timeoutId);
    return timeoutId;
  }

  /**
   * Set an interval that will be automatically cleared on page navigation
   */
  setInterval(callback: () => void, delay: number): NodeJS.Timeout {
    const intervalId = globalThis.setInterval(callback, delay);
    this.intervals.push(intervalId);
    return intervalId;
  }

  /**
   * Manual cleanup - removes all registered listeners, timeouts, and intervals
   */
  cleanup(): void {
    // Remove all event listeners
    this.eventListeners.forEach(({ element, type, listener, options }) => {
      element.removeEventListener(type, listener, options);
    });
    this.eventListeners.length = 0;

    // Clear all timeouts
    this.timeouts.forEach(timeoutId => globalThis.clearTimeout(timeoutId));
    this.timeouts.length = 0;

    // Clear all intervals
    this.intervals.forEach(intervalId => globalThis.clearInterval(intervalId));
    this.intervals.length = 0;

    if (import.meta.env.DEV) {
      console.log('🧹 Page cleanup completed');
    }
  }

  /**
   * Get the current statistics (for debugging)
   */
  getStats() {
    return {
      eventListeners: this.eventListeners.length,
      timeouts: this.timeouts.length,
      intervals: this.intervals.length
    };
  }
}

// Global instance
const pageLifecycle = new PageLifecycleManager();

// Export convenience functions
export const addEventListener = pageLifecycle.addEventListener.bind(pageLifecycle);
export const setTimeout = pageLifecycle.setTimeout.bind(pageLifecycle);
export const setInterval = pageLifecycle.setInterval.bind(pageLifecycle);
export const cleanup = pageLifecycle.cleanup.bind(pageLifecycle);
export const getStats = pageLifecycle.getStats.bind(pageLifecycle);

export default pageLifecycle;
