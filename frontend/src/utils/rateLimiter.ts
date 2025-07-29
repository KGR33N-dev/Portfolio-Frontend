// Rate Limiter for Frontend Security
interface RateLimit {
  attempts: number[];
  maxAttempts: number;
  windowMs: number;
}

export class RateLimiter {
  private static storage: Map<string, RateLimit> = new Map();
  
  // Default rate limits
  static readonly LIMITS = {
    LOGIN: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
    REGISTER: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
    VERIFICATION: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
    RESEND: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 resends per hour
  };
  
  static checkLimit(
    identifier: string, 
    type: keyof typeof RateLimiter.LIMITS
  ): {
    allowed: boolean;
    resetTime?: number;
    attemptsLeft?: number;
  } {
    const now = Date.now();
    const limit = this.LIMITS[type];
    const key = `${type}_${identifier}`;
    
    let rateLimitData = this.storage.get(key);
    
    if (!rateLimitData) {
      rateLimitData = {
        attempts: [],
        maxAttempts: limit.maxAttempts,
        windowMs: limit.windowMs
      };
      this.storage.set(key, rateLimitData);
    }
    
    // Remove old attempts outside the time window
    rateLimitData.attempts = rateLimitData.attempts.filter(
      time => now - time < rateLimitData.windowMs
    );
    
    const attemptsLeft = rateLimitData.maxAttempts - rateLimitData.attempts.length;
    
    if (attemptsLeft <= 0) {
      const oldestAttempt = Math.min(...rateLimitData.attempts);
      const resetTime = oldestAttempt + rateLimitData.windowMs;
      
      return {
        allowed: false,
        resetTime,
        attemptsLeft: 0
      };
    }
    
    return {
      allowed: true,
      attemptsLeft
    };
  }
  
  static recordAttempt(
    identifier: string, 
    type: keyof typeof RateLimiter.LIMITS
  ): void {
    const now = Date.now();
    const key = `${type}_${identifier}`;
    
    let rateLimitData = this.storage.get(key);
    
    if (!rateLimitData) {
      const limit = this.LIMITS[type];
      rateLimitData = {
        attempts: [],
        maxAttempts: limit.maxAttempts,
        windowMs: limit.windowMs
      };
      this.storage.set(key, rateLimitData);
    }
    
    rateLimitData.attempts.push(now);
    
    // Clean up old attempts
    rateLimitData.attempts = rateLimitData.attempts.filter(
      time => now - time < rateLimitData.windowMs
    );
  }
  
  static formatResetTime(resetTime: number): string {
    const now = Date.now();
    const msLeft = resetTime - now;
    
    if (msLeft <= 0) return 'now';
    
    const minutes = Math.ceil(msLeft / (60 * 1000));
    
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    const hours = Math.ceil(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  static clearLimit(identifier: string, type: keyof typeof RateLimiter.LIMITS): void {
    const key = `${type}_${identifier}`;
    this.storage.delete(key);
  }
  
  static clearAllLimits(): void {
    this.storage.clear();
  }
}
