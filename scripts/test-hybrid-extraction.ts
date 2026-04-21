/**
 * Test script for hybrid PDF extraction
 * Tests the new hybrid extraction with vision fallback
 */

import fs from "fs";
import { Buffer } from "buffer";

// Import the extraction utilities
import { renderPdfToImages } from "../src/lib/riders/pdf-to-image";

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || "http://127.0.0.1:1234/v1";
const DEFAULT_MODEL = "google/gemma-4-e2b";

const EXTRACTION_PROMPT = `Extract technical and hospitality rider data from the PDF text.

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

async function testLMStudioConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${LM_STUDIO_URL}/models`, {
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const data = await response.json();
      const models = data.data?.map((m: { id: string }) => m.id) || [];
      console.log("✓ LM Studio connected");
      console.log("  Loaded models:", models.join(", ") || "none");
      return true;
    }
    console.log("✗ LM Studio returned error:", response.status);
    return false;
  } catch (error) {
    console.log("✗ Cannot connect to LM Studio:", error instanceof Error ? error.message : error);
    return false;
  }
}

async function extractWithVision(buffer: Buffer): Promise<any | null> {
  try {
    // Render first page to image
    const pages = await renderPdfToImages(buffer, { scale: 2.0, maxPages: 1 });
    
    if (pages.length === 0) {
      console.error("[Vision] Could not render PDF to image");
      return null;
    }
    
    console.log(`[Vision] Rendering page 1 (${pages[0].width}x${pages[0].height})`);
    
    // Try vision model
    const response = await fetch(`${LM_STUDIO_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract rider data from this PDF image:' },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${pages[0].imageData}` } }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 3000,
      }),
      signal: AbortSignal.timeout(120000),
    });
    
    if (!response.ok) {
      console.error(`[Vision] HTTP ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error("[Vision] No content in response");
      return null;
    }
    
    // Try to parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Vision] No JSON found in response");
      console.log("  Response preview:", content.substring(0, 200));
      return null;
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error: any) {
    console.error("[Vision] Extraction failed:", error.message);
    return null;
  }
}

async function main() {
  console.log("=== Hybrid PDF Extraction Test ===\n");
  
  // Test 1: Check LM Studio connection
  const connected = await testLMStudioConnection();
  if (!connected) {
    console.log("\n✗ LM Studio not available. Please start LM Studio and load a vision model.");
    process.exit(1);
  }
  
  // Test 2: Test with a PDF file
  const pdfPath = "Tech Rider Volvox 2023.pdf";
  console.log(`\n📄 Testing with: ${pdfPath}`);
  
  if (!fs.existsSync(pdfPath)) {
    console.log(`✗ File not found: ${pdfPath}`);
    console.log("  Available PDFs:");
    const files = fs.readdirSync(".").filter(f => f.endsWith(".pdf"));
    files.forEach(f => console.log(`    - ${f}`));
    process.exit(1);
  }
  
  const buffer = fs.readFileSync(pdfPath);
  console.log(`  Size: ${(buffer.length / 1024).toFixed(1)} KB`);
  
  // Test 3: Extract with vision model
  console.log("\n🔍 Extracting with vision model...");
  const startTime = Date.now();
  const result = await extractWithVision(buffer);
  const duration = Date.now() - startTime;
  
  if (!result) {
    console.log(`✗ Vision extraction failed after ${duration}ms`);
    process.exit(1);
  }
  
  console.log(`✓ Vision extraction completed in ${duration}ms`);
  
  // Display results
  console.log("\n=== EXTRACTION RESULTS ===");
  
  if (result.tech_rider) {
    console.log("\nTECH RIDER:");
    if (result.tech_rider.equipment) {
      console.log(`  Equipment items: ${result.tech_rider.equipment.length}`);
      result.tech_rider.equipment.slice(0, 5).forEach((item: any, i: number) => {
        console.log(
          `    ${i + 1}. ${item.name} (x${item.quantity}) - ${item.artist_brings ? "Artist" : "Venue"}`
        );
      });
      if (result.tech_rider.equipment.length > 5) {
        console.log(`    ... and ${result.tech_rider.equipment.length - 5} more`);
      }
    }
  }
  
  if (result.hospitality_rider) {
    console.log("\nHOSPITALITY RIDER:");
    if (result.hospitality_rider.catering) {
      const cat = result.hospitality_rider.catering;
      console.log(`  Catering:`);
      if (cat.meals?.length) console.log(`    Meals: ${cat.meals.join(", ")}`);
      if (cat.drinks) {
        console.log(`    Drinks: water: ${cat.drinks.water}`);
      }
    }
  }
  
  // Summary
  console.log("\n=== SUMMARY ===");
  const hasTechData = result.tech_rider?.equipment?.length > 0;
  const hasHospitalityData = result.hospitality_rider?.catering;
  
  console.log(`Has tech data: ${hasTechData ? "✓ YES" : "✗ NO"}`);
  console.log(`Has hospitality data: ${hasHospitalityData ? "✓ YES" : "✗ NO"}`);
  
  if (!hasTechData && !hasHospitalityData) {
    console.log("\n⚠️  WARNING: No data extracted!");
    process.exit(1);
  } else {
    console.log("\n✓ SUCCESS: Data extracted via vision!");
  }
}

main().catch(console.error);
