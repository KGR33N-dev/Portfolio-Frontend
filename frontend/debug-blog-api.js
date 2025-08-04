#!/usr/bin/env node

// Script to debug blog API issues
const API_BASE = 'http://localhost:8000';

async function testApi() {
  console.log('🔍 Testing Blog API Endpoints...\n');
  
  try {
    // 1. Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${API_BASE}/api/health`);
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Health check:', health);
    } else {
      console.log('❌ Health check failed:', healthResponse.status);
    }
    
    // 2. Test getting all posts (without language filter)
    console.log('\n2. Testing getAllPosts (no filters)...');
    const allPostsUrl = `${API_BASE}/api/blog/`;
    console.log('URL:', allPostsUrl);
    
    const allPostsResponse = await fetch(allPostsUrl);
    console.log('Status:', allPostsResponse.status);
    
    if (allPostsResponse.ok) {
      const allPosts = await allPostsResponse.json();
      console.log('✅ All posts response:', {
        total: allPosts.total,
        items_count: allPosts.items?.length || 0,
        first_item: allPosts.items?.[0] ? {
          id: allPosts.items[0].id,
          slug: allPosts.items[0].slug,
          is_published: allPosts.items[0].is_published,
          translations_count: allPosts.items[0].translations?.length || 0
        } : 'No posts'
      });
    } else {
      const errorText = await allPostsResponse.text();
      console.log('❌ All posts failed:', errorText);
    }
    
    // 3. Test getting published posts only
    console.log('\n3. Testing published posts only...');
    const publishedUrl = `${API_BASE}/api/blog/?published=true`;
    console.log('URL:', publishedUrl);
    
    const publishedResponse = await fetch(publishedUrl);
    console.log('Status:', publishedResponse.status);
    
    if (publishedResponse.ok) {
      const publishedPosts = await publishedResponse.json();
      console.log('✅ Published posts response:', {
        total: publishedPosts.total,
        items_count: publishedPosts.items?.length || 0
      });
      
      if (publishedPosts.items?.length > 0) {
        console.log('📝 First published post details:');
        const post = publishedPosts.items[0];
        console.log({
          id: post.id,
          slug: post.slug,
          is_published: post.is_published,
          created_at: post.created_at,
          published_at: post.published_at,
          translations: post.translations?.map(t => ({
            language_code: t.language_code,
            title: t.title,
            excerpt: t.excerpt ? t.excerpt.substring(0, 50) + '...' : 'No excerpt'
          }))
        });
      }
    } else {
      const errorText = await publishedResponse.text();
      console.log('❌ Published posts failed:', errorText);
    }
    
    // 4. Test with language filter
    console.log('\n4. Testing with language filter (en)...');
    const langUrl = `${API_BASE}/api/blog/?language=en&published=true`;
    console.log('URL:', langUrl);
    
    const langResponse = await fetch(langUrl);
    console.log('Status:', langResponse.status);
    
    if (langResponse.ok) {
      const langPosts = await langResponse.json();
      console.log('✅ Language filtered posts:', {
        total: langPosts.total,
        items_count: langPosts.items?.length || 0
      });
    } else {
      const errorText = await langResponse.text();
      console.log('❌ Language filtered posts failed:', errorText);
    }
    
    // 5. Test with Polish language filter
    console.log('\n5. Testing with language filter (pl)...');
    const plUrl = `${API_BASE}/api/blog/?language=pl&published=true`;
    console.log('URL:', plUrl);
    
    const plResponse = await fetch(plUrl);
    console.log('Status:', plResponse.status);
    
    if (plResponse.ok) {
      const plPosts = await plResponse.json();
      console.log('✅ Polish posts:', {
        total: plPosts.total,
        items_count: plPosts.items?.length || 0
      });
    } else {
      const errorText = await plResponse.text();
      console.log('❌ Polish posts failed:', errorText);
    }
    
  } catch (error) {
    console.error('💥 Error during API testing:', error.message);
  }
}

// Run the test
testApi();
