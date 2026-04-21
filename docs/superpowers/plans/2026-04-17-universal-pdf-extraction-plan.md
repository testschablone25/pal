# Universal PDF Extraction System - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement cascade PDF extraction (pdfjs-dist → pdf2json → pdf-parse → Tesseract OCR) with quality assessment and enhanced regex fallback parser for rider extraction.

**Architecture:** A cascade extraction pipeline tries multiple PDF libraries in sequence until adequate text quality is achieved. Quality is assessed between attempts. An enhanced regex parser extracts structured data when LM Studio is unavailable.

**Tech Stack:** pdfjs-dist (Mozilla PDF.js), pdf2json, pdf-parse, tesseract.js, Node.js

---

## File Structure

### New Files

- `src/lib/riders/extraction-utils.ts` - Extraction utilities, cascade orchestration, quality assessment, enhanced regex parser

### Modified Files

- `src/app/api/artists/extract-rider/route.ts` - Replace `extractPdfText()` with cascade call, update imports
- `package.json` - Add pdfjs-dist, tesseract.js dependencies

---

## Implementation Tasks

### Task 1: Install Dependencies

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Add pdfjs-dist and tesseract.js to dependencies**

Run:

```bash
npm install pdfjs-dist@^5.6.205 tesseract.js@^7.0.0
```

Verify `package.json` now contains:

```json
"pdfjs-dist": "^5.6.205",
"tesseract.js": "^7.0.0"
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: Add pdfjs-dist and tesseract.js for PDF extraction"
```

---

### Task 2: Create Extraction Utilities Module

**Files:**

- Create: `src/lib/riders/extraction-utils.ts`

- [ ] **Step 1: Create the extraction-utils.ts file with quality assessment and cascade structures**

```typescript
// src/lib/riders/extraction-utils.ts

export interface QualityMetrics {
  characterCount: number;
  controlCharRatio: number;
  wordDensity: number;
  isImageBased: boolean;
}

export interface ExtractionAttempt {
  method: string;
  success: boolean;
  text: string;
  metrics: QualityMetrics;
  error?: string;
}

export interface CascadeResult {
  text: string;
  methodsAttempted: string[];
  quality: "high" | "medium" | "low" | "failed";
  metrics: QualityMetrics;
}

// Quality thresholds
const QUALITY_THRESHOLDS = {
  MIN_CHAR_COUNT: 50,
  MAX_CONTROL_CHAR_RATIO: 0.05, // 5%
  MIN_WORD_DENSITY: 0.3, // 30%
  HIGH_QUALITY_CHAR_COUNT: 500,
  MEDIUM_QUALITY_CHAR_COUNT: 150,
};

/**
 * Assess the quality of extracted text
 */
export function assessTextQuality(text: string): QualityMetrics {
  const controlChars = (text.match(/[\x00-\x1F\x7F]/g) || []).length;
  const controlCharRatio = text.length > 0 ? controlChars / text.length : 1;

  // Count recognizable words (alphanumeric sequences > 2 chars)
  const words = text.match(/[a-zA-Z0-9]{3,}/g) || [];
  const wordDensity = text.length > 0 ? words.length / (text.length / 5) : 0;

  // Simple image-based detection: very short, high control char ratio, low word density
  const isImageBased = text.length < 50 && controlCharRatio > 0.01;

  return {
    characterCount: text.length,
    controlCharRatio,
    wordDensity,
    isImageBased,
  };
}

/**
 * Determine quality rating from metrics
 */
export function getQualityRating(
  metrics: QualityMetrics,
  methodsAttempted: string[],
): "high" | "medium" | "low" | "failed" {
  const { characterCount, controlCharRatio, wordDensity } = metrics;

  // If we tried OCR and still got poor results, mark as failed
  if (methodsAttempted.includes("tesseract") && characterCount < 50) {
    return "failed";
  }

  if (characterCount < 50 || controlCharRatio > 0.1) {
    return "low";
  }

  if (characterCount < 150 || wordDensity < 0.2) {
    return "medium";
  }

  if (characterCount >= 500 && wordDensity >= 0.3) {
    return "high";
  }

  return "medium";
}

/**
 * Check if quality is sufficient to stop cascade
 */
export function isQualitySufficient(
  metrics: QualityMetrics,
  methodsAttempted: string[],
): boolean {
  const rating = getQualityRating(metrics, methodsAttempted);
  return rating === "high" || rating === "medium";
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/riders/extraction-utils.ts
git commit -m "feat: Add extraction utilities with quality assessment"
```

---

### Task 3: Implement pdfjs-dist Extraction

**Files:**

- Modify: `src/lib/riders/extraction-utils.ts`

- [ ] **Step 1: Add pdfjs extraction function**

Add to `src/lib/riders/extraction-utils.ts`:

```typescript
import * as pdfjsLib from "pdfjs-dist";

// Configure worker - disable actual network worker
pdfjsLib.GlobalWorkerOptions.workerSrc = false;

/**
 * Extract text from PDF using pdfjs-dist (Mozilla PDF.js)
 */
export async function extractWithPdfJs(
  buffer: Buffer,
): Promise<ExtractionAttempt> {
  try {
    const typedArray = new Uint8Array(buffer);

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: typedArray,
      standardFontDataUrl: undefined, // Don't try to load fallback fonts
    });

    const pdfDocument = await loadingTask.promise;
    const textParts: string[] = [];

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Group text items by Y position (line) then X position
      const items = textContent.items as Array<{
        str: string;
        transform: number[];
        width: number;
      }>;

      // Sort by Y position (transform[5]) then X position (transform[4])
      const sortedItems = [...items].sort((a, b) => {
        const yA = a.transform[5];
        const yB = b.transform[5];
        const xA = a.transform[4];
        const xB = b.transform[4];

        if (Math.abs(yA - yB) > 5) {
          return yB - yA; // PDF Y is inverted
        }
        return xA - xB;
      });

      // Group into lines (Y within threshold)
      let currentY: number | null = null;
      let currentLine: string[] = [];

      for (const item of sortedItems) {
        const itemY = item.transform[5];

        if (currentY === null || Math.abs(itemY - currentY) > 5) {
          if (currentLine.length > 0) {
            textParts.push(currentLine.join(" ").trim());
          }
          currentLine = [item.str];
          currentY = itemY;
        } else {
          currentLine.push(item.str);
        }
      }

      if (currentLine.length > 0) {
        textParts.push(currentLine.join(" ").trim());
      }

      textParts.push(""); // Page break
    }

    const text = textParts.join("\n").trim();

    return {
      method: "pdfjs-dist",
      success: true,
      text,
      metrics: assessTextQuality(text),
    };
  } catch (error) {
    return {
      method: "pdfjs-dist",
      success: false,
      text: "",
      metrics: assessTextQuality(""),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/riders/extraction-utils.ts
git commit -m "feat: Add pdfjs-dist extraction function"
```

---

### Task 4: Implement pdf-parse Extraction

**Files:**

- Modify: `src/lib/riders/extraction-utils.ts`

- [ ] **Step 1: Add pdf-parse extraction function**

Add to `src/lib/riders/extraction-utils.ts`:

```typescript
import pdfParse from "pdf-parse";

/**
 * Extract text from PDF using pdf-parse
 * Good for Type3 fonts and embedded fonts
 */
export async function extractWithPdfParse(
  buffer: Buffer,
): Promise<ExtractionAttempt> {
  try {
    const data = await pdfParse(buffer, {
      // Custom page render (optional)
      pagerender: (pageData: { getTextContent: () => Promise<unknown> }) =>
        pageData.getTextContent(),
      // Max time to wait for PDF loading (ms)
      max: 30000,
    });

    // Clean the extracted text
    let text = data.text || "";

    // Remove excessive whitespace while preserving structure
    text = text
      .split(/\n{3,}/) // 3+ newlines = page break
      .map((block) => block.replace(/\s+/g, " ").trim())
      .join("\n\n")
      .trim();

    return {
      method: "pdf-parse",
      success: true,
      text,
      metrics: assessTextQuality(text),
    };
  } catch (error) {
    return {
      method: "pdf-parse",
      success: false,
      text: "",
      metrics: assessTextQuality(""),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/riders/extraction-utils.ts
git commit -m "feat: Add pdf-parse extraction function"
```

---

### Task 5: Implement Tesseract.js OCR Extraction

**Files:**

- Modify: `src/lib/riders/extraction-utils.ts`

- [ ] **Step 1: Add Tesseract OCR extraction function**

Add to `src/lib/riders/extraction-utils.ts`:

```typescript
import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";

/**
 * Extract text from image-based PDF using Tesseract.js OCR
 */
export async function extractWithTesseract(
  buffer: Buffer,
): Promise<ExtractionAttempt> {
  try {
    const typedArray = new Uint8Array(buffer);

    // Load PDF and render pages as images
    const loadingTask = pdfjsLib.getDocument({
      data: typedArray,
    });

    const pdfDocument = await loadingTask.promise;
    const textParts: string[] = [];

    // Process each page
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);

      // Render page to image
      const viewport = page.getViewport({ scale: 2.0 }); // Higher scale = better OCR
      const canvas = new OffscreenCanvas(
        Math.floor(viewport.width),
        Math.floor(viewport.height),
      );
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      await page.render({
        canvasContext: ctx as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise;

      // Convert to image blob
      const imageBlob = await canvas.convertToBlob({ type: "image/png" });
      const imageBuffer = await imageBlob.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString("base64");

      // Run OCR on image
      const {
        data: { text },
      } = await Tesseract.recognize(
        `data:image/png;base64,${imageBase64}`,
        "eng",
        {
          logger: () => {}, // Suppress progress logs
        },
      );

      if (text.trim()) {
        textParts.push(text.trim());
      }

      textParts.push(""); // Page separator
    }

    const text = textParts.join("\n\n").trim();

    return {
      method: "tesseract",
      success: true,
      text,
      metrics: assessTextQuality(text),
    };
  } catch (error) {
    return {
      method: "tesseract",
      success: false,
      text: "",
      metrics: assessTextQuality(""),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/riders/extraction-utils.ts
git commit -m "feat: Add Tesseract.js OCR extraction for image-based PDFs"
```

---

### Task 6: Implement Cascade Orchestration

**Files:**

- Modify: `src/lib/riders/extraction-utils.ts`

- [ ] **Step 1: Add cascade orchestration function**

Add to `src/lib/riders/extraction-utils.ts`:

```typescript
import PDFParser from "pdf2json";

/**
 * Cascade PDF text extraction
 * Tries methods in sequence until quality threshold is met
 *
 * Note: All extraction functions (extractWithPdfJs, extractWithPdfParse,
 * extractWithTesseract, extractWithPdf2Json) are defined in this same file
 */
export async function extractPdfTextCascade(
  buffer: Buffer,
): Promise<CascadeResult> {
  const methodsAttempted: string[] = [];
  let bestText = "";
  let bestMetrics = assessTextQuality("");

  // Step 1: Try pdfjs-dist first (best font handling)
  console.log("[Cascade] Trying pdfjs-dist...");
  const pdfJsResult = await extractWithPdfJs(buffer);

  if (pdfJsResult.success && pdfJsResult.text.length > bestText.length) {
    bestText = pdfJsResult.text;
    bestMetrics = pdfJsResult.metrics;
    methodsAttempted.push("pdfjs-dist");
  }

  // Check if quality is sufficient
  if (isQualitySufficient(bestMetrics, methodsAttempted)) {
    console.log("[Cascade] pdfjs-dist quality sufficient, stopping");
    return {
      text: bestText,
      methodsAttempted,
      quality: getQualityRating(bestMetrics, methodsAttempted),
      metrics: bestMetrics,
    };
  }

  // Step 2: Try pdf2json (existing implementation)
  console.log("[Cascade] Trying pdf2json...");
  const pdf2JsonResult = await extractWithPdf2Json(buffer);

  if (pdf2JsonResult.success && pdf2JsonResult.text.length > bestText.length) {
    // Merge texts if they complement each other
    bestText = mergeExtractedTexts(bestText, pdf2JsonResult.text);
    bestMetrics = assessTextQuality(bestText);
    methodsAttempted.push("pdf2json");
  }

  if (isQualitySufficient(bestMetrics, methodsAttempted)) {
    console.log("[Cascade] pdf2json quality sufficient, stopping");
    return {
      text: bestText,
      methodsAttempted,
      quality: getQualityRating(bestMetrics, methodsAttempted),
      metrics: bestMetrics,
    };
  }

  // Step 3: Try pdf-parse
  console.log("[Cascade] Trying pdf-parse...");
  const pdfParseResult = await extractWithPdfParse(buffer);

  if (pdfParseResult.success && pdfParseResult.text.length > 0) {
    bestText = mergeExtractedTexts(bestText, pdfParseResult.text);
    bestMetrics = assessTextQuality(bestText);
    methodsAttempted.push("pdf-parse");
  }

  if (isQualitySufficient(bestMetrics, methodsAttempted)) {
    console.log("[Cascade] pdf-parse quality sufficient, stopping");
    return {
      text: bestText,
      methodsAttempted,
      quality: getQualityRating(bestMetrics, methodsAttempted),
      metrics: bestMetrics,
    };
  }

  // Step 4: Try Tesseract OCR for image-based PDFs
  console.log("[Cascade] Trying Tesseract OCR...");
  const tesseractResult = await extractWithTesseract(buffer);

  if (tesseractResult.success && tesseractResult.text.length > 0) {
    bestText = mergeExtractedTexts(bestText, tesseractResult.text);
    bestMetrics = assessTextQuality(bestText);
    methodsAttempted.push("tesseract");
  }

  console.log(
    `[Cascade] Final quality: ${bestMetrics.characterCount} chars, ratio: ${bestMetrics.controlCharRatio.toFixed(3)}`,
  );

  return {
    text: bestText,
    methodsAttempted,
    quality: getQualityRating(bestMetrics, methodsAttempted),
    metrics: bestMetrics,
  };
}

/**
 * Merge two extracted texts, preferring longer content and removing duplicates
 */
function mergeExtractedTexts(text1: string, text2: string): string {
  if (!text1) return text2;
  if (!text2) return text1;

  // For now, just concatenate with separator
  // Could be enhanced to detect duplicates
  return text1 + "\n\n--- Alternative extraction ---\n\n" + text2;
}

/**
 * pdf2json extraction (from existing route.ts)
 */
function extractWithPdf2Json(buffer: Buffer): Promise<ExtractionAttempt> {
  return new Promise((resolve) => {
    const pdfParser = new PDFParser();

    pdfParser.on(
      "pdfParser_dataReady",
      (pdfData: {
        Pages: Array<{
          Texts: Array<{ x: number; y: number; R: Array<{ T: string }> }>;
        }>;
      }) => {
        const pages = pdfData.Pages || [];
        const extractedLines: string[] = [];

        for (const page of pages) {
          const items = [...(page.Texts || [])].sort(
            (left, right) => left.y - right.y || left.x - right.x,
          );
          let currentY: number | null = null;
          let currentLine: string[] = [];

          for (const item of items) {
            const text = (item.R || [])
              .map((run) => {
                try {
                  return decodeURIComponent(run.T || "");
                } catch {
                  return run.T || "";
                }
              })
              .join(" ")
              .replace(/\s+/g, " ")
              .trim();

            if (!text) continue;

            if (currentY === null || Math.abs(item.y - currentY) > 0.35) {
              if (currentLine.length) {
                extractedLines.push(currentLine.join(" ").trim());
              }
              currentLine = [text];
              currentY = item.y;
            } else {
              currentLine.push(text);
            }
          }

          if (currentLine.length) {
            extractedLines.push(currentLine.join(" ").trim());
          }
          extractedLines.push("");
        }

        resolve({
          method: "pdf2json",
          success: true,
          text: extractedLines.join("\n").trim(),
          metrics: assessTextQuality(extractedLines.join("\n").trim()),
        });
      },
    );

    pdfParser.on(
      "pdfParser_dataError",
      (error: Error | { parserError: Error }) => {
        resolve({
          method: "pdf2json",
          success: false,
          text: "",
          metrics: assessTextQuality(""),
          error: error instanceof Error ? error.message : "PDF parsing failed",
        });
      },
    );

    pdfParser.parseBuffer(buffer);
  });
}
```

**Note:** The pdf2json extraction needs to be moved to extraction-utils.ts or imported. For now, include it inline as shown above.

- [ ] **Step 2: Commit**

```bash
git add src/lib/riders/extraction-utils.ts
git commit -m "feat: Add cascade PDF extraction orchestration"
```

---

### Task 7: Create Enhanced Regex Parser

**Files:**

- Modify: `src/lib/riders/extraction-utils.ts`

- [ ] **Step 1: Add enhanced regex parser functions**

Add to `src/lib/riders/extraction-utils.ts`. This is a replacement/enhancement of the existing `extractFallbackEquipment`, `extractCatering`, `extractAccommodation` etc. from route.ts:

```typescript
/**
 * Enhanced Regex Parser for Rider Extraction
 * Used when LM Studio is unavailable
 */

export interface ParsedRider {
  equipment: EquipmentItem[];
  stage_setup: {
    monitors: Array<{ type: string; quantity: number; location: string }>;
    power: Array<{ type: string; quantity: number }>;
    furniture: Array<{ type: string; quantity: number; dimensions?: string }>;
  };
  backline: {
    cdjs: Array<{ model: string; quantity: number }>;
    turntables: Array<{ model: string; quantity: number }>;
    mixer_minimum_requirements: string;
  };
  audio: {
    inputs_needed: number;
    monitor_type: string;
    preferred_mixers: Array<{
      model: string;
      required_features: string;
      priority: number;
    }>;
    special_requirements: string;
  };
  transport: {
    flights_needed: boolean;
    priority_boarding: boolean;
    baggage_requirements: string;
    origin_city: string;
  };
  hospitality: {
    accommodation: {
      required: boolean;
      nights: number;
      room_type: string;
      location_preference: string;
    };
    catering: {
      meals: string[];
      dietary: string[];
      drinks: {
        water: boolean;
        spirits: string[];
        mixers: string[];
        alcopops: boolean;
      };
      special_requests: string;
    };
    transport_ground: {
      car_service: boolean;
      pickup_time: string;
      pickup_location: string;
      return_required: boolean;
      vehicle_type: string;
    };
  };
  warnings: string[];
}

// Equipment brand keywords for recognition
const EQUIPMENT_BRANDS = [
  "Pioneer",
  "CDJ",
  "DJM",
  "Allen & Heath",
  "Xone",
  "RME",
  "Focusrite",
  "Universal Audio",
  "Native Instruments",
  "NI",
  "Traktor",
  "Serato",
  "Technics",
  "SL-1200",
  "Rotel",
  "Mackie",
  "JBL",
  "Funktion-One",
  "Martin",
  "Clay Paky",
  "Chamsys",
  "MA Lighting",
  "GrandMA",
  "Shure",
  "Sennheiser",
  "AKG",
  "Beyerdynamic",
  "Neumann",
  "Yamaha",
  "QSC",
  "Lab Gruppen",
  "Powersoft",
];

const EQUIPMENT_KEYWORDS = [
  "mixer",
  "amplifier",
  "amp",
  "speaker",
  "sub",
  "subwoofer",
  "monitor",
  "microphone",
  "mic",
  "stands",
  "cable",
  "adapter",
  "power",
  "player",
  "turntable",
  "deck",
  "controller",
  "interface",
  "equalizer",
  "compressor",
  "limiter",
  "processor",
];

/**
 * Enhanced equipment extraction
 */
export function extractEquipmentEnhanced(lines: string[]): EquipmentItem[] {
  const equipment: EquipmentItem[] = [];
  const seen = new Set<string>();

  const cleanName = (name: string): string => {
    let cleaned = name
      .replace(/[\x00-\x1F\x7F]/g, " ") // Control chars
      .replace(/\s*\([^)]*\)\s*/g, " ") // Parenthetical specs
      .replace(/^[C•*\-·]\s+/i, "") // Bullet chars
      .replace(/\s+Please.*$/i, "")
      .replace(/\s+Make sure.*$/i, "")
      .replace(/\s+Any other.*$/i, "")
      .trim();
    return cleaned;
  };

  const normalizeName = (name: string): string =>
    name.toLowerCase().replace(/[^a-z0-9]/g, "");

  const isEquipmentLine = (line: string): boolean => {
    const lower = line.toLowerCase();
    return (
      EQUIPMENT_BRANDS.some((brand) => lower.includes(brand.toLowerCase())) ||
      EQUIPMENT_KEYWORDS.some((kw) => lower.includes(kw))
    );
  };

  for (const line of lines) {
    // Check for artist brings section
    const isArtistBrings = /artist will bring|we (will|can) bring/i.test(line);

    // Quantity patterns
    const qtyPatterns = [
      /^(\d+)\s*x\s*(.+)/i,
      /^(\d+)\s*×\s*(.+)/i,
      /^x\s*(\d+)\s*(.+)/i,
      /^(\d+)\s*pack(?:s)?\s+of\s+(.+)/i,
      /(?:^|\s)(\d+)\s*(?:x|×)\s*(.+?)(?:\s|$)/i,
    ];

    for (const pattern of qtyPatterns) {
      const match = line.match(pattern);
      if (match) {
        const qty = parseInt(match[1], 10);
        let name = cleanName(match[2].trim());

        if (name.length > 2 && !seen.has(normalizeName(name))) {
          seen.add(normalizeName(name));
          equipment.push({
            name,
            quantity: qty,
            artist_brings: isArtistBrings,
            notes: undefined,
          });
        }
        continue;
      }
    }

    // Lines that look like equipment without quantity
    if (line.length > 5 && line.length < 200) {
      const bulletMatch = line.match(/^([C•*\-·]\s+)(.+)/i);
      if (bulletMatch && isEquipmentLine(bulletMatch[2])) {
        const name = cleanName(bulletMatch[2]);
        if (name.length > 2 && !seen.has(normalizeName(name))) {
          seen.add(normalizeName(name));
          equipment.push({
            name,
            quantity: 1,
            artist_brings: isArtistBrings,
          });
        }
      }
    }
  }

  return equipment;
}

/**
 * Enhanced accommodation extraction
 */
export function extractAccommodationEnhanced(lines: string[]): {
  required: boolean;
  nights: number;
  room_type: string;
  location_preference: string;
} {
  const result = {
    required: false,
    nights: 0,
    room_type: "",
    location_preference: "",
  };

  const nightPatterns = [
    /(\d+)\s*(?:x\s*)?night[s]?/i,
    /(\d+)\s*(?:x\s*)?overnight/i,
    /(?:book|need|require).*?(\d+)\s*night/i,
  ];

  for (const line of lines) {
    // Check if accommodation is required
    if (/accommodation|hotel|overnight|room/i.test(line)) {
      result.required = true;
    }

    // Extract nights
    for (const pattern of nightPatterns) {
      const match = line.match(pattern);
      if (match) {
        result.nights = Math.max(result.nights, parseInt(match[1], 10));
      }
    }

    // Room type
    if (/single room/i.test(line)) result.room_type = "single";
    else if (/double room|twin room/i.test(line))
      result.room_type = "double/twin";
    else if (/suite/i.test(line)) result.room_type = "suite";

    // Location
    const locationMatch = line.match(
      /near|close to|walking distance|in\s+(\w+)/i,
    );
    if (locationMatch) {
      result.location_preference = locationMatch[1] || "";
    }
  }

  return result;
}

/**
 * Enhanced catering extraction
 */
export function extractCateringEnhanced(lines: string[]): {
  meals: string[];
  dietary: string[];
  drinks: {
    water: boolean;
    spirits: string[];
    mixers: string[];
    alcopops: boolean;
  };
  special_requests: string;
} {
  const result = {
    meals: [] as string[],
    dietary: [] as string[],
    drinks: {
      water: false,
      spirits: [] as string[],
      mixers: [] as string[],
      alcopops: false,
    },
    special_requests: "",
  };

  const dietaryKeywords = [
    "vegetarian",
    "vegan",
    "gluten[- ]?free",
    "dairy[- ]?free",
    "lactose[- ]?free",
    "nut[- ]?free",
    "allergies",
    "allergen",
    "halal",
    "kosher",
  ];

  const drinkKeywords = {
    water: ["sparkling water", "still water", "water", "evian", "badoit"],
    spirits: ["whisky", "vodka", "gin", "rum", "tequila", "brandy"],
    mixers: ["coke", "sprite", "tonic", "juice", "soda"],
    alcopops: ["alcopop", "spirit drink", "premix"],
  };

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Dietary requirements
    for (const keyword of dietaryKeywords) {
      if (new RegExp(keyword, "i").test(lower)) {
        const match = lower.match(new RegExp(keyword, "i"));
        if (match && !result.dietary.includes(match[0])) {
          result.dietary.push(match[0]);
        }
      }
    }

    // Meals
    if (/breakfast|lunch|dinner|meal/i.test(line)) {
      const mealMatch = lower.match(/breakfast|lunch|dinner/gi);
      if (mealMatch) {
        result.meals.push(...mealMatch);
      }
    }

    // Drinks
    for (const [drinkType, keywords] of Object.entries(drinkKeywords)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          if (drinkType === "water") result.drinks.water = true;
          else if (drinkType === "alcopops") result.drinks.alcopops = true;
          else if (
            result.drinks[drinkType as keyof typeof result.drinks] instanceof
            Array
          ) {
            (result.drinks as Record<string, unknown>)[drinkType] = [
              ...(result.drinks[
                drinkType as keyof typeof result.drinks
              ] as string[]),
              keyword,
            ];
          }
        }
      }
    }
  }

  // Dedupe
  result.meals = [...new Set(result.meals)];
  result.dietary = [...new Set(result.dietary)];
  result.drinks.spirits = [...new Set(result.drinks.spirits)];
  result.drinks.mixers = [...new Set(result.drinks.mixers)];

  return result;
}

/**
 * Full enhanced parsing when LM Studio unavailable
 */
export function parseRiderWithEnhancedRegex(text: string): {
  tech_rider: Partial<TechRider>;
  hospitality_rider: Partial<HospitalityRider>;
  warnings: string[];
} {
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const equipment = extractEquipmentEnhanced(lines);
  const accommodation = extractAccommodationEnhanced(lines);
  const catering = extractCateringEnhanced(lines);

  const warnings: string[] = [];

  // Generate warnings for low confidence extractions
  if (equipment.length === 0) {
    warnings.push("No equipment items extracted - PDF may have parsing issues");
  }
  if (accommodation.required && accommodation.nights === 0) {
    warnings.push("Accommodation required but nights not detected");
  }

  return {
    tech_rider: {
      equipment,
      audio: {
        inputs_needed: 2,
        monitor_type: "booth",
        special_requirements: "",
      },
    },
    hospitality_rider: {
      accommodation: {
        required: accommodation.required,
        nights: accommodation.nights,
        room_type: accommodation.room_type,
        location_preference: accommodation.location_preference,
      },
      catering: {
        meals: catering.meals,
        dietary: catering.dietary,
        drinks: catering.drinks,
        special_requests: catering.special_requests,
      },
    },
    warnings,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/riders/extraction-utils.ts
git commit -m "feat: Add enhanced regex parser for rider extraction"
```

---

### Task 8: Update route.ts to Use Cascade

**Files:**

- Modify: `src/app/api/artists/extract-rider/route.ts`

- [ ] **Step 1: Replace the extractPdfText and extractPdfTextWithFallback functions**

In `route.ts`, replace lines 1273-1347:

```typescript
// OLD (remove):
// async function extractPdfText(buffer: Buffer): Promise<string> { ... }
// export async function extractPdfTextWithFallback(buffer: Buffer): Promise<string> { ... }

// NEW (replace with):
import {
  extractPdfTextCascade,
  parseRiderWithEnhancedRegex,
  assessTextQuality,
  getQualityRating,
} from "@/lib/riders/extraction-utils";

/**
 * Main PDF text extraction using cascade method
 * Tries: pdfjs-dist → pdf2json → pdf-parse → Tesseract OCR
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  const result = await extractPdfTextCascade(buffer);

  console.log(
    `[PDF extraction] Cascade complete: ${result.methodsAttempted.join(" → ")}`,
  );
  console.log(
    `[PDF extraction] Quality: ${result.quality}, chars: ${result.metrics.characterCount}`,
  );

  return result.text;
}

export async function extractPdfTextWithFallback(buffer: Buffer): Promise<{
  text: string;
  quality: "high" | "medium" | "low" | "failed";
  methodsAttempted: string[];
}> {
  const result = await extractPdfTextCascade(buffer);

  const warnings: string[] = [];

  if (result.quality === "low") {
    warnings.push(
      `PDF extraction quality is low (${result.metrics.characterCount} chars extracted). Results may be incomplete.`,
    );
  } else if (result.quality === "failed") {
    warnings.push(
      "PDF extraction failed. The file may be corrupted or image-based.",
    );
  }

  if (result.metrics.controlCharRatio > 0.01) {
    warnings.push(
      `PDF contains unusual encoding (${(result.metrics.controlCharRatio * 100).toFixed(1)}% control characters)`,
    );
  }

  return {
    text: result.text,
    quality: result.quality,
    methodsAttempted: result.methodsAttempted,
  };
}
```

- [ ] **Step 2: Update the extraction result building to include quality info**

Find where `buildExtractionResult` is called (around line 1535-1594) and modify to pass quality:

```typescript
// In extractWithLMStudio or the route handler:
// Add quality and methodsAttempted to the response
```

The exact location depends on the current code structure. The key is to:

1. Get quality info from `extractPdfTextWithFallback`
2. Pass it through to the final response
3. Show warnings to user if quality is low

- [ ] **Step 3: Commit**

```bash
git add src/app/api/artists/extract-rider/route.ts
git commit -m "feat: Integrate cascade PDF extraction into route handler"
```

---

### Task 9: Manual Testing with Test PDFs

**Files:**

- None (testing)

- [ ] **Step 1: Test with Surf 2 Glory rider.pdf (Type3 fonts)**

```bash
npm run test:rider
```

Or manually:

```bash
npx tsx scripts/test-enhanced-extraction.ts
```

Expected: Should extract more text than before, quality should be 'medium' or 'high'

- [ ] **Step 2: Test with Tech Rider Volvox 2023.pdf (suspected image-based)**

Expected: Should trigger Tesseract.js OCR, quality should be 'medium' or 'high' if OCR succeeds

- [ ] **Step 3: Verify warnings shown for low quality**

For each test, check that:

- Console shows cascade attempts
- If quality is low, warning is logged
- Extracted data is reasonable

---

### Task 10: Run Full Verification

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Fix any issues.

- [ ] **Step 2: Run knip for dead code detection**

```bash
npm run knip
```

- [ ] **Step 3: Run unit tests**

```bash
npm run test:unit
```

- [ ] **Step 4: Commit final changes**

```bash
git add -A
git commit -m "feat: Implement universal PDF extraction with cascade fallback"
```

---

## Acceptance Criteria Verification

1. [ ] All 11 test PDFs produce some extractable text
2. [ ] Type3 font PDFs show improved extraction vs pdf2json alone
3. [ ] Image-based PDFs trigger Tesseract OCR
4. [ ] Console logs show cascade attempts
5. [ ] Quality warnings displayed for low-quality extraction
6. [ ] All tests pass
7. [ ] No dead code introduced
