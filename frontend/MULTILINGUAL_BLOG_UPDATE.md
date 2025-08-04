# 🌍 Wielojęzyczna Aktualizacja Bloga

## 📋 Podsumowanie Zmian

Zaktualizowano system bloga aby używał nowych wielojęzycznych endpointów API. Teraz każdy post może mieć tłumaczenia w różnych językach.

## 🔄 Główne Zmiany

### 1. **Nowa Struktura API** 
- **Jeden post = wiele języków** - każdy post może mieć tłumaczenia w różnych językach
- **Nowe endpointy** - obsługa `/api/blog/` z parametrami `language`, `category`, etc.
- **Zarządzanie tłumaczeniami** - endpointy do dodawania/edycji/usuwania tłumaczeń

### 2. **Zaktualizowane Typy TypeScript**
```typescript
interface Translation {
  language_code: string;
  title: string;
  content: string;
  excerpt?: string;
  meta_title?: string;
  meta_description?: string;
}

interface ApiPost {
  id: number;
  slug: string;
  author?: string;
  category?: string;
  featured_image?: string;
  tags?: string[];
  is_published: boolean;
  created_at: string;
  updated_at?: string;
  published_at?: string;
  translations: Translation[];
}
```

### 3. **Nowa Struktura Tworzenia Postów**
```json
{
  "slug": "moj-nowy-post",
  "author": "KGR33N",
  "category": "gamedev",
  "featured_image": "https://example.com/image.jpg",
  "tags": ["python", "tutorial"],
  "translations": [
    {
      "language_code": "pl",
      "title": "Mój nowy post",
      "content": "Treść po polsku...",
      "excerpt": "Krótki opis...",
      "meta_title": "SEO tytuł",
      "meta_description": "SEO opis"
    },
    {
      "language_code": "en", 
      "title": "My new post",
      "content": "Content in English...",
      "excerpt": "Short description...",
      "meta_title": "SEO title",
      "meta_description": "SEO description"
    }
  ]
}
```

## 📁 Zaktualizowane Pliki

### **Frontend Configuration:**
- `src/config/api.ts` - nowe endpointy API
- `src/types/blog.ts` - zaktualizowane typy
- `create-sample-post.js` - przykład z wielojęzycznością

### **Pages & Components:**
- `src/pages/[lang]/blog/[slug].astro` - pobieranie wg języka
- `src/pages/[lang]/blog.astro` - filtrowanie wg języka  
- `src/pages/[lang]/blog/category/[category].astro` - kategorie z językiem
- `src/pages/[lang]/admin/create-post.astro` - formularz wielojęzyczny

## 🔗 Nowe Endpointy API

### **Publiczne:**
```bash
# Wszystkie posty (wielojęzyczne)
GET /api/blog/

# Tylko polskie posty
GET /api/blog/?language=pl

# Tylko angielskie posty  
GET /api/blog/?language=en

# Post po slug z określonym językiem
GET /api/blog/{slug}?language=pl
```

### **Administracyjne (wymagają tokenu):**
```bash
# Utwórz post wielojęzyczny
POST /api/blog/
Authorization: Bearer {token}

# Opublikuj post
PUT /api/blog/{post_id}/publish
Authorization: Bearer {token}

# Dodaj tłumaczenie
POST /api/blog/{post_id}/translations
Authorization: Bearer {token}

# Zaktualizuj tłumaczenie
PUT /api/blog/{post_id}/translations/{language_code}
Authorization: Bearer {token}
```

## 🎯 Przykład Użycia

### **Logowanie i tworzenie posta:**
```javascript
// 1. Logowanie
const loginResponse = await fetch('http://localhost:8000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'username=email@example.com&password=password'
});
const { access_token } = await loginResponse.json();

// 2. Tworzenie posta
const post = await fetch('http://localhost:8000/api/blog/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${access_token}`
  },
  body: JSON.stringify({
    slug: "test-post",
    author: "KGR33N", 
    category: "tutorial",
    tags: ["test"],
    translations: [
      {
        language_code: "pl",
        title: "Test po polsku",
        content: "Treść po polsku..."
      },
      {
        language_code: "en",
        title: "Test in English", 
        content: "Content in English..."
      }
    ]
  })
});
```

## ✨ Nowe Funkcjonalności

1. **Wielojęzyczny formularz** - możliwość dodania tłumaczeń dla różnych języków
2. **Inteligentne pobieranie** - automatyczne fallback na dostępne języki
3. **Lepsze SEO** - meta dane per język
4. **Filtry językowe** - posty filtrowane według języka na stronach
5. **Zachowanie kompatybilności** - stare URL-e nadal działają

## 🚀 Co Dalej

1. **Testowanie** - sprawdź nowe endpointy i formularz
2. **Migracja danych** - ewentualna migracja starych postów
3. **Rozszerzenia** - dodanie więcej języków w przyszłości
4. **UI/UX** - usprawnienia interfejsu wielojęzycznego

---

**Status:** ✅ Implementacja ukończona  
**Testy:** 🔄 Wymagane  
**Dokumentacja:** ✅ Zaktualizowana
