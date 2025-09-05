export const apiErrorTranslations = {
  en: {
    // ===== AUTHENTICATION ERRORS =====
    // Registration errors
    'api.INVALID_EMAIL_FORMAT': 'Please enter a valid email address',
    'api.WEAK_PASSWORD': 'Password must be at least 8 characters long and contain uppercase, lowercase, number and special character',
    'api.EMAIL_EXISTS': 'An account with this email already exists',
    'api.USERNAME_EXISTS': 'This username is already taken',
    'api.SERVER_CONFIG_ERROR': 'Server configuration error. Please contact support',
    'api.EMAIL_SEND_FAILED': 'Failed to send email. Please try again later',

    // Email verification errors
    'api.USER_NOT_FOUND': 'User not found',
    'api.EMAIL_ALREADY_VERIFIED': 'Your email is already verified',
    'api.email_already_verified': 'Your email is already verified',
    'api.VERIFICATION_CODE_EXPIRED': 'Verification code has expired. Please request a new one',
    'api.INVALID_VERIFICATION_CODE': 'Invalid verification code',

    // Login errors
    'api.INVALID_CREDENTIALS': 'Invalid email or password',
    'api.ACCOUNT_NOT_ACTIVATED': 'Please verify your email address first',
    'api.EMAIL_NOT_VERIFIED': 'Please verify your email before proceeding',
    'api.ACCOUNT_LOCKED': 'Account temporarily locked. Please try again later',

    // Password reset errors
    'api.INVALID_RESET_TOKEN': 'Reset link is invalid or has expired',

    // ===== BLOG MANAGEMENT ERRORS =====
    'api.POST_NOT_FOUND': 'Blog post not found',
    'api.SLUG_EXISTS': 'Blog post with this URL already exists',
    'api.INVALID_LANGUAGE_CODE': 'Invalid language code',
    'api.TRANSLATION_NOT_FOUND': 'Translation not found for this language',
    'api.TRANSLATION_EXISTS': 'Translation already exists for this language',
    'api.LAST_TRANSLATION': 'Cannot delete the last translation',

    // ===== COMMENT SYSTEM ERRORS =====
    'api.COMMENT_NOT_FOUND': 'Comment not found',
    'api.PARENT_COMMENT_NOT_FOUND': 'Parent comment not found',
    'api.MAX_COMMENT_DEPTH': 'Cannot reply to replies. Maximum 2 comment levels allowed',
    'api.COMMENT_EDIT_PERMISSION': 'You can only edit your own comments',
    'api.COMMENT_EDIT_TIMEOUT': 'Comment edit time expired (15 minutes)',
    'api.COMMENT_DELETE_PERMISSION': 'You can only delete your own comments',
    'api.SELF_LIKE_ERROR': 'You cannot like your own comment',

    // ===== PROFILE MANAGEMENT ERRORS =====
    'api.INSUFFICIENT_PERMISSIONS': 'Insufficient permissions',
    'api.ROLE_NOT_FOUND': 'Role not found',
    'api.RANK_NOT_FOUND': 'Rank not found',

    // Password change errors
    'api.PASSWORD_MISMATCH': 'New passwords do not match',
    'api.INVALID_CURRENT_PASSWORD': 'Current password is incorrect',
    'api.SAME_PASSWORD': 'New password must be different from current password',

    // Username change errors
    'api.SAME_USERNAME': 'New username must be different from current username',
    'api.INVALID_USERNAME_FORMAT': 'Username can only contain letters, numbers, underscores and hyphens',

    // Email change errors
    'api.SAME_EMAIL': 'New email must be different from current email',

    // Account deletion errors
    'api.INVALID_CONFIRMATION': 'Invalid confirmation. Type exactly: DELETE_MY_ACCOUNT',
    'api.ADMIN_DELETE_FORBIDDEN': 'Cannot delete admin account. Contact another administrator',
    'api.ACCOUNT_DELETE_ERROR': 'Error occurred while deleting account. Try again or contact support',

    // ===== LANGUAGE MANAGEMENT ERRORS =====
    'api.LANGUAGE_NOT_FOUND': 'Language not found',
    'api.LANGUAGE_EXISTS': 'Language already exists',
    'api.LANGUAGE_ALREADY_INACTIVE': 'Language is already deactivated',
    'api.LANGUAGE_IN_USE': 'Cannot delete language - it is used by blog posts. Use deactivate instead',

    // ===== SYSTEM/INFRASTRUCTURE ERRORS =====
    'api.API_KEY_NOT_FOUND': 'API key not found',
    'api.CONTACT_FORM_ERROR': 'Error sending message. Please try again later',
    'api.CLEANUP_TASK_ERROR': 'Error starting cleanup tasks',
    'api.INACTIVE_USER': 'User account is deactivated',

    // ===== SUCCESS MESSAGES =====
    'api.REGISTRATION_SUCCESS': 'Account created successfully',
    'api.VERIFICATION_CODE_SENT': 'Verification code sent to your email',
    'api.VERIFICATION_CODE_RESENT': 'Verification code resent',
    'api.EMAIL_VERIFICATION_SUCCESS': 'Email verified successfully',
    'api.POST_PUBLISHED': 'Blog post published successfully',
    'api.POST_UNPUBLISHED': 'Blog post unpublished successfully',
    'api.POST_DELETED': 'Blog post deleted successfully',
    'api.COMMENT_LIKE_SUCCESS': 'Comment liked successfully',
    'api.COMMENT_DELETED': 'Comment deleted successfully',
    'api.PASSWORD_CHANGED': 'Password changed successfully',
    'api.USERNAME_CHANGED': 'Username changed successfully',
    'api.EMAIL_CHANGED': 'Email changed successfully',
    'api.ACCOUNT_DELETED': 'Account deleted successfully',
    'api.LANGUAGE_DEACTIVATED': 'Language deactivated successfully',
    'api.LANGUAGE_DELETED': 'Language deleted successfully',
    'api.LANGUAGE_ACTIVATED': 'Language activated successfully',
    'api.TRANSLATION_DELETED': 'Translation deleted successfully',

    // ===== GENERIC ERROR =====
    'api.UNKNOWN_ERROR': 'Something went wrong. Please try again',
  },
  pl: {
    // ===== BŁĘDY UWIERZYTELNIANIA =====
    // Błędy rejestracji
    'api.INVALID_EMAIL_FORMAT': 'Proszę podać prawidłowy adres email',
    'api.WEAK_PASSWORD': 'Hasło musi mieć co najmniej 8 znaków i zawierać wielką literę, małą literę, cyfrę i znak specjalny',
    'api.EMAIL_EXISTS': 'Konto z tym adresem email już istnieje',
    'api.USERNAME_EXISTS': 'Ta nazwa użytkownika jest już zajęta',
    'api.SERVER_CONFIG_ERROR': 'Błąd konfiguracji serwera. Skontaktuj się z pomocą techniczną',
    'api.EMAIL_SEND_FAILED': 'Nie udało się wysłać wiadomości email. Spróbuj ponownie później',

    // Błędy weryfikacji email
    'api.USER_NOT_FOUND': 'Nie znaleziono użytkownika',
    'api.EMAIL_ALREADY_VERIFIED': 'Twój email jest już zweryfikowany',
    'api.email_already_verified': 'Twój email jest już zweryfikowany',
    'api.VERIFICATION_CODE_EXPIRED': 'Kod weryfikacyjny wygasł. Poproś o nowy',
    'api.INVALID_VERIFICATION_CODE': 'Nieprawidłowy kod weryfikacyjny',

    // Błędy logowania
    'api.INVALID_CREDENTIALS': 'Nieprawidłowy email lub hasło',
    'api.ACCOUNT_NOT_ACTIVATED': 'Najpierw zweryfikuj swój adres email',
    'api.EMAIL_NOT_VERIFIED': 'Przed kontynuowaniem zweryfikuj swój email',
    'api.ACCOUNT_LOCKED': 'Konto tymczasowo zablokowane. Spróbuj ponownie później',

    // Błędy resetowania hasła
    'api.INVALID_RESET_TOKEN': 'Link resetujący jest nieprawidłowy lub wygasł',

    // ===== BŁĘDY ZARZĄDZANIA BLOGIEM =====
    'api.POST_NOT_FOUND': 'Nie znaleziono posta na blogu',
    'api.SLUG_EXISTS': 'Post z tym adresem URL już istnieje',
    'api.INVALID_LANGUAGE_CODE': 'Nieprawidłowy kod języka',
    'api.TRANSLATION_NOT_FOUND': 'Nie znaleziono tłumaczenia dla tego języka',
    'api.TRANSLATION_EXISTS': 'Tłumaczenie dla tego języka już istnieje',
    'api.LAST_TRANSLATION': 'Nie można usunąć ostatniego tłumaczenia',

    // ===== BŁĘDY SYSTEMU KOMENTARZY =====
    'api.COMMENT_NOT_FOUND': 'Nie znaleziono komentarza',
    'api.PARENT_COMMENT_NOT_FOUND': 'Nie znaleziono komentarza nadrzędnego',
    'api.MAX_COMMENT_DEPTH': 'Nie można odpowiadać na odpowiedzi. Maksymalnie 2 poziomy komentarzy',
    'api.COMMENT_EDIT_PERMISSION': 'Możesz edytować tylko swoje komentarze',
    'api.COMMENT_EDIT_TIMEOUT': 'Czas na edycję komentarza minął (15 minut)',
    'api.COMMENT_DELETE_PERMISSION': 'Możesz usuwać tylko swoje komentarze',
    'api.SELF_LIKE_ERROR': 'Nie możesz polubić własnego komentarza',

    // ===== BŁĘDY ZARZĄDZANIA PROFILEM =====
    'api.INSUFFICIENT_PERMISSIONS': 'Niewystarczające uprawnienia',
    'api.ROLE_NOT_FOUND': 'Nie znaleziono roli',
    'api.RANK_NOT_FOUND': 'Nie znaleziono rangi',

    // Błędy zmiany hasła
    'api.PASSWORD_MISMATCH': 'Nowe hasła nie są identyczne',
    'api.INVALID_CURRENT_PASSWORD': 'Nieprawidłowe obecne hasło',
    'api.SAME_PASSWORD': 'Nowe hasło musi być różne od obecnego',

    // Błędy zmiany nazwy użytkownika
    'api.SAME_USERNAME': 'Nowy username musi być różny od obecnego',
    'api.INVALID_USERNAME_FORMAT': 'Username może zawierać tylko litery, cyfry, podkreślniki i myślniki',

    // Błędy zmiany email
    'api.SAME_EMAIL': 'Nowy email musi być różny od obecnego',

    // Błędy usuwania konta
    'api.INVALID_CONFIRMATION': 'Nieprawidłowe potwierdzenie. Wpisz dokładnie: DELETE_MY_ACCOUNT',
    'api.ADMIN_DELETE_FORBIDDEN': 'Nie można usunąć konta administratora. Skontaktuj się z innym administratorem',
    'api.ACCOUNT_DELETE_ERROR': 'Wystąpił błąd podczas usuwania konta. Spróbuj ponownie lub skontaktuj się z pomocą techniczną',

    // ===== BŁĘDY ZARZĄDZANIA JĘZYKAMI =====
    'api.LANGUAGE_NOT_FOUND': 'Nie znaleziono języka',
    'api.LANGUAGE_EXISTS': 'Język już istnieje',
    'api.LANGUAGE_ALREADY_INACTIVE': 'Język jest już dezaktywowany',
    'api.LANGUAGE_IN_USE': 'Nie można usunąć języka - jest używany przez posty. Użyj dezaktywacji',

    // ===== BŁĘDY SYSTEMU/INFRASTRUKTURY =====
    'api.API_KEY_NOT_FOUND': 'Nie znaleziono klucza API',
    'api.CONTACT_FORM_ERROR': 'Wystąpił błąd podczas wysyłania wiadomości. Spróbuj ponownie później',
    'api.CLEANUP_TASK_ERROR': 'Wystąpił błąd podczas uruchamiania zadań czyszczenia',
    'api.INACTIVE_USER': 'Konto użytkownika jest zdezaktywowane',

    // ===== KOMUNIKATY SUKCESU =====
    'api.REGISTRATION_SUCCESS': 'Konto zostało utworzone pomyślnie',
    'api.VERIFICATION_CODE_SENT': 'Kod weryfikacyjny został wysłany na Twój email',
    'api.VERIFICATION_CODE_RESENT': 'Kod weryfikacyjny został wysłany ponownie',
    'api.EMAIL_VERIFICATION_SUCCESS': 'Email został zweryfikowany pomyślnie',
    'api.POST_PUBLISHED': 'Post na blogu został opublikowany pomyślnie',
    'api.POST_UNPUBLISHED': 'Post na blogu został wycofany z publikacji',
    'api.POST_DELETED': 'Post na blogu został usunięty pomyślnie',
    'api.COMMENT_LIKE_SUCCESS': 'Komentarz został polubiony pomyślnie',
    'api.COMMENT_DELETED': 'Komentarz został usunięty pomyślnie',
    'api.PASSWORD_CHANGED': 'Hasło zostało zmienione pomyślnie',
    'api.USERNAME_CHANGED': 'Nazwa użytkownika została zmieniona pomyślnie',
    'api.EMAIL_CHANGED': 'Adres email został zmieniony pomyślnie',
    'api.ACCOUNT_DELETED': 'Konto zostało usunięte pomyślnie',
    'api.LANGUAGE_DEACTIVATED': 'Język został zdezaktywowany pomyślnie',
    'api.LANGUAGE_DELETED': 'Język został usunięty pomyślnie',
    'api.LANGUAGE_ACTIVATED': 'Język został aktywowany pomyślnie',
    'api.TRANSLATION_DELETED': 'Tłumaczenie zostało usunięte pomyślnie',

    // ===== BŁĄD OGÓLNY =====
    'api.UNKNOWN_ERROR': 'Coś poszło nie tak. Spróbuj ponownie',
  },
} as const;
