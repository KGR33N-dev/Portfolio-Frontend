# 🔐 Authentication System - HTTP-Only Cookies

## 🆕 Nowy system bezpiecznych ciasteczek

**Stan: ✅ ZAKTUALIZOWANY do HTTP-only cookies**

Backend i frontend zostały zaktualizowane do używania bezpiecznych ciasteczek HTTP-only zamiast localStorage. To rozwiązuje problemy z przeglądarką Firefox i zwiększa bezpieczeństwo.

### 🎯 Główne zmiany:

1. **Tokeny są teraz HTTP-only cookies** - nie są dostępne z JavaScript
2. **Brak nagłówków Authorization** - uwierzytelnianie przez ciasteczka
3. **Automatyczne refresh tokenów** - backend obsługuje to transparentnie  
4. **Fallback dla expired tokenów** - frontend automatycznie próbuje odświeżyć

### 🔧 Jak to działa teraz:

#### **Backend (FastAPI)**
- `POST /auth/login` → ustawia HTTP-only cookies (access_token, refresh_token)
- `POST /auth/logout` → czyści ciasteczka
- `POST /auth/refresh` → odświeża access token używając refresh token
- `GET /auth/me` → sprawdza użytkownika przez ciasteczka

#### **Frontend (AdminAuth class)**
- Wszystkie requesty używają `credentials: 'include'`
- Brak przechowywania tokenów w localStorage
- Cache użytkownika do optymalizacji API calls
- Automatyczne przekierowania po login/logout

### 🛡️ Bezpieczeństwo:

✅ **HTTP-only cookies** - zabezpieczone przed XSS  
✅ **SameSite=Lax** - zabezpieczone przed CSRF  
✅ **Secure flag w produkcji** - tylko HTTPS  
✅ **Krótki TTL access token** (15 min) - ograniczone okno ataku  
✅ **Dłuższy refresh token** (7 dni) - wygodne dla użytkownika

## 📂 Struktura plików

```
src/
├─ utils/
│  ├─ adminAuth.ts                   # 🆕 Zaktualizowany do HTTP-only cookies
│  └─ cookieManager.ts              # ❌ Nie używany (stary system)
├─ types/
│  └─ auth.ts                        # TypeScript interfaces i typy
├─ scripts/
│  └─ auth/
│     ├─ loginInit.ts               # 🆕 Zaktualizowany - bez localStorage
│     ├─ verifyEmail.ts             # ✅ Sprawdzony - działa poprawnie
│     ├─ resetPassword.ts           # Logika resetowania hasła
│     └─ ...                        # Inne pliki auth
└─ config/
   └─ api.ts                         # 🆕 Dodane endpointy logout/refresh
```

## 🔧 Jak to działa

### 1. **Types** (`src/types/auth.ts`)
- Definiuje wszystkie interfejsy TypeScript
- Typy dla payloadów, odpowiedzi API, walidacji
- Interfejsy dla forgot password i reset password
- Zapewnia type safety w całej aplikacji

### 2. **Validation** (`src/scripts/auth/validate.ts`)
- `validateEmail()` - sprawdza format email
- `validatePassword()` - sprawdza siłę hasła (długość, znaki specjalne, etc.)
- `validatePasswordMatch()` - porównuje hasła
- `updatePasswordRequirements()` - aktualizuje UI wymagań hasła

### 3. **Forgot Password Logic** (`src/scripts/auth/forgotPassword.ts`)
- `validateForgotPasswordForm()` - waliduje dane formularza
- `requestPasswordReset()` - wysyła żądanie resetu hasła
- Obsługuje różne typy błędów (email not found, not verified, rate limiting)

### 4. **Reset Password Logic** (`src/scripts/auth/resetPassword.ts`)
- `parseResetToken()` - parsuje token z URL
- `resetPassword()` - główna funkcja resetowania
- `startCountdownTimer()` - timer wygaśnięcia linku

### 5. **UI Controllers**
#### **Forgot Password UI** (`src/scripts/auth/forgotPasswordInit.ts`)
- Klasa `ForgotPasswordUI` - zarządza elementami UI forgot password
- `initForgotPasswordPage()` - główna funkcja inicjalizacji
- Obsługuje submissję formularza, loading states, notyfikacje

#### **Reset Password UI** (`src/scripts/auth/resetPasswordInit.ts`)
- Klasa `ResetPasswordUI` - zarządza elementami UI reset password
- `initResetPasswordPage()` - główna funkcja inicjalizacji
- Obsługuje walidację haseł, toggle visibility, countdown timer

### 6. **Astro Pages**
- **forgot-password.astro** - minimalistyczny skrypt forgot password
- **reset-password.astro** - minimalistyczny skrypt reset password
- Używają `define:vars` do przekazania tłumaczeń
- Clean separation of concerns

## ✨ Zalety tej struktury

### 🎯 **Separation of Concerns**
- Forgot password oddzielony od reset password
- Walidacja oddzielona od UI i logiki biznesowej
- Każda funkcjonalność w osobnym pliku
- Łatwe testowanie każdej części osobno

### 🔧 **Reusable Code**
- Funkcje walidacji można używać w innych miejscach
- UI helpers są modularne i reusable
- Email validation używany w różnych formach
- Easy to extend dla innych form auth

### 📝 **Type Safety**
- Wszystko jest typowane w TypeScript
- Oddzielne interfejsy dla forgot i reset password
- IntelliSense i autocompletowanie
- Catch errors at compile time

### 🧪 **Testable**
- Każda funkcja jest pure i łatwa do testowania
- Mocki dla UI dependencies
- Unit tests dla logiki biznesowej
- Oddzielne testy dla forgot i reset password

## 🚀 Użycie

```typescript
// Import całego modułu
import { 
  initForgotPasswordPage, 
  initResetPasswordPage,
  validateEmail,
  validatePassword 
} from '../../scripts/auth';

// Lub import konkretnych funkcji
import { validateEmail } from '../../scripts/auth/validate';
import { requestPasswordReset } from '../../scripts/auth/forgotPassword';
import { resetPassword } from '../../scripts/auth/resetPassword';
```

## 🔄 Jak dodać nową funkcjonalność auth

1. **Dodaj typy** w `src/types/auth.ts`
2. **Napisz walidację** w `src/scripts/auth/validate.ts` (jeśli potrzebna)
3. **Napisz logikę** w odpowiednim pliku w `src/scripts/auth/`
4. **Napisz UI controller** w `src/scripts/auth/[feature]Init.ts`
5. **Dodaj do exports** w `src/scripts/auth/index.ts`
6. **Używaj** w komponencie Astro

## 📋 Features

### ✅ **Forgot Password**
- ✅ Email validation
- ✅ Rate limiting error handling
- ✅ Success notifications with expiry time
- ✅ Auto redirect to login
- ✅ Loading states
- ✅ Multilingual support

### ✅ **Reset Password**
- ✅ Token validation
- ✅ Password strength requirements
- ✅ Real-time password validation UI
- ✅ Password confirmation
- ✅ Countdown timer for token expiry
- ✅ Success/error handling
- ✅ Auto redirect after success

Ta struktura sprawia, że kod jest:
- **Maintainable** - łatwy w utrzymaniu
- **Scalable** - łatwy do rozszerzania
- **Professional** - zgodny z industry standards
- **Type-safe** - bezpieczny typowo
- **Modular** - każda funkcjonalność oddzielnie
