export const authTranslations = {
  en: {
    // ===== LOGIN & VERIFICATION =====
    'auth.emailVerifiedSuccess': 'Email verified successfully! You can now log in.',
    'auth.signingIn': 'Signing in...',
    'auth.fillAllFields': 'Please fill in all fields',
    'auth.loginSuccess': 'Login successful! Redirecting...',
    'auth.loginFailed': 'Login failed',
    'auth.loginButton': 'Sign In',

    // ===== REGISTRATION =====
    'auth.accountCreated': 'Account created successfully! Please check your email to verify your account.',
    'auth.registrationFailed': 'Registration failed',
    'auth.fixErrors': 'Please fix the errors above',
    'auth.creatingAccount': 'Creating account...',
    'auth.tooManyRegistrationAttempts': 'Too many registration attempts. Please try again later.',
    'auth.registerButton': 'Create Account',

    // ===== FORGOT PASSWORD =====
    'auth.emailNotFound': 'No account found with this email address',
    'auth.emailNotVerified': 'Email not verified. Cannot reset password for unverified account.',
    'auth.tooManyAttempts': 'Too many attempts. Please try again later.',
    'auth.resetLinkSent': 'Password reset link has been sent to your email.',
    'auth.resetLinkExpiry': 'The reset link will expire in {minutes} minutes.',
    'auth.sendingResetLink': 'Sending reset link...',
    'auth.enterEmailAddress': 'Enter your email address',
    'auth.resetLinkFailed': 'Failed to send reset link. Please try again.',
    'auth.sendResetLink': 'Send Reset Link',

    // ===== RESET PASSWORD =====
    'auth.passwordResetSuccess': 'Password reset successfully! You can now log in with your new password.',
    'auth.passwordResetFailed': 'Failed to reset password. Please try again.',
    'auth.invalidResetToken': 'Invalid or expired reset token. Please request a new reset link.',
    'auth.passwordsDoNotMatch': 'Passwords do not match',
    'auth.passwordTooWeak': 'Password is too weak. Please choose a stronger password.',
    'auth.resettingPassword': 'Resetting password...',
    'auth.goToLogin': 'Go to Login',
    'auth.linkExpired': 'Reset link has expired',
    'auth.requestNewLink': 'Request New Link',
    'auth.resetPassword': 'Reset Password',

    // ===== EMAIL VERIFICATION =====
    'verifyEmail.enterEmailAndCode': 'Please enter both email and verification code',
    'verifyEmail.verificationCodeLength': 'Verification code must be 6 digits',
    'verifyEmail.enterEmail': 'Please enter your email address',
    'verifyEmail.success': 'Email verified successfully! Redirecting...',
    'verifyEmail.codeSent': 'Verification code sent! Please check your email.',
  },
  pl: {
    // ===== LOGOWANIE I WERYFIKACJA =====
    'auth.emailVerifiedSuccess': 'Email zweryfikowany pomyślnie! Możesz się teraz zalogować.',
    'auth.signingIn': 'Logowanie...',
    'auth.fillAllFields': 'Proszę wypełnić wszystkie pola',
    'auth.loginSuccess': 'Logowanie udane! Przekierowywanie...',
    'auth.loginFailed': 'Logowanie nieudane',
    'auth.loginButton': 'Zaloguj się',

    // ===== REJESTRACJA =====
    'auth.accountCreated': 'Konto utworzone pomyślnie! Sprawdź swoją skrzynkę email aby zweryfikować konto.',
    'auth.registrationFailed': 'Rejestracja nieudana',
    'auth.fixErrors': 'Proszę poprawić błędy powyżej',
    'auth.creatingAccount': 'Tworzenie konta...',
    'auth.tooManyRegistrationAttempts': 'Zbyt wiele prób rejestracji. Spróbuj ponownie później.',
    'auth.registerButton': 'Utwórz Konto',

    // ===== ZAPOMNIAŁEM HASŁA =====
    'auth.emailNotFound': 'Nie znaleziono konta z tym adresem email',
    'auth.emailNotVerified': 'Email nie został zweryfikowany. Nie można zresetować hasła dla niezweryfikowanego konta.',
    'auth.tooManyAttempts': 'Zbyt wiele prób. Spróbuj ponownie później.',
    'auth.resetLinkSent': 'Link do resetowania hasła został wysłany na Twój email.',
    'auth.resetLinkExpiry': 'Link resetujący wygaśnie za {minutes} minut.',
    'auth.sendingResetLink': 'Wysyłanie linku resetującego...',
    'auth.enterEmailAddress': 'Wprowadź swój adres email',
    'auth.resetLinkFailed': 'Nie udało się wysłać linku resetującego. Spróbuj ponownie.',
    'auth.sendResetLink': 'Wyślij Link Resetujący',

    // ===== RESETOWANIE HASŁA =====
    'auth.passwordResetSuccess': 'Hasło zresetowane pomyślnie! Możesz się teraz zalogować swoim nowym hasłem.',
    'auth.passwordResetFailed': 'Nie udało się zresetować hasła. Spróbuj ponownie.',
    'auth.invalidResetToken': 'Nieprawidłowy lub wygasły token resetujący. Poproś o nowy link resetujący.',
    'auth.passwordsDoNotMatch': 'Hasła nie są identyczne',
    'auth.passwordTooWeak': 'Hasło jest za słabe. Wybierz silniejsze hasło.',
    'auth.resettingPassword': 'Resetowanie hasła...',
    'auth.goToLogin': 'Idź do Logowania',
    'auth.linkExpired': 'Link resetujący wygasł',
    'auth.requestNewLink': 'Poproś o Nowy Link',
    'auth.resetPassword': 'Zresetuj Hasło',

    // ===== WERYFIKACJA EMAIL =====
    'verifyEmail.enterEmailAndCode': 'Proszę wprowadzić email i kod weryfikacyjny',
    'verifyEmail.verificationCodeLength': 'Kod weryfikacyjny musi mieć 6 cyfr',
    'verifyEmail.enterEmail': 'Proszę wprowadzić adres email',
    'verifyEmail.success': 'Email zweryfikowany pomyślnie! Przekierowywanie...',
    'verifyEmail.codeSent': 'Kod weryfikacyjny został wysłany! Sprawdź swoją skrzynkę pocztową.',
  },
} as const;
