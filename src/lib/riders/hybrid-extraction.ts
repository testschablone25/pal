/**
 * Hybrid PDF Extraction System
 * Combines text extraction with vision-based fallback
 * Uses pdf-raster for PDF to image conversion
 */

import { convert } from 'pdf-raster';
import { createCanvas } from 'canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import path from 'path';

// Configure pdfjs-dist for text extraction
if (typeof pdfjsLib.GlobalWorkerOptions !== 'undefined') {
  const workerPath = path.join(
    process.cwd(),
    'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'
  );
  const workerUrl = new URL(`file:///${workerPath.replace(/\\/g, '/')}`);
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.href;
}

// Types
export interface ExtractionResult {
  text: string;
  quality: 'high' | 'medium' | 'low' | 'failed';
  method: 'text' | 'vision';
  warnings: string[];
  pagesProcessed: number;
}

export interface ExtractionConfig {
  lmStudioUrl: string;
  modelName: string;
  visionModelName?: string;
  useVisionFallback: boolean;
}

// Quality thresholds
const QUALITY_THRESHOLDS = {
  MIN_CHAR_COUNT: 50,
  MIN_WORD_DENSITY: 0.3,
};

/**
 * Assess text quality
 */
function assessTextQuality(text: string): {
  quality: 'high' | 'medium' | 'low' | 'failed';
  charCount: number;
  wordCount: number;
  warnings: string[];
} {
  const warnings: string[] = [];
  const charCount = text.length;
  const words = text.match(/[a-zA-Z0-9]{3,}/g) || [];
  const wordCount = words.length;
  const wordDensity = charCount > 0 ? wordCount / (charCount / 5) : 0;

  let quality: 'high' | 'medium' | 'low' | 'failed' = 'low';

  if (charCount < QUALITY_THRESHOLDS.MIN_CHAR_COUNT) {
    quality = 'failed';
    warnings.push('Very low character count - PDF may be image-based');
  } else if (wordDensity < QUALITY_THRESHOLDS.MIN_WORD_DENSITY) {
    quality = 'low';
    warnings.push('Low word density - extraction may be incomplete');
  } else if (charCount < 500) {
    quality = 'medium';
  } else {
    quality = 'high';
  }

  return { quality, charCount, wordCount, warnings };
}

/**
 * Extract text from PDF using pdfjs-dist
 */
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const typedArray = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({
    data: typedArray,
    standardFontDataUrl: undefined,
    isEvalSupported: false,
    disableFontFace: true,
  });

  const pdfDocument = await loadingTask.promise;
  const textParts: string[] = [];

  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();

    const items = textContent.items as Array<{
      str: string;
      transform: number[];
    }>;

    // Sort by Y position (top to bottom)
    const sortedItems = [...items].sort((a, b) => b.transform[5] - a.transform[5]);

    // Group into lines
    let currentY: number | null = null;
    let currentLine: string[] = [];

    for (const item of sortedItems) {
      const itemY = item.transform[5];

      if (currentY === null || Math.abs(itemY - currentY) > 5) {
        if (currentLine.length > 0) {
          textParts.push(currentLine.join(' ').trim());
        }
        currentLine = [item.str];
        currentY = itemY;
      } else {
        currentLine.push(item.str);
      }
    }

    if (currentLine.length > 0) {
      textParts.push(currentLine.join(' ').trim());
    }

    textParts.push(''); // Page separator
  }

  return textParts.join('\n').trim();
}

/**
 * Render PDF to images using pdf-raster
 */
async function renderPdfToImages(buffer: Buffer, scale: number = 2.0): Promise<Buffer[]> {
  const pages = await convert(buffer, {
    scale,
    format: 'png',
  } as any);

  return pages.map(page => Buffer.from(page.data));
}

/**
 * Extract from PDF using vision model
 */
async function extractWithVision(
  buffer: Buffer,
  config: ExtractionConfig
): Promise<ExtractionResult> {
  const startTime = Date.now();

  try {
    // Render ALL pages to images using pdf-raster
    const imageBuffers = await renderPdfToImages(buffer, 2.0);
    
    if (imageBuffers.length === 0) {
      throw new Error('Could not render PDF to image');
    }
    
    console.log(`[Vision] Rendering ${imageBuffers.length} page(s)`);
    
    // Send all page images to vision model
    const imageMessages = imageBuffers.map((imgBuffer, idx) => ({
      type: 'image_url' as const,
      image_url: { url: `data:image/png;base64,${imgBuffer.toString('base64')}` },
    }));
    
    // Try vision model
    const response = await fetch(`${config.lmStudioUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.visionModelName || config.modelName,
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting technical and hospitality rider data from PDF images. 
Analyze the PDF carefully and extract ALL information into the correct JSON fields.

CRITICAL RULES:
1. BACKLINE (DJ Equipment): Extract CDJs, mixers, turntables - e.g., "3x CDJ2000 NEXUS" → cdjs: [{"model": "CDJ2000 NEXUS", "quantity": 3}]
2. STAGE SETUP: Extract booth monitors - e.g., "2x high quality booth monitors w/ full volume control" → monitors
3. For STAFF requirements: Look for "Sound Technician", "Lighting Technician" - map to boolean fields
4. TRAVEL goes in hospitality transport_ground (NOT tech): flights_needed, priority_boarding, baggage_requirements, travel_booking_notes
5. ACCOMMODATION: Extract nights, room_type, bed_type ("double (x2 single beds is not acceptable)"), hotel_requirements ("minimum 4* hotel"), check_in/check_out
6. CATERING: Extract meals to "meals" array, dietary to "dietary" array, buyout to "special_requests"
7. Do NOT dump everything into hospitality_notes - use the proper fields!

Return JSON only. No markdown.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Extract rider data from these ${imageBuffers.length} PDF page images:` },
              ...imageMessages
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
      signal: AbortSignal.timeout(180000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    console.log(`[Vision] Extracted in ${Date.now() - startTime}ms`);

    return {
      text,
      quality: 'medium',
      method: 'vision',
      warnings: ['Extracted using vision model'],
      pagesProcessed: imageBuffers.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Vision] Failed: ${errorMessage}`);
    return {
      text: '',
      quality: 'failed',
      method: 'vision',
      warnings: [`Vision extraction failed: ${errorMessage}`],
      pagesProcessed: 0,
    };
  }
}

/**
 * Main hybrid extraction function
 */
export async function extractRiderHybrid(
  buffer: Buffer,
  config: ExtractionConfig
): Promise<ExtractionResult> {
  console.log('[Hybrid] Starting extraction...');

  // Step 1: Try text extraction
  console.log('[Hybrid] Step 1: Trying text extraction...');
  const text = await extractTextFromPdf(buffer);
  const assessment = assessTextQuality(text);

  console.log(`[Hybrid] Text extraction: ${assessment.quality} (${assessment.charCount} chars)`);

  // Step 2: Decide whether to use vision
  const shouldUseVision =
    assessment.quality === 'failed' ||
    assessment.quality === 'low' ||
    (config.useVisionFallback && assessment.quality === 'medium');

  if (!shouldUseVision) {
    console.log('[Hybrid] Using text extraction (good quality)');
    return {
      text,
      quality: assessment.quality,
      method: 'text',
      warnings: assessment.warnings,
      pagesProcessed: 1,
    };
  }

  // Step 3: Use vision model
  console.log('[Hybrid] Text quality low, using vision model...');
  return extractWithVision(buffer, config);
}

/**
 * Extract with specific method
 */
export async function extractWithMethod(
  buffer: Buffer,
  method: 'text' | 'vision',
  config: ExtractionConfig
): Promise<ExtractionResult> {
  if (method === 'text') {
    const text = await extractTextFromPdf(buffer);
    const assessment = assessTextQuality(text);
    return {
      text,
      quality: assessment.quality,
      method: 'text',
      warnings: assessment.warnings,
      pagesProcessed: 1,
    };
  } else {
    return extractWithVision(buffer, config);
  }
}