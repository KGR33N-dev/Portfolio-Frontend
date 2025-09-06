/**
 * Centralized logging utility that respects environment settings
 * Can be controlled by ENABLE_LOGS environment variable
 */

const isDev = import.meta.env.DEV && import.meta.env.PUBLIC_ENABLE_LOGS !== 'false';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args);
  },
  
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  }
};

// For production errors that should always be logged
export const productionLogger = {
  error: (...args: unknown[]) => {
    console.error(...args);
  },
  
  warn: (...args: unknown[]) => {
    console.warn(...args);
  }
};
