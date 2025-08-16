import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const { url } = context;
  
  // Check if this is an admin route
  if (url.pathname.includes('/admin/')) {
    // If this is an admin route, we could potentially check authorization
    // but since we're using static generation, we'll handle it client-side
    // The actual authorization check happens in the admin pages themselves
    
    // For static pages, we cannot do server-side auth checks,
    // so we let the page render and handle auth client-side
    return next();
  }
  
  // For all other routes, pass through
  return next();
});
