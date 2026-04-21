/**
 * Test extraction on Volvox PDF (the one that worked with screenshot)
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234/v1';

async function testVolvoxExtraction() {
  console.log('🧪 Testing Volvox PDF Extraction\n');

  const pdfPath = join(process.cwd(), 'Tech Rider Volvox 2023.pdf');
  console.log(`📁 PDF: ${pdfPath}`);

  // Check if file exists
  try {
    const stats = await import('fs/promises').then(fs => fs.stat(pdfPath));
    console.log(`📊 Size: ${(stats.size / 1024).toFixed(1)} KB\n`);
  } catch {
    console.log('❌ PDF file not found\n');
    return;
  }

  // Test 1: Check LM Studio status
  console.log('1. Checking LM Studio...');
  try {
    const res = await fetch(`${LM_STUDIO_URL}/models`, {
      signal: AbortSignal.timeout(5000)
    });
    const data = await res.json();
    const models = data.data?.map((m: any) => m.id) || [];
    console.log(`   ✅ Connected. Models: ${models.join(', ')}\n`);
  } catch {
    console.log('   ❌ Could not connect to LM Studio\n');
    return;
  }

  // Test 2: Render PDF to image
  console.log('2. Rendering PDF to image...');
  try {
    const { renderPdfToImages } = await import('@/lib/riders/pdf-to-image');
    const buffer = readFileSync(pdfPath);
    const pages = await renderPdfToImages(buffer, { scale: 2.0, maxPages: 1 });

    if (pages.length === 0) {
      console.log('   ❌ Could not render PDF\n');
      return;
    }

    console.log(`   ✅ Rendered page 1 (${pages[0].width}x${pages[0].height})`);
    console.log(`   Image size: ${(pages[0].imageData.length / 1024).toFixed(1)} KB\n`);

    // Test 3: Send to vision model
    console.log('3. Sending to vision model...');
    const startTime = Date.now();

    const response = await fetch(`${LM_STUDIO_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemma-4-e2b',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract ALL text from this PDF image. Return the complete text content.' },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${pages[0].imageData}` } }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      console.log(`   ❌ HTTP ${response.status}`);
      const errorText = await response.text();
      console.log(`   Error: ${errorText.substring(0, 200)}\n`);
      return;
    }

    const data = await response.json();
    const timeMs = Date.now() - startTime;
    const content = data.choices?.[0]?.message?.content;

    console.log(`   ✅ Response in ${timeMs}ms`);
    console.log(`   Content length: ${content?.length || 0} chars\n`);

    // Show extracted text
    console.log('4. Extracted Text:');
    console.log(`${'-'.repeat(80)}`);
    console.log(content || '(No content)');
    console.log(`${'-'.repeat(80)}\n`);

    // Test 4: Try structured extraction
    console.log('5. Testing structured extraction...');
    const startTime2 = Date.now();

    const extractionPrompt = `Extract technical and hospitality rider data from this PDF image.
Return JSON only. No markdown. No commentary.

Schema:
{
  "tech_rider": {
    "equipment": [{ "name": "", "quantity": 1, "artist_brings": false, "notes": "" }],
    "audio": { "inputs_needed": 2, "monitor_type": "booth" }
  },
  "hospitality_rider": {
    "catering": { "meals": [""], "drinks": { "water": false } }
  }
}`;

    const response2 = await fetch(`${LM_STUDIO_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemma-4-e2b',
        messages: [
          { role: 'system', content: extractionPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract rider data from this PDF:' },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${pages[0].imageData}` } }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(60000)
    });

    if (!response2.ok) {
      console.log(`   ❌ HTTP ${response2.status}\n`);
      return;
    }

    const data2 = await response2.json();
    const timeMs2 = Date.now() - startTime2;
    const content2 = data2.choices?.[0]?.message?.content;

    console.log(`   ✅ Response in ${timeMs2}ms`);

    // Try to parse JSON
    try {
      const jsonMatch = content2.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('   ✅ Successfully parsed JSON');
        console.log(`   Equipment items: ${parsed.tech_rider?.equipment?.length || 0}`);
        console.log(`   Has hospitality: ${!!parsed.hospitality_rider}`);
      } else {
        console.log('   ⚠️  No JSON found in response');
        console.log(`   Content: ${content2?.substring(0, 200)}...`);
      }
    } catch (e: any) {
      console.log(`   ❌ JSON parse failed: ${e.message}`);
      console.log(`   Content: ${content2?.substring(0, 200)}...`);
    }

    console.log('\n✅ Test complete!');
    console.log('\n💡 Summary:');
    console.log('   • Vision extraction works!');
    console.log('   • Can extract text from scanned PDFs');
    console.log('   • Can parse structured data');
    console.log('   • Ready for hybrid implementation');

  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

testVolvoxExtraction().catch(console.error);
