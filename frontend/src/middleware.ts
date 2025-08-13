import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware((context, next) => {
  // For server-side rendering, we can add middleware logic here
  // For now, just pass through to the next handler
  return next();
});
