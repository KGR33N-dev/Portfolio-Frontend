# Konfiguracja API - Przełączanie między lokalnym i zdalnym backendem

## 🚀 Szybkie przełączanie (NAJŁATWIEJSZE)

Użyj skryptu do automatycznego przełączania:

```bash
# Sprawdź aktualny status
./switch-api.sh status

# Przełącz na lokalny backend
./switch-api.sh local

# Przełącz na zdalny backend (EC2)
./switch-api.sh remote

# Pokaż wszystkie opcje
./switch-api.sh
```

Po zmianie uruchom: `npm run build` lub `npm run dev`

## 🔧 Ręczne przełączanie

Aby przełączyć między lokalnym a zdalnym backendem, edytuj plik:
```
src/config/api.ts
```

Zmień wartość `USE_LOCAL_API`:
- `true` = lokalny backend (http://localhost:8000)
- `false` = zdalny backend (http://51.20.78.79:8000)

```typescript
const USE_LOCAL_API = false; // Zmień na true aby używać lokalnego API
```

## Konfiguracja endpointów

### Lokalny backend (developement)
- Base URL: `http://localhost:8000`
- Blog API: `http://localhost:8000/api/blog`
- Auth API: `http://localhost:8000/api/auth`
- Admin API: `http://localhost:8000/api/admin`

### Zdalny backend (production - EC2)
- Base URL: `http://51.20.78.79:8000`
- Blog API: `http://51.20.78.79:8000/api/blog`
- Auth API: `http://51.20.78.79:8000/api/auth`
- Admin API: `http://51.20.78.79:8000/api/admin`

## Status w konsoli

Po zmianie konfiguracji zobaczysz w konsoli przeglądarki:
```
🔧 API Configuration: Using LOCAL backend
📡 Base URL: http://localhost:8000
```
lub
```
🔧 API Configuration: Using PRODUCTION backend
📡 Base URL: http://51.20.78.79:8000
```

## Pliki zaktualizowane

1. **src/config/api.ts** - główna konfiguracja API
2. **src/utils/adminAuth.ts** - używa nowej konfiguracji
3. **src/pages/[lang]/blog.astro** - strona bloga
4. **src/pages/admin/posts/[id]/edit.astro** - edycja postów
5. **src/pages/admin/posts/new.astro** - tworzenie postów

## Jak testować lokalnie

1. Uruchom lokalny backend FastAPI na porcie 8000
2. Zmień `USE_LOCAL_API = true` w `src/config/api.ts`
3. Przebuduj projekt: `npm run build` lub `npm run dev`
4. Sprawdź w konsoli przeglądarki, czy używany jest lokalny API

## Przywracanie produkcji

1. Zmień `USE_LOCAL_API = false` w `src/config/api.ts`
2. Przebuduj projekt
3. Sprawdź w konsoli, czy używany jest zdalny API

## Bezpieczeństwo

- Nigdy nie commituj z `USE_LOCAL_API = true` do głównej gałęzi
- Lokalny backend powinien być używany tylko podczas developmentu
- W produkcji zawsze używaj zdalnego backendu na EC2

## Debugowanie

Sprawdź w konsoli przeglądarki (F12):
- Status połączenia z API
- URL używanych endpointów
- Odpowiedzi z serwera
- Ewentualne błędy połączenia
