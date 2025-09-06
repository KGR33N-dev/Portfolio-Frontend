// Password Validator with Enhanced Security
interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number; // 0-100
}

interface PasswordRequirement {
  test: (password: string) => boolean;
  message: string;
  weight: number; // Contribution to overall score
}

export class PasswordValidator {
  // Common weak passwords (subset - in production use larger dictionary)
  private static readonly COMMON_PASSWORDS = [
    'password', '123456', 'password123', '12345678', 'qwerty',
    'abc123', 'password1', 'admin', 'letmein', 'welcome',
    'monkey', '1234567890', 'dragon', 'pass', 'master'
  ];
  
  // Password requirements with weights
  private static readonly REQUIREMENTS: PasswordRequirement[] = [
    {
      test: (pwd: string) => pwd.length >= 8,
      message: 'At least 8 characters',
      weight: 15
    },
    {
      test: (pwd: string) => pwd.length >= 12,
      message: 'At least 12 characters (recommended)',
      weight: 10
    },
    {
      test: (pwd: string) => /[A-Z]/.test(pwd),
      message: 'One uppercase letter',
      weight: 15
    },
    {
      test: (pwd: string) => /[a-z]/.test(pwd),
      message: 'One lowercase letter',
      weight: 15
    },
    {
      test: (pwd: string) => /\d/.test(pwd),
      message: 'One number',
      weight: 15
    },
    {
      test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>_]/.test(pwd),
      message: 'One special character (!@#$%^&*_...)',
      weight: 20
    },
    {
      test: (pwd: string) => !this.isCommonPassword(pwd),
      message: 'Not a common password',
      weight: 10
    }
  ];
  
  static validate(password: string): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;
    
    // Check each requirement
    for (const requirement of this.REQUIREMENTS) {
      if (requirement.test(password)) {
        score += requirement.weight;
      } else {
        errors.push(requirement.message);
      }
    }
    
    // Additional scoring factors
    if (password.length > 15) score += 5;
    if (this.hasNoRepeatingChars(password)) score += 5;
    if (this.hasGoodEntropy(password)) score += 5;
    
    // Ensure score doesn't exceed 100
    score = Math.min(score, 100);
    
    // Determine strength
    let strength: PasswordValidationResult['strength'];
    if (score >= 85) strength = 'very-strong';
    else if (score >= 70) strength = 'strong';
    else if (score >= 50) strength = 'medium';
    else strength = 'weak';
    
    return {
      isValid: errors.length === 0,
      errors,
      strength,
      score
    };
  }
  
  private static isCommonPassword(password: string): boolean {
    const lowerPassword = password.toLowerCase();
    return this.COMMON_PASSWORDS.some(common => 
      lowerPassword.includes(common) || common.includes(lowerPassword)
    );
  }
  
  private static hasNoRepeatingChars(password: string): boolean {
    // Check for 3+ consecutive identical characters
    for (let i = 0; i < password.length - 2; i++) {
      if (password[i] === password[i + 1] && password[i] === password[i + 2]) {
        return false;
      }
    }
    return true;
  }
  
  private static hasGoodEntropy(password: string): boolean {
    // Simple entropy check - at least 4 different character types
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const characterTypes = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
    return characterTypes >= 3;
  }
  
  static getStrengthColor(strength: PasswordValidationResult['strength']): string {
    switch (strength) {
      case 'weak': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'strong': return 'text-blue-500';
      case 'very-strong': return 'text-green-500';
      default: return 'text-gray-500';
    }
  }
  
  static getStrengthBgColor(strength: PasswordValidationResult['strength']): string {
    switch (strength) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-blue-500';
      case 'very-strong': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  }
  
  static generateSuggestion(): string {
    const suggestions = [
      'Try combining words with numbers and symbols',
      'Use a passphrase with spaces: "Coffee Mountain 2024!"',
      'Mix uppercase, lowercase, numbers, and symbols',
      'Avoid common words and personal information',
      'Consider using a password manager'
    ];
    
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }
}
