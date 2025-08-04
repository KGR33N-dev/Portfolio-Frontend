#!/usr/bin/env node

// Script to create a test post with both Polish and English translations
const API_BASE = 'http://localhost:8000';

async function createTestPost() {
  console.log('🔍 Creating test post with both translations...\n');
  
  try {
    // First, we need to get auth token
    console.log('1. Logging in to get auth token...');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'username=admin@example.com&password=admin123'
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResponse.status);
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.access_token;
    console.log('✅ Login successful');
    
    // Create test post with both translations
    console.log('\n2. Creating multilingual test post...');
    const postData = {
      slug: 'test-multilingual-post',
      author: 'Test Author',
      category: 'tutorial',
      featured_image: 'https://via.placeholder.com/800x400',
      tags: ['test', 'multilingual', 'astro'],
      translations: [
        {
          language_code: 'en',
          title: 'Test Multilingual Post',
          content: `# Test Multilingual Post

This is a test post created to verify the multilingual blog functionality.

## Features
- Multilingual support
- Astro framework
- FastAPI backend

## Content
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
          excerpt: 'A test post to verify multilingual functionality',
          meta_title: 'Test Multilingual Post - Blog',
          meta_description: 'Testing multilingual blog post functionality with Astro and FastAPI'
        },
        {
          language_code: 'pl',
          title: 'Testowy Post Wielojęzyczny',
          content: `# Testowy Post Wielojęzyczny

To jest testowy post utworzony w celu weryfikacji funkcjonalności wielojęzycznego bloga.

## Funkcje
- Obsługa wielu języków
- Framework Astro
- Backend FastAPI

## Treść
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
          excerpt: 'Testowy post do weryfikacji funkcjonalności wielojęzycznej',
          meta_title: 'Testowy Post Wielojęzyczny - Blog',
          meta_description: 'Testowanie funkcjonalności wielojęzycznego bloga z Astro i FastAPI'
        }
      ]
    };
    
    console.log('Sending post data:', JSON.stringify(postData, null, 2));
    
    const createResponse = await fetch(`${API_BASE}/api/blog/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(postData)
    });
    
    console.log('Create response status:', createResponse.status);
    
    if (createResponse.ok) {
      const result = await createResponse.json();
      console.log('✅ Post created successfully:', {
        id: result.id,
        slug: result.slug,
        translations: result.translations?.length || 0
      });
      
      // Publish the post
      console.log('\n3. Publishing the post...');
      const publishResponse = await fetch(`${API_BASE}/api/blog/${result.id}/publish`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (publishResponse.ok) {
        console.log('✅ Post published successfully');
        
        // Verify the post exists
        console.log('\n4. Verifying published posts...');
        const verifyResponse = await fetch(`${API_BASE}/api/blog/?published=true`);
        
        if (verifyResponse.ok) {
          const posts = await verifyResponse.json();
          console.log('📝 Published posts:', posts.total);
          posts.items.forEach(post => {
            console.log(`- ${post.id}: ${post.slug} (${post.translations?.length || 0} translations)`);
            post.translations?.forEach(t => {
              console.log(`  ${t.language_code}: ${t.title}`);
            });
          });
        }
      } else {
        const publishError = await publishResponse.text();
        console.log('❌ Failed to publish:', publishError);
      }
      
    } else {
      const errorText = await createResponse.text();
      console.log('❌ Failed to create post:', errorText);
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

// Run the test
createTestPost();
