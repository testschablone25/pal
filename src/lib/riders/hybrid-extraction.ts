/**
 * Hybrid PDF Extraction System
 * Combines text extraction with vision-based fallback
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from 'canvas';

// Configure pdfjs-dist for Node.js (disable worker)
if (typeof pdfjsLib.GlobalWorkerOptions !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = false;
}

// Disable worker in document loading
pdfjsLib.disableWorker = true;

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
    disableWorker: true,
    disableFontFace: false,
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
 * Render PDF page to image
 */
async function renderPageToImage(
  page: pdfjsLib.PDFPageProxy,
  scale: number = 2.0
): Promise<string> {
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(
    Math.floor(viewport.width),
    Math.floor(viewport.height)
  );
  const ctx = canvas.getContext('2d');

  await page.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;

  return canvas.toBuffer('image/png').toString('base64');
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
    // Render first page to image
    const typedArray = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({ 
      data: typedArray,
      disableWorker: true,
      disableFontFace: false,
    });
    const pdfDocument = await loadingTask.promise;
    const page = await pdfDocument.getPage(1);
    const imageBase64 = await renderPageToImage(page, 2.0);

    // Send to vision model
    const response = await fetch(`${config.lmStudioUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.visionModelName || config.modelName,
        messages: [
          {
            role: 'system',
            content: `Extract technical and hospitality rider data from this PDF image.
Return JSON only. No markdown. No commentary.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract rider data from this PDF:' },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    console.log(`[Vision] Extracted in ${Date.now() - startTime}ms`);

    return {
      text,
      quality: 'medium', // Vision extraction quality is harder to assess
      method: 'vision',
      warnings: ['Extracted using vision model'],
      pagesProcessed: 1,
    };
  } catch (error) {
    console.error(`[Vision] Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      text: '',
      quality: 'failed',
      method: 'vision',
      warnings: [`Vision extraction failed: ${error.message}`],
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
