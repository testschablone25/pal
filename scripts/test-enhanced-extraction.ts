/**
 * Test script for enhanced PDF extraction
 * Uses the hybrid extraction approach (text + vision fallback)
 */

import fs from "fs";
import { Buffer } from "buffer";

// Import the extraction utilities directly
import { renderPdfToImages } from "../src/lib/riders/pdf-to-image";

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || "http://127.0.0.1:1234/v1";
const DEFAULT_MODEL = "qwen3.5-2b";

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
        model: 'google/gemma-4-e2b',
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
      return null;
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error: any) {
    console.error("[Vision] Extraction failed:", error.message);
    return null;
  }
}

async function main() {
  const pdfPath = "Surf 2 Glory rider.pdf";
  console.log("Testing enhanced extraction on:", pdfPath);

  if (!fs.existsSync(pdfPath)) {
    console.error("File not found");
    return;
  }

  const buffer = fs.readFileSync(pdfPath);
  console.log("PDF size:", buffer.length, "bytes");

  try {
    console.log("\n=== TESTING VISION EXTRACTION ===");
    
    const result = await extractWithVision(buffer);
    
    if (!result) {
      console.error("ERROR: Vision extraction failed");
      return;
    }

    console.log("\n=== EXTRACTION RESULTS ===");

    // Tech rider analysis
    if (result.tech_rider) {
      console.log("\nTECH RIDER:");
      if (result.tech_rider.equipment) {
        console.log(`  Equipment items: ${result.tech_rider.equipment.length}`);
        result.tech_rider.equipment.forEach((item: any, i: number) => {
          console.log(
            `    ${i + 1}. ${item.name} (x${item.quantity}) - ${item.artist_brings ? "Artist brings" : "Venue provides"} ${item.notes ? `- Notes: ${item.notes}` : ""}`,
          );
        });
      }
    }

    // Hospitality rider analysis
    if (result.hospitality_rider) {
      console.log("\nHOSPITALITY RIDER:");
      if (result.hospitality_rider.catering) {
        const cat = result.hospitality_rider.catering;
        console.log(`  Catering:`);
        if (cat.meals?.length) console.log(`    Meals: ${cat.meals.join(", ")}`);
        if (cat.drinks) {
          console.log(`    Drinks: water: ${cat.drinks.water}`);
          if (cat.drinks.spirits?.length)
            console.log(`      Spirits: ${cat.drinks.spirits.join(", ")}`);
        }
      }
    }

    console.log("\n=== SUMMARY ===");
    const hasTechData = result.tech_rider?.equipment?.length > 0;
    const hasHospitalityData = result.hospitality_rider?.catering;

    console.log(`Has tech data: ${hasTechData ? "YES" : "NO"}`);
    console.log(`Has hospitality data: ${hasHospitalityData ? "YES" : "NO"}`);

    if (!hasTechData && !hasHospitalityData) {
      console.log("\nWARNING: No data extracted!");
    } else {
      console.log("\nSUCCESS: Data extracted via vision!");
    }
  } catch (error) {
    console.error("Error during extraction:", error);
  }
}

main().catch(console.error);
