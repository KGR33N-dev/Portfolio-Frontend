# Deployment na Cloudflare Pages

## 1. Przygotowanie

### A) Ustaw zmienne środowiskowe w Cloudflare Pages Dashboard:

```
PUBLIC_API_URL=https://your-ec2-backend.com
PUBLIC_FRONTEND_URL=https://your-portfolio.pages.dev
NODE_ENV=production
```

### B) Ustaw build settings:
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Node.js version**: `18` lub `20`

## 2. Konfiguracja KV Namespace (dla sesji)

1. W Cloudflare Dashboard → Workers & Pages → KV
2. Utwórz nowy namespace: `portfolio-sessions`
3. Skopiuj namespace ID
4. W `wrangler.toml` zamień `your-kv-namespace-id` na prawdziwy ID

## 3. Deployment

### Opcja A: Automatyczny (Recommended)
1. Połącz Cloudflare Pages z GitHub repository
2. Push do brancha `main` → automatyczny deployment

### Opcja B: Manual
```bash
npm run build
npx wrangler pages deploy dist
```

## 4. Sprawdzenie

Po deployment:
- ✅ Home page ładuje się błyskawicznie (static)
- ✅ Blog posts są aktualne (static z API podczas build)
- ✅ Admin panel działa (SSR z API calls)
- ✅ Login/Register działają (SSR z API calls)

## 5. Monitoring

- Cloudflare Analytics pokażą Ci traffic i performance
- Function calls dla SSR pages będą widoczne w dashboard
- Errors w Workers będą logowane

## Troubleshooting

**Problem**: API calls fail during build
**Rozwiązanie**: Upewnij się że EC2 backend jest dostępny podczas build time

**Problem**: KV binding errors
**Rozwiązanie**: Sprawdź czy namespace ID w wrangler.toml jest poprawny

**Problem**: CORS errors
**Rozwiązanie**: Skonfiguruj CORS w FastAPI backend dla Cloudflare domain
