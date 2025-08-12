// Language management types
export interface Language {
  id: number;
  code: string;           // 2-3 letter code
  name: string;           // English name
  native_name: string;    // Native name
  is_active: boolean;     // Whether active
  created_at: string;     // ISO datetime
  updated_at: string;     // ISO datetime
  created_by: number;     // ID of admin who added it
}

export interface LanguageCreateRequest {
  code: string;           // 2-3 letter language code (e.g. "pl", "en")
  name: string;           // English name (e.g. "Polish")
  native_name: string;    // Native name (e.g. "Polski")
}

export interface LanguageUpdateRequest {
  name?: string;
  native_name?: string;
  is_active?: boolean;
}

export interface LanguageStats {
  languages: Array<{
    code: string;
    name: string;
    native_name: string;
    is_active: boolean;
    posts_count: number;
  }>;
}

export interface APIResponse {
  success: boolean;
  message: string;
}
