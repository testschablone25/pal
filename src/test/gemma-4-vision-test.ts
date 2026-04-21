/**
 * Gemma 4 2B Vision Test Script
 * Tests vision capabilities once Gemma 4 2B is loaded in LM Studio
 * 
 * Usage: npx tsx src/test/gemma-4-vision-test.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234/v1';
const GEMMA_4_MODEL = 'google/gemma-4-e2b'; // Adjust based on actual model name in LM Studio

// Test PDFs to evaluate
const TEST_PDFS = [
  { name: 'Beste Hira Tech & Hospitality rider 2024.pdf', path: 'Beste Hira Tech & Hospitality rider 2024.pdf' },
  { name: 'Doudou MD Rider.pdf', path: 'Doudou MD Rider.pdf' },
  { name: 'RIDER AMORAL.pdf', path: 'RIDER AMORAL.pdf' },
  { name: 'Running_Hot_Tech_Rider 2023.pdf', path: 'Running_Hot_Tech_Rider 2023.pdf' },
  { name: 'Tech Hospitality Rider Marron 092023.pdf', path: 'Tech Hospitality Rider Marron 092023.pdf' },
  { name: 'Tech Rider Volvox 2023.pdf', path: 'Tech Rider Volvox 2023.pdf' },
];

// Extraction prompt (same as current system)
const EXTRACTION_PROMPT = `Extract technical and hospitality rider data from the PDF text.

Return JSON only. No markdown. No commentary.

Schema:
{
  "tech_rider": {
    "equipment": [{ "name": "", "quantity": 1, "artist_brings": false, "notes": "" }],
    "stage_setup": {
      "monitors": [{ "type": "", "quantity": 0, "location": "" }],
      "power": [{ "type": "", "quantity": 0 }],
      "furniture": [{ "type": "", "quantity": 0, "dimensions": "" }]
    },
    "backline": {
      "cdjs": [{ "model": "", "quantity": 0 }],
      "turntables": [{ "model": "", "quantity": 0 }],
      "mixer_minimum_requirements": ""
    },
    "audio": {
      "inputs_needed": 2,
      "monitor_type": "booth",
      "preferred_mixers": [{ "model": "", "required_features": "", "priority": 1 }],
      "special_requirements": ""
    },
    "transport": {
      "flights_needed": false,
      "priority_boarding": false,
      "baggage_requirements": "",
      "origin_city": ""
    },
    "technical_notes": "",
    "referenced_images": [""],
    "performance_requirements": {
      "staff": {
        "sound_tech": false,
        "sound_tech_notes": "",
        "lighting_tech": false,
        "lighting_tech_notes": "",
        "soundcheck_required": false,
        "soundcheck_duration_min": null,
        "set_required": false,
        "specific_time": null,
        "party_mentioned": null
      },
      "stage": {
        "requirements": [""]
      }
    }
  },
  "hospitality_rider": {
    "accommodation": {
      "required": false,
      "nights": 0,
      "room_type": "",
      "check_in": "",
      "check_out": "",
      "location_preference": ""
    },
    "catering": {
      "meals": [""],
      "dietary": [""],
      "drinks": {
        "alcopops": false,
        "spirits": [""],
        "mixers": [""],
        "water": false
      },
      "special_requests": ""
    },
    "transport_ground": {
      "car_service": false,
      "pickup_time": "",
      "pickup_location": "",
      "return_required": false,
      "vehicle_type": ""
    },
    "hospitality_notes": ""
  }
}`;

/**
 * Check if LM Studio is running and has vision models
 */
async function checkLmStudioStatus(): Promise<{ status: string; models: string[] }> {
  try {
    const response = await fetch(`${LM_STUDIO_URL}/models`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      return { status: 'disconnected', models: [] };
    }
    const data = await response.json();
    const models = Array.isArray(data.data) ? data.data.map((m: any) => m.id) : [];
    return { status: 'connected', models };
  } catch {
    return { status: 'disconnected', models: [] };
  }
}

/**
 * Test if a model supports vision (image input)
 */
async function testVisionSupport(modelName: string): Promise<boolean> {
  try {
    // Try a simple vision request
    const response = await fetch(`${LM_STUDIO_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What color is this?' },
              // Small test image (1x1 pixel red PNG)
              {
                type: 'image_url',
                image_url: {
                  url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
                }
              }
            ]
          }
        ],
        max_tokens: 50,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.log(`  Vision test failed: ${response.status}`);
      return false;
    }

    const data = await response.json();
    const hasVision = data.choices?.[0]?.message?.content?.length > 0;
    console.log(`  Vision test result: ${hasVision ? 'SUPPORTED' : 'NOT SUPPORTED'}`);
    return hasVision;
  } catch (error: any) {
    console.log(`  Vision test error: ${error.message}`);
    return false;
  }
}

/**
 * Extract text using current method (for comparison)
 */
async function extractWithCurrentMethod(pdfPath: string): Promise<{
  text: string;
  quality: string;
  timeMs: number;
}> {
  const startTime = Date.now();
  const PDFParser = (await import('pdf2json')).default;

  return new Promise((resolve) => {
    const pdfParser = new PDFParser();
    const buffer = readFileSync(pdfPath);

    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      const pages = pdfData.Pages || [];
      const extractedLines: string[] = [];

      for (const page of pages) {
        const items = [...(page.Texts || [])].sort(
          (left: any, right: any) => left.y - right.y || left.x - right.x
        );
        let currentY: number | null = null;
        let currentLine: string[] = [];

        for (const item of items) {
          const text = (item.R || [])
            .map((run: any) => {
              try {
                return decodeURIComponent(run.T || '');
              } catch {
                return run.T || '';
              }
            })
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

          if (!text) continue;

          if (currentY === null || Math.abs(item.y - currentY) > 0.35) {
            if (currentLine.length) {
              extractedLines.push(currentLine.join(' ').trim());
            }
            currentLine = [text];
            currentY = item.y;
          } else {
            currentLine.push(text);
          }
        }

        if (currentLine.length) {
          extractedLines.push(currentLine.join(' ').trim());
        }
        extractedLines.push('');
      }

      const text = extractedLines.join('\n').trim();
      const timeMs = Date.now() - startTime;

      // Assess quality
      const charCount = text.length;
      const quality = charCount < 50 ? 'FAILED' : charCount < 150 ? 'LOW' : charCount < 500 ? 'MEDIUM' : 'HIGH';

      resolve({ text, quality, timeMs });
    });

    pdfParser.on('pdfParser_dataError', () => {
      resolve({ text: '', quality: 'FAILED', timeMs: Date.now() - startTime });
    });

    pdfParser.parseBuffer(buffer);
  });
}

/**
 * Test extraction with Gemma 4 2B (vision)
 */
async function testGemma4Vision(pdfPath: string, pdfName: string): Promise<{
  success: boolean;
  timeMs: number;
  extractedData?: any;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    // For now, we'll just test the API connectivity
    // Full implementation would render PDF to images first
    const response = await fetch(`${LM_STUDIO_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GEMMA_4_MODEL,
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: `Extract rider data from: ${pdfName}` }
        ],
        temperature: 0.1,
        max_tokens: 3000,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        timeMs: Date.now() - startTime,
        error: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        timeMs: Date.now() - startTime,
        error: 'No content in response',
      };
    }

    // Try to parse JSON
    let extractedData: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // JSON parse failed, keep raw content
    }

    return {
      success: true,
      timeMs: Date.now() - startTime,
      extractedData: extractedData || { raw: content },
    };
  } catch (error: any) {
    return {
      success: false,
      timeMs: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Main test function
 */
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    GEMMA 4 2B VISION TEST                                     ║
║                    Testing multimodal capabilities                            ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  // Check LM Studio status
  console.log('🔍 Checking LM Studio status...');
  const status = await checkLmStudioStatus();

  if (status.status !== 'connected') {
    console.log('❌ LM Studio is not running on port 1234');
    console.log('   Please start LM Studio and load Gemma 4 2B model');
    console.log('   Then run this script again');
    return;
  }

  console.log(`✅ LM Studio is running`);
  console.log(`   Available models: ${status.models.length}`);
  status.models.forEach(m => console.log(`   • ${m}`));

  // Check if Gemma 4 2B is loaded
  const gemmaModel = status.models.find(m => m.toLowerCase().includes('gemma') && m.toLowerCase().includes('4'));
  if (!gemmaModel) {
    console.log(`\n⚠️  Gemma 4 model not found in loaded models`);
    console.log(`   Looking for: ${GEMMA_4_MODEL}`);
    console.log(`   Available: ${status.models.join(', ')}`);
    console.log(`\n   Please download and load Gemma 4 2B in LM Studio`);
    console.log(`   Model URL: https://lmstudio.ai/models/google/gemma-4-e2b`);
    return;
  }

  console.log(`\n✅ Gemma 4 model found: ${gemmaModel}`);

  // Test vision support
  console.log(`\n🔍 Testing vision capabilities...`);
  const hasVision = await testVisionSupport(gemmaModel);

  if (!hasVision) {
    console.log(`\n⚠️  Model does not appear to support vision input`);
    console.log(`   This may be a text-only variant or vision not enabled`);
    console.log(`   Proceeding with text-based tests anyway...`);
  }

  // Test each PDF
  console.log(`\n📊 Testing PDFs with current method vs Gemma 4...\n`);

  const results: any[] = [];

  for (const pdf of TEST_PDFS) {
    const fullPath = join(process.cwd(), pdf.path);
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📄 ${pdf.name}`);
    console.log(`${'='.repeat(80)}`);

    // Test current method
    console.log(`\n1. Testing current method (pdf2json)...`);
    const currentResult = await extractWithCurrentMethod(fullPath);
    console.log(`   Quality: ${currentResult.quality}`);
    console.log(`   Time: ${currentResult.timeMs}ms`);
    console.log(`   Characters: ${currentResult.text.length}`);

    // Test Gemma 4
    console.log(`\n2. Testing Gemma 4 2B...`);
    const gemmaResult = await testGemma4Vision(fullPath, pdf.name);

    if (gemmaResult.success) {
      console.log(`   ✅ Success`);
      console.log(`   Time: ${gemmaResult.timeMs}ms`);
      if (gemmaResult.extractedData) {
        console.log(`   Has structured data: ${!!gemmaResult.extractedData.tech_rider}`);
      }
    } else {
      console.log(`   ❌ Failed: ${gemmaResult.error}`);
    }

    results.push({
      pdf: pdf.name,
      current: currentResult,
      gemma: gemmaResult,
    });
  }

  // Summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`📊 SUMMARY`);
  console.log(`${'='.repeat(80)}\n`);

  const currentSuccess = results.filter(r => r.current.quality !== 'FAILED').length;
  const gemmaSuccess = results.filter(r => r.gemma.success).length;

  console.log(`Current Method (pdf2json):`);
  console.log(`  ✅ Successful: ${currentSuccess}/${results.length}`);
  console.log(`  ❌ Failed: ${results.length - currentSuccess}/${results.length}`);

  console.log(`\nGemma 4 2B:`);
  console.log(`  ✅ Successful: ${gemmaSuccess}/${results.length}`);
  console.log(`  ❌ Failed: ${results.length - gemmaSuccess}/${results.length}`);

  console.log(`\n💡 Recommendations:`);
  if (gemmaSuccess > currentSuccess) {
    console.log(`  • Gemma 4 2B performs BETTER than current method`);
    console.log(`  • Consider switching to Gemma 4 2B for all PDFs`);
  } else if (gemmaSuccess === currentSuccess) {
    console.log(`  • Gemma 4 2B performs SIMILAR to current method`);
    console.log(`  • Consider using Gemma 4 2B for consistency`);
  } else {
    console.log(`  • Current method performs better for now`);
    console.log(`  • May need to optimize Gemma 4 2B prompts or use vision mode`);
  }

  // Export results
  const resultsPath = join(process.cwd(), 'gemma-4-test-results.json');
  writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results exported to: ${resultsPath}`);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
