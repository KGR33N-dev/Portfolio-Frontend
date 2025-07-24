#!/usr/bin/env node

/**
 * Test script for API connectivity
 * Usage: node test-api.js [API_URL]
 */

const API_URL = process.argv[2] || 'http://localhost:8000';

async function testAPI() {
  console.log('🔍 Testing API connection...');
  console.log('📡 API URL:', `${API_URL}/api/blog/`);
  console.log('─'.repeat(50));

  try {
    const startTime = Date.now();
    const response = await fetch(`${API_URL}/api/blog/`);
    const endTime = Date.now();
    
    console.log('✅ Response received');
    console.log('📊 Status:', response.status, response.statusText);
    console.log('⏱️  Response time:', `${endTime - startTime}ms`);
    console.log('📋 Headers:');
    
    response.headers.forEach((value, key) => {
      console.log(`   ${key}: ${value}`);
    });
    
    console.log('─'.repeat(50));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response successful');
      console.log('📄 Data type:', typeof data);
      console.log('📊 Structure:', data.items ? 'Paginated' : 'Direct array');
      
      if (data.items) {
        console.log('📊 Total posts:', data.total);
        console.log('📊 Current page:', data.page);
        console.log('📊 Total pages:', data.pages);
        console.log('📊 Per page:', data.per_page);
        console.log('📊 Posts in response:', data.items.length);
        
        if (data.items.length > 0) {
          console.log('📋 Sample post structure:');
          const samplePost = data.items[0];
          Object.keys(samplePost).forEach(key => {
            const value = samplePost[key];
            const displayValue = typeof value === 'string' && value.length > 50 
              ? value.substring(0, 50) + '...'
              : JSON.stringify(value);
            console.log(`   ${key}: ${typeof value} (${displayValue})`);
          });
        }
      } else {
        console.log('📊 Posts count:', Array.isArray(data) ? data.length : 'N/A');
        
        if (Array.isArray(data) && data.length > 0) {
          console.log('📋 Sample post structure:');
          const samplePost = data[0];
          Object.keys(samplePost).forEach(key => {
            console.log(`   ${key}: ${typeof samplePost[key]} (${JSON.stringify(samplePost[key]).substring(0, 50)}...)`);
          });
        }
      }
      
      console.log('─'.repeat(50));
      console.log('✅ Test completed successfully!');
    } else {
      console.log('❌ API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('📋 Error details:', errorText);
    }
    
  } catch (error) {
    console.log('❌ Connection failed');
    console.log('🚨 Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Suggestion: Make sure the API server is running on', API_URL);
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.log('💡 Suggestion: Check if the URL is correct and the server is accessible');
    }
  }
}

// Run the test
testAPI().catch(console.error);
