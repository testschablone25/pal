/**
 * Quick diagnostic test for Gemma 4 2B
 */

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234/v1';

async function quickTest() {
  console.log('🔍 Testing Gemma 4 2B...\n');

  // Test 1: Check if model is loaded
  console.log('1. Checking model availability...');
  try {
    const modelsRes = await fetch(`${LM_STUDIO_URL}/models`, {
      signal: AbortSignal.timeout(5000)
    });
    const modelsData = await modelsRes.json();
    const gemmaModel = modelsData.data?.find((m: any) => m.id?.includes('gemma') && m.id?.includes('4'));
    
    if (gemmaModel) {
      console.log(`   ✅ Found: ${gemmaModel.id}`);
    } else {
      console.log('   ❌ Gemma 4 model not found');
      console.log('   Available:', modelsData.data?.map((m: any) => m.id).join(', '));
    }
  } catch (e) {
    console.log('   ❌ Could not connect to LM Studio');
  }

  // Test 2: Simple text request
  console.log('\n2. Testing text processing...');
  try {
    const startTime = Date.now();
    const response = await fetch(`${LM_STUDIO_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemma-4-e2b',
        messages: [
          { role: 'user', content: 'Extract equipment from: "1x Pioneer CDJ3000, 2x Monitor speakers"' }
        ],
        max_tokens: 200,
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      console.log(`   ❌ HTTP ${response.status}`);
    } else {
      const data = await response.json();
      const timeMs = Date.now() - startTime;
      console.log(`   ✅ Response in ${timeMs}ms`);
      console.log(`   Content: ${data.choices?.[0]?.message?.content?.substring(0, 100)}...`);
    }
  } catch (e: any) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  // Test 3: Vision support check
  console.log('\n3. Testing vision support...');
  try {
    const response = await fetch(`${LM_STUDIO_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemma-4-e2b',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What is this?' },
              {
                type: 'image_url',
                image_url: {
                  url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
                }
              }
            ]
          }
        ],
        max_tokens: 50
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (response.status === 400) {
      console.log('   ❌ Vision not supported (400 error)');
    } else if (response.ok) {
      console.log('   ✅ Vision appears to be supported');
    } else {
      console.log(`   ⚠️  Unexpected status: ${response.status}`);
    }
  } catch (e: any) {
    console.log(`   ❌ Vision test error: ${e.message}`);
  }

  console.log('\n✅ Quick test complete');
}

quickTest().catch(console.error);
