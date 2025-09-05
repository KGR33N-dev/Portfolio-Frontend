import { API_URLS } from '../config/api.ts';
import type {
  Language,
  LanguageStats,
  LanguageCreateRequest,
  LanguageUpdateRequest
} from '../types/language.ts';

// Language management utility functions
export class LanguageAPI {
  
  /**
   * Get list of languages
   */
  static async getLanguages(activeOnly = true): Promise<Language[]> {
    const response = await fetch(API_URLS.getLanguages(activeOnly));
    if (!response.ok) {
      throw new Error(`Failed to fetch languages: ${response.statusText}`);
    }
    return await response.json();
  }

  /**
   * Get language codes only (for validation)
   */
  static async getLanguageCodes(activeOnly = true): Promise<string[]> {
    const response = await fetch(API_URLS.getLanguageCodes(activeOnly));
    if (!response.ok) {
      throw new Error(`Failed to fetch language codes: ${response.statusText}`);
    }
    return await response.json();
  }

  /**
   * Get specific language details
   */
  static async getLanguage(code: string): Promise<Language> {
    const response = await fetch(API_URLS.getLanguage(code));
    if (!response.ok) {
      throw new Error(`Failed to fetch language ${code}: ${response.statusText}`);
    }
    return await response.json();
  }

  /**
   * Create new language (Admin only)
   */
  static async createLanguage(data: LanguageCreateRequest): Promise<Language> {
    const response = await fetch(API_URLS.createLanguage(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      let errorMessage = `Failed to create language (${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // Fallback to text if JSON parsing fails
        try {
          const textError = await response.text();
          errorMessage = textError || errorMessage;
        } catch {
          // Keep default message if both fail
        }
      }
      throw new Error(errorMessage);
    }
    return await response.json();
  }

  /**
   * Update language (Admin only)
   */
  static async updateLanguage(code: string, data: LanguageUpdateRequest): Promise<Language> {
    const response = await fetch(API_URLS.updateLanguage(code), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      let errorMessage = `Failed to update language ${code} (${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        try {
          const textError = await response.text();
          errorMessage = textError || errorMessage;
        } catch {
          // Keep default message
        }
      }
      throw new Error(errorMessage);
    }
    return await response.json();
  }

  /**
   * Delete language permanently (Admin only)
   */
  static async deleteLanguage(code: string): Promise<void> {
    const response = await fetch(API_URLS.deleteLanguage(code), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      let errorMessage = `Failed to delete language ${code} (${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        try {
          const textError = await response.text();
          errorMessage = textError || errorMessage;
        } catch {
          // Keep default message
        }
      }
      throw new Error(errorMessage);
    }
  }

  /**
   * Activate language (Admin only)
   */
  static async activateLanguage(code: string): Promise<Language> {
    const response = await fetch(API_URLS.activateLanguage(code), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      let errorMessage = `Failed to activate language ${code} (${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        try {
          const textError = await response.text();
          errorMessage = textError || errorMessage;
        } catch {
          // Keep default message
        }
      }
      throw new Error(errorMessage);
    }
    return await response.json();
  }

  /**
   * Deactivate language (Admin only)
   */
  static async deactivateLanguage(code: string): Promise<Language> {
    const response = await fetch(API_URLS.deactivateLanguage(code), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      let errorMessage = `Failed to deactivate language ${code} (${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        try {
          const textError = await response.text();
          errorMessage = textError || errorMessage;
        } catch {
          // Keep default message
        }
      }
      throw new Error(errorMessage);
    }
    return await response.json();
  }

  /**
   * Get language usage statistics
   */
  static async getLanguageStats(): Promise<LanguageStats> {
    const response = await fetch(API_URLS.getLanguageStats());
    if (!response.ok) {
      throw new Error(`Failed to fetch language stats: ${response.statusText}`);
    }
    return await response.json();
  }
}

// Helper functions for language operations
export const LanguageUtils = {
  /**
   * Validate language code format
   */
  validateLanguageCode(code: string): boolean {
    return /^[a-z]{2,3}$/.test(code.toLowerCase());
  },

  /**
   * Format language display name
   */
  formatLanguageDisplay(language: Language): string {
    return `${language.native_name} (${language.name})`;
  },

  /**
   * Get language flag emoji (basic implementation)
   */
  getLanguageFlag(code: string): string {
    const flags: { [key: string]: string } = {
      'pl': '🇵🇱',
      'en': '🇺🇸',
      'de': '🇩🇪',
      'fr': '🇫🇷',
      'es': '🇪🇸',
      'it': '🇮🇹',
      'pt': '🇵🇹',
      'ru': '🇷🇺',
      'zh': '🇨🇳',
      'ja': '🇯🇵',
      'ko': '🇰🇷'
    };
    return flags[code.toLowerCase()] || '🌐';
  },

  /**
   * Sort languages by name
   */
  sortLanguages(languages: Language[], sortBy: 'name' | 'native_name' | 'code' = 'name'): Language[] {
    return [...languages].sort((a, b) => a[sortBy].localeCompare(b[sortBy]));
  }
};

// Make LanguageAPI available globally for script tags
if (typeof window !== 'undefined') {
  (window as typeof window & { LanguageAPI: typeof LanguageAPI }).LanguageAPI = LanguageAPI;
  (window as typeof window & { LanguageUtils: typeof LanguageUtils }).LanguageUtils = LanguageUtils;
}
