/**
 * Manual test script for LM Studio rider extraction
 * 
 * Prerequisites:
 * 1. LM Studio running on http://localhost:1234
 * 2. Model "qwen3.5-2b" loaded
 * 3. A PDF rider file to test
 * 
 * Usage:
 *   npx tsx scripts/test-rider-extraction.ts <path-to-pdf>
 */

import fs from 'fs';
import path from 'path';

const LM_STUDIO_URL = 'http://127.0.0.1:1234/v1';
const MODEL_NAME = 'qwen3.5-2b';

const TEST_PROMPT = `Extract rider data. Return ONLY valid JSON.

{"tech_rider":{"equipment":[{"name":"Pioneer CDJ-3000","quantity":2,"artist_brings":false}],"audio":{"inputs_needed":2,"monitor_type":"booth"},"transport":{"flights_needed":true},"hospitality_rider":{"accommodation":{"required":true,"nights":1},"catering":{"meals":["dinner"],"dietary":[],"drinks":{"alcopops":false,"spirits":["vodka"],"mixers":["redbull"],"water":true}}}}

Extract from this text:
"The artist requires 2x Pioneer CDJ-3000 and a DJM-900NXS2 mixer. Flights from Berlin required. Accommodation needed for 1 night. Dinner and vodkas requested."

Return JSON only:`;

async function testLMStudioConnection() {
  console.log('\n=== Testing LM Studio Connection ===\n');
  
  try {
    const response = await fetch(`${LM_STUDIO_URL}/models`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const data = await response.json();
      const models = data.data?.map((m: { id: string }) => m.id) || [];
      console.log('✓ LM Studio connected');
      console.log('  Loaded models:', models.join(', ') || 'none');
      return true;
    } else {
      console.log('✗ LM Studio returned error:', response.status);
      return false;
    }
  } catch (error) {
    console.log('✗ Cannot connect to LM Studio:', error instanceof Error ? error.message : error);
    return false;
  }
}

async function testSimpleExtraction() {
  console.log('\n=== Testing Simple Text Extraction ===\n');
  
  try {
    const response = await fetch(`${LM_STUDIO_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: 'You are a JSON extraction assistant. Reply only with valid JSON.' },
          { role: 'user', content: TEST_PROMPT },
        ],
        temperature: 0.1,
        max_tokens: 1024,
      }),
      signal: AbortSignal.timeout(60000),
    });
    
    if (!response.ok) {
      console.log('✗ HTTP error:', response.status, await response.text());
      return false;
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (content) {
      console.log('✓ Extraction successful');
      console.log('  Response:', content.substring(0, 200));
      
      try {
        const parsed = JSON.parse(content.replace(/```json\n?/g, '').replace(/```/g, '').trim());
        console.log('  ✓ Valid JSON parsed');
        console.log('  Parsed:', JSON.stringify(parsed).substring(0, 200));
        return true;
      } catch (parseError) {
        console.log('  ✗ JSON parse error:', parseError);
        return false;
      }
    } else {
      console.log('✗ No content in response');
      return false;
    }
  } catch (error) {
    console.log('✗ Extraction failed:', error instanceof Error ? error.message : error);
    return false;
  }
}

async function main() {
  console.log('LM Studio Manual Test');
  console.log('======================');
  console.log('URL:', LM_STUDIO_URL);
  console.log('Model:', MODEL_NAME);
  
  // Test 1: Connection
  const connected = await testLMStudioConnection();
  
  if (!connected) {
    console.log('\n✗ LM Studio not available. Please:');
    console.log('  1. Start LM Studio');
    console.log('  2. Load model qwen3.5-2b');
    console.log('  3. Start server (click play button)');
    process.exit(1);
  }
  
  // Test 2: Simple extraction
  const extracted = await testSimpleExtraction();
  
  if (!extracted) {
    console.log('\n✗ Simple extraction failed');
    process.exit(1);
  }
  
  console.log('\n=== All Tests Passed ===\n');
  console.log('LM Studio is ready for rider extraction!');
}

main();
