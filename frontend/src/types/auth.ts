// Authentication related types
export interface ResetPasswordPayload {
  token: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordPayload {
  email: string;
  language: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  translation_code?: string;
  data?: {
    expires_in_minutes?: number;
  };
}

export interface ResetTokenData {
  token: string;
  email: string;
  isValid: boolean;
  errorMessage?: string;
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
}

export interface PasswordRequirement {
  id: string;
  test: boolean;
}

export interface ResetPasswordTranslations {
  passwordResetSuccess: string;
  passwordResetFailed: string;
  invalidResetToken: string;
  passwordsDoNotMatch: string;
  passwordTooWeak: string;
  resettingPassword: string;
  goToLogin: string;
  linkExpired: string;
  requestNewLink: string;
  resetPassword: string;
}

export interface ForgotPasswordTranslations {
  emailNotFound: string;
  emailNotVerified: string;
  tooManyAttempts: string;
  resetLinkSent: string;
  resetLinkExpiry: string;
  sendingResetLink: string;
  enterEmailAddress: string;
  resetLinkFailed: string;
  sendResetLink: string;
}

export interface RegisterTranslations {
  accountCreated: string;
  registrationFailed: string;
  fixErrors: string;
  creatingAccount: string;
  tooManyRegistrationAttempts: string;
  registerButton: string;
}
