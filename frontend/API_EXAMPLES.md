# Updated API Endpoints Usage Examples

The API configuration has been updated to support the new filtering parameters. Here are the updated endpoints and how to use them:

## Updated API Configuration

### Base Endpoint
```typescript
getAllPosts: (params?: {
  limit?: number;
  page?: number;
  tags?: string;           // comma-separated tags: "javascript,python"
  ids?: string;            // comma-separated IDs: "1,2,3"
  sort?: 'published_at' | 'created_at' | 'title';
  order?: 'asc' | 'desc';
  published?: boolean;
  language?: string;
}) => string
```

## Usage Examples

### 1. Filtrowanie po tagach
```javascript
// Using direct API
const apiUrl = API_URLS.getAllPosts({
  tags: 'javascript,python',
  limit: 4
});
fetch(apiUrl)

// Using BlogAPI utility
const apiUrl = BlogAPI.getPostsByTags(['javascript', 'python'], 4);
fetch(apiUrl)
```

### 2. Konkretne posty
```javascript
// Using direct API
const apiUrl = API_URLS.getAllPosts({
  ids: '1,2,3'
});
fetch(apiUrl)

// Using BlogAPI utility
const apiUrl = BlogAPI.getPostsByIds([1, 2, 3]);
fetch(apiUrl)
```

### 3. Sortowanie
```javascript
// Using direct API
const apiUrl = API_URLS.getAllPosts({
  sort: 'published_at',
  order: 'desc'
});
fetch(apiUrl)

// Using BlogAPI utility
const apiUrl = BlogAPI.getPostsSorted('published_at', 'desc', 10);
fetch(apiUrl)
```

### 4. Kombinacja filtrów
```javascript
// Complex filtering with multiple parameters
const apiUrl = API_URLS.getAllPosts({
  tags: 'javascript,react',
  language: 'en',
  limit: 6,
  sort: 'published_at',
  order: 'desc',
  published: true
});
fetch(apiUrl)

// Using BlogAPI utility for filtered posts
const apiUrl = BlogAPI.getPostsFiltered({
  tags: ['javascript', 'react'],
  language: 'en',
  limit: 6,
  sort: 'published_at',
  order: 'desc'
});
fetch(apiUrl)
```

## New BlogAPI Utility Functions

```typescript
BlogAPI.getPostsByTags(tags: string[], limit?: number)
BlogAPI.getPostsByIds(ids: number[])
BlogAPI.getPostsSorted(sortBy?: string, order?: string, limit?: number)
BlogAPI.getPostsByLanguage(language: string, limit?: number)
BlogAPI.getPostsFiltered(filters: {...})
```

## Updated Files

1. **`/config/api.ts`** - Updated getAllPosts function with new parameters and added BlogAPI utilities
2. **`/pages/[lang]/blog.astro`** - Updated to use new sorting parameters
3. **`/pages/[lang]/blog/tag/[tag].astro`** - Updated to use BlogAPI.getPostsByTags()

## Expected API Response Format

The API should return the same BlogApiResponse format:
```typescript
{
  items: Post[],     // Array of post objects
  total: number,     // Total number of posts matching criteria
  page: number,      // Current page number
  pages: number,     // Total number of pages
  per_page: number   // Items per page
}
```

## Backend Verification Needed

Please verify these endpoints exist and work correctly:
- `/api/blog/?tags=javascript,python&limit=4`
- `/api/blog/?ids=1,2,3`
- `/api/blog/?sort=published_at&order=desc`
- `/api/blog/?language=en&published=true`

All parameters should be optional and combinable.
