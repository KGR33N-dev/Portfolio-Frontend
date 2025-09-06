# 🔐 AuthGuard - Universal Authentication Protection

## Opis

AuthGuard to uniwersalny system ochrony autoryzacji dla stron wymagających logowania w projekcie Portfolio-Frontend. Automatycznie sprawdza czy użytkownik jest zalogowany i przekierowuje na stronę logowania jeśli nie jest.

## Implementacja

### Zaimplementowano ochronę na następujących stronach:

1. **Account Settings** (`/[lang]/account.astro`) - wymaga logowania
2. **Admin Dashboard** (`/[lang]/admin/dashboard.astro`) - wymaga roli admin
3. **Create Post** (`/[lang]/admin/create-post.astro`) - wymaga roli admin  
4. **Edit Post** (`/[lang]/admin/edit-post/[postId].astro`) - wymaga roli admin
5. **Language Management** (`/[lang]/admin/languages.astro`) - wymaga roli admin

### Jak działa

1. **Sprawdzanie autoryzacji**: Używa `AdminAuth.verifyUser()` z HTTP-only cookies
2. **Sprawdzanie roli admin**: Używa `AdminAuth.isUserAdmin()` dla stron admin
3. **Loading state**: Pokazuje spinner podczas sprawdzania autoryzacji
4. **Automatyczne przekierowanie**: Przekierowuje na `/[lang]/login` jeśli brak autoryzacji
5. **Wykrywanie języka**: Automatycznie wykrywa język z URL dla prawidłowego przekierowania

## Użycie

### Podstawowe użycie (tylko logowanie):
```javascript
import { AuthGuard } from '~/utils/authGuard';

AuthGuard.initAuthGuard({
  requireAuth: true,
  requireAdmin: false,
  showLoader: true
});
```

### Dla stron admin (wymaga roli admin):
```javascript
import { AuthGuard } from '~/utils/authGuard';

AuthGuard.initAuthGuard({
  requireAuth: true,
  requireAdmin: true, 
  showLoader: true
});
```

### Niestandardowe przekierowanie:
```javascript
AuthGuard.initAuthGuard({
  requireAuth: true,
  redirectTo: '/custom-login'
});
```

## Opcje konfiguracji

| Opcja | Typ | Domyślna | Opis |
|-------|-----|----------|------|
| `requireAuth` | boolean | true | Czy wymagane jest logowanie |
| `requireAdmin` | boolean | false | Czy wymagana jest rola admin |
| `showLoader` | boolean | true | Czy pokazać loader podczas sprawdzania |
| `redirectTo` | string | auto | Niestandardowa strona przekierowania |

## Elementy DOM

AuthGuard automatycznie zarządza następującymi elementami:

### Loading states:
- `#auth-loading` - główny loader autoryzacji
- `#loading-state` - uniwersalny loader  
- `.loading-state` - loader z klasą

### Content containers:
- `#main-content` - główna zawartość strony
- `#dashboard-content` - zawartość dashboardu
- `.main-content` - zawartość z klasą

## Workflow

1. **Inicjalizacja**: AuthGuard uruchamia się przy `DOMContentLoaded` i `astro:page-load`
2. **Pokazanie loadera**: Ukrywa zawartość i pokazuje loader
3. **Sprawdzenie autoryzacji**: Wywołuje API sprawdzenia użytkownika
4. **Sprawdzenie roli**: Jeśli `requireAdmin=true`, sprawdza rolę
5. **Ukrycie loadera**: Pokazuje zawartość przy sukcesie
6. **Przekierowanie**: Przy błędzie przekierowuje na login

## Obsługa języków

Obsługiwane języki: `en`, `pl`, `de`, `fr`, `es`, `it`

Automatyczne wykrywanie z URL:
- `/pl/admin/dashboard` → przekierowanie do `/pl/login`
- `/en/account` → przekierowanie do `/en/login`
- `/invalid/path` → przekierowanie do `/en/login` (fallback)

## Integracja z istniejącym kodem

AuthGuard współpracuje z:
- **AdminAuth**: Wykorzystuje istniejące metody autoryzacji
- **Astro Navigation**: Obsługuje `astro:page-load` events
- **HTTP-only cookies**: Bezpieczne przechowywanie tokenów
- **Dark Mode**: Loader działa z ciemnym motywem

## Bezpieczeństwo

- ✅ **Client-side protection**: Natychmiastowe przekierowanie
- ✅ **HTTP-only cookies**: Tokeny niedostępne dla JavaScript
- ✅ **Role-based access**: Różne poziomy dostępu
- ✅ **Automatic refresh**: Obsługa odświeżania tokenów
- ⚠️ **Server-side validation**: Każde API call nadal wymaga walidacji po stronie serwera

## Troubleshooting

### Problemy z przekierowaniem:
1. Sprawdź czy URL zawiera prawidłowy kod języka
2. Upewnij się że strona login istnieje dla danego języka

### Loader nie znika:
1. Sprawdź console czy nie ma błędów API
2. Upewnij się że elementy `#main-content` istnieją

### Autoryzacja nie działa:
1. Sprawdź czy cookies są ustawione
2. Sprawdź czy AdminAuth jest poprawnie zaimportowany

## Przykład implementacji w nowej stronie

```astro
---
// W pliku .astro
const metadata = {
  title: 'Protected Page',
  robots: { index: false, follow: false }
};
---

<Layout metadata={metadata}>
  <!-- Loading State -->
  <div id="auth-loading" class="flex items-center justify-center min-h-screen">
    <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
  </div>

  <!-- Main Content (hidden until auth check) -->
  <div id="main-content" class="hidden">
    <!-- Twoja zawartość tutaj -->
  </div>
</Layout>

<script>
  import { AuthGuard } from '~/utils/authGuard';
  
  AuthGuard.initAuthGuard({
    requireAuth: true,
    requireAdmin: false,
    showLoader: true
  });
</script>
```

## Status implementacji

✅ **Zaimplementowane strony**:
- Account Settings
- Admin Dashboard  
- Create Post
- Edit Post
- Language Management

✅ **Funkcjonalności**:
- Sprawdzanie autoryzacji
- Sprawdzanie roli admin
- Loading states
- Automatyczne przekierowanie
- Wykrywanie języka
- Obsługa Astro navigation

🔄 **Przyszłe ulepszenia**:
- Server-side middleware
- Role-based permissions
- Session timeout handling
- Redirect after login
