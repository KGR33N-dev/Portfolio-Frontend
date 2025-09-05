import type { PasswordValidationResult, PasswordRequirement } from '../../types/auth';

/**
 * Validates email format
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email || !email.trim()) {
    return { isValid: false, error: 'Email address is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
}

/**
 * Validates password strength and requirements
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  
  // Length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  // Uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Number
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Special character
  if (!/[!@#$%^&*()_+=[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  const criteria = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[!@#$%^&*()_+=[\]{}|;:,.<>?]/.test(password)
  ];
  
  const score = criteria.filter(Boolean).length;
  
  let strength: PasswordValidationResult['strength'] = 'weak';
  if (score >= 5) strength = 'very-strong';
  else if (score >= 4) strength = 'strong';
  else if (score >= 3) strength = 'medium';
  
  return {
    isValid: errors.length === 0,
    errors,
    strength
  };
}

/**
 * Validates if passwords match
 */
export function validatePasswordMatch(password: string, confirmPassword: string): string | null {
  if (!password || !confirmPassword) {
    return "Both password fields are required.";
  }
  
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }
  
  return null;
}

/**
 * Updates password requirements UI
 */
export function updatePasswordRequirements(password: string): PasswordRequirement[] {
  const requirements: PasswordRequirement[] = [
    { id: 'req-length', test: password.length >= 8 },
    { id: 'req-uppercase', test: /[A-Z]/.test(password) },
    { id: 'req-lowercase', test: /[a-z]/.test(password) },
    { id: 'req-number', test: /\d/.test(password) },
    { id: 'req-special', test: /[!@#$%^&*()_+=[\]{}|;:,.<>?]/.test(password) }
  ];
  
  requirements.forEach(req => {
    const element = document.getElementById(req.id);
    const icon = element?.querySelector('.req-icon');
    if (element && icon) {
      if (req.test) {
        element.classList.remove('text-gray-500', 'dark:text-gray-400');
        element.classList.add('text-green-600', 'dark:text-green-400');
        icon.textContent = '✓';
      } else {
        element.classList.remove('text-green-600', 'dark:text-green-400');
        element.classList.add('text-gray-500', 'dark:text-gray-400');
        icon.textContent = '✗';
      }
    }
  });
  
  return requirements;
}
