// Nowa struktura odpowiadająca backend API
export interface Translation {
  language_code: string;
  title: string;
  content: string;
  excerpt?: string;
  meta_title?: string;
  meta_description?: string;
}

export interface ApiPost {
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

// Interfejs dla kompatybilności z istniejącym kodem frontend
export interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  author?: string;
  category?: string;
  created_at: string;
  updated_at?: string;
  published_at?: string;
  featured_image?: string;
  is_published: boolean;
  tags?: string[];
  meta_title?: string;
  meta_description?: string;
  publishDate: Date;
  permalink: string;
  readingTime?: string;
  language?: string;
  
  // Dostęp do wszystkich tłumaczeń
  translations?: Translation[];
  
  // Pomocnicze właściwości dla aktualnego języka
  currentTitle?: string;
  currentContent?: string;
  currentExcerpt?: string;
  currentMetaTitle?: string;
  currentMetaDescription?: string;
}

export interface Category {
  id?: number;
  title: string;
  slug: string;
  description?: string;
}

export interface Tag {
  id?: number;
  title: string;
  slug: string;
  description?: string;
}

// Comment types
export interface Comment {
  id: number;
  postId: number;
  author: string;
  email: string;
  website?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  parentId?: number; // For nested replies
  isApproved: boolean;
  replies?: Comment[];
}

export interface CreateCommentData {
  postId: number;
  author: string;
  email: string;
  website?: string;
  content: string;
  parentId?: number;
}

// Comment API Response
export interface CommentApiResponse {
  items: Comment[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// Struktura odpowiedzi API
export interface BlogApiResponse {
  items: ApiPost[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// Struktura dla tworzenia nowych postów
export interface CreatePostData {
  slug: string;
  author?: string;
  category?: string;
  featured_image?: string;
  tags?: string[];
  translations: Translation[];
}

// Helper function to convert API response to Post format
export function convertApiPostToPost(apiPost: ApiPost, requestedLang: string = 'en'): Post {
  // Znajdź tłumaczenie dla danego języka lub fallback na pierwsze dostępne
  const translation = apiPost.translations.find(t => t.language_code === requestedLang) || apiPost.translations[0];
  
  if (!translation) {
    console.warn(`No translation found for post ${apiPost.id}, available languages:`, apiPost.translations?.map(t => t.language_code));
    throw new Error(`No translation found for post ${apiPost.id}`);
  }

  console.log(`Converting post ${apiPost.id} with ${translation.language_code} translation (requested: ${requestedLang})`);

  return {
    id: apiPost.id,
    slug: apiPost.slug,
    title: translation.title,
    content: translation.content,
    excerpt: translation.excerpt,
    meta_title: translation.meta_title,
    meta_description: translation.meta_description,
    author: apiPost.author,
    category: apiPost.category,
    featured_image: apiPost.featured_image,
    is_published: apiPost.is_published,
    tags: apiPost.tags,
    created_at: apiPost.created_at,
    updated_at: apiPost.updated_at,
    published_at: apiPost.published_at,
    publishDate: new Date(apiPost.published_at || apiPost.created_at),
    permalink: `/${requestedLang}/blog/${apiPost.slug}`, // Always use requested language for consistency
    language: requestedLang, // Use requested language for UI consistency
    translations: apiPost.translations,
    readingTime: estimateReadingTime(translation.content),
    
    // Dodatkowe pomocnicze właściwości dla łatwego dostępu
    currentTitle: translation.title,
    currentContent: translation.content,
    currentExcerpt: translation.excerpt,
    currentMetaTitle: translation.meta_title,
    currentMetaDescription: translation.meta_description
  };
}

// Helper function to estimate reading time
function estimateReadingTime(content: string): string {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} min`;
}

// Helper function to get current content for a specific language
export function getCurrentContent(translations: Translation[], lang: string, field: keyof Translation): string | undefined {
  const translation = translations.find(t => t.language_code === lang) || translations[0];
  return translation?.[field];
}

// Helper function to check if post has translation for specific language
export function hasTranslation(apiPost: ApiPost, lang: string): boolean {
  return apiPost.translations.some(t => t.language_code === lang);
}

// Helper function to get available languages for a post
export function getAvailableLanguages(apiPost: ApiPost): string[] {
  return apiPost.translations.map(t => t.language_code);
}
