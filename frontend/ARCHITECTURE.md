# Frontend Architecture: Cloudflare + EC2

## Podział odpowiedzialności:

### 🌐 Cloudflare Pages (Static + SSR)
- **Frontend hosting**: Globalny CDN dla szybkości
- **Static pages** (prerendered podczas build):
  - `/` - Home page (portfolio/landing)
  - `/[lang]/` - Główna strona językowa
  - `/[lang]/blog` - Lista postów blogowych 
  - `/[lang]/contact` - Strona kontaktowa
  - `/[lang]/privacy` - Polityka prywatności
  - `/[lang]/terms` - Regulamin
  - `/[lang]/404` - Strona błędu

- **Server-Side Rendered** (API calls do EC2):
  - `/[lang]/blog/[slug]` - Pojedyncze posty (dla preview mode)
  - `/[lang]/login` - Logowanie (auth API)
  - `/[lang]/register` - Rejestracja (auth API)
  - `/[lang]/forgot-password` - Reset hasła (auth API)
  - `/[lang]/verify-email` - Weryfikacja email (auth API)
  - `/[lang]/admin/**` - Cały panel administracyjny (admin API)

### 🖥️ EC2 (FastAPI Backend)
- **API endpoints**:
  - `/api/blog/` - Zarządzanie postami
  - `/api/auth/` - Autentykacja i autoryzacja
  - `/api/admin/` - Panel administracyjny
  - `/api/comments/` - System komentarzy
- **Database**: PostgreSQL/SQLite
- **File storage**: Local/S3 dla obrazków

## Przepływ danych:

1. **Statyczne strony**: 
   - Build time: Astro generuje HTML z API calls do EC2
   - Runtime: Serwowane z Cloudflare CDN (super szybkie)

2. **Dynamiczne strony**:
   - Runtime: Cloudflare Workers robią API calls do EC2
   - Real-time data z backendu

3. **Admin panel**:
   - SSR na Cloudflare Workers
   - Wszystkie operacje przez API do EC2
   - Bezpieczne - auth tokens, rate limiting

## Korzyści:
- ⚡ **Szybkość**: Static content z CDN
- 💰 **Koszt**: Frontend darmowy, backend tylko EC2
- 🌍 **Global**: Cloudflare ma 200+ lokalizacji
- 🔒 **Bezpieczeństwo**: Separation of concerns
- 📈 **Skalowalność**: CDN automatycznie skaluje
