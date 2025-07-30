# Konfiguracja API - Environment Variables

## 🚀 Przegląd

Projekt używa zmiennych środowiskowych do konfiguracji API, co pozwala na łatwe przełączanie między środowiskami deweloperskim a produkcyjnym.

## 🔧 Konfiguracja Environment Variables

### Plik `.env`

```bash
PUBLIC_API_URL=http://localhost:8000
PUBLIC_FRONTEND_URL=http://localhost:4321
```

### Dostępne środowiska:

**Lokalne (development):**
```bash
PUBLIC_API_URL=http://localhost:8000
PUBLIC_FRONTEND_URL=http://localhost:4321
```

**Produkcyjne:**
```bash
PUBLIC_API_URL=http://51.20.78.79:8000
PUBLIC_FRONTEND_URL=https://your-domain.com
```

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

Edytuj plik `.env`:

### Lokalne API
```bash
PUBLIC_API_URL=http://localhost:8000
PUBLIC_FRONTEND_URL=http://localhost:4321
```

### Produkcyjne API
```bash
PUBLIC_API_URL=http://51.20.78.79:8000
PUBLIC_FRONTEND_URL=https://your-domain.com
```

## 📝 Development Workflow

### Praca lokalna:
1. Uruchom backend FastAPI lokalnie
2. Ustaw `PUBLIC_API_URL=http://localhost:8000` w `.env`
3. Uruchom frontend: `npm run dev`

### Deploy na produkcję:
1. Ustaw `PUBLIC_API_URL=http://51.20.78.79:8000` w `.env`
2. Ustaw `PUBLIC_FRONTEND_URL=https://your-domain.com` w `.env`
3. Build: `npm run build`

## ⚠️ Ważne uwagi

- **Nigdy nie commituj** pliku `.env` z ustawieniami produkcyjnymi
- Przed push'em sprawdź czy `.env` zawiera lokalne ustawienia
- Użyj `.env.example` jako template dla nowych środowisk
- Zmienne `PUBLIC_*` są dostępne w przeglądarce

## 🔍 Troubleshooting

### Problemy z CORS
Sprawdź czy backend ma poprawnie skonfigurowane CORS origins.

### API nie odpowiada
1. Sprawdź czy backend jest uruchomiony
2. Zweryfikuj URL w `.env`
3. Sprawdź logi w konsoli przeglądarki

### Cache problemy
Po zmianie `.env` wykonaj:
```bash
npm run build
# lub
rm -rf dist/ && npm run dev
```

## 📋 Dostępne Backendy

### 🏠 Lokalny Backend
- **URL:** `http://localhost:8000`
- **Wymaga:** Uruchomienie lokalnego serwera FastAPI
- **Używany:** Podczas developmentu
- **Dostęp:** Tylko z lokalnej maszyny

### ☁️ Zdalny Backend (EC2)
- **URL:** `http://51.20.78.79:8000` 
- **Status:** Gotowy do użycia
- **Używany:** Do testów i produkcji
- **Dostęp:** Publiczny

## 🔍 Debugging

### Sprawdź aktualną konfigurację:
```bash
./switch-api.sh status
```

### Logi w konsoli:
Po uruchomieniu zobaczysz w konsoli przeglądarki:
```
🔧 API Configuration: Using LOCAL/PRODUCTION backend
📡 Base URL: http://localhost:8000 (lub 51.20.78.79:8000)
🌐 Frontend URL: http://localhost:4321
```

### Problemy z CORS:
Jeśli masz problemy z CORS, sprawdź:
1. Czy backend jest uruchomiony
2. Czy konfiguracja CORS w FastAPI zawiera frontend URL
3. Czy używasz poprawnego portu
