/**
 * PDF to Image Conversion Module
 * Converts PDF pages to PNG images for vision model processing
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from 'canvas';

// PDF.js will use its built-in worker in Node.js

export interface RenderedPage {
  imageData: string; // Base64 encoded PNG
  pageNumber: number;
  width: number;
  height: number;
}

/**
 * Render PDF pages to PNG images
 * Returns base64-encoded PNG images for each page
 */
export async function renderPdfToImages(
  buffer: Buffer,
  options: {
    scale?: number;
    maxPages?: number;
  } = {}
): Promise<RenderedPage[]> {
  const { scale = 2.0, maxPages = 10 } = options;

  try {
    const typedArray = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
      data: typedArray,
      standardFontDataUrl: undefined,
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = Math.min(pdfDocument.numPages, maxPages);
    const renderedPages: RenderedPage[] = [];

    console.log(`[PDF→Image] Rendering ${numPages} page(s) at ${scale}x scale...`);

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      console.log(`[PDF→Image] Rendering page ${pageNum}/${numPages}...`);

      const page = await pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      // Create canvas using node-canvas (for server-side rendering)
      const { createCanvas } = await import('canvas');
      const canvas = createCanvas(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height)
      );
      const ctx = canvas.getContext('2d');

      // Render page to canvas
      await page.render({
        canvasContext: ctx as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise;

      // Convert to PNG base64
      const pngBuffer = canvas.toBuffer('image/png');
      const base64 = pngBuffer.toString('base64');

      renderedPages.push({
        imageData: base64,
        pageNumber: pageNum,
        width: Math.floor(viewport.width),
        height: Math.floor(viewport.height),
      });

      console.log(`[PDF→Image] Page ${pageNum} rendered: ${viewport.width}x${viewport.height}`);
    }

    console.log(`[PDF→Image] ✅ Rendered ${renderedPages.length} page(s)`);
    return renderedPages;
  } catch (error: any) {
    console.error('[PDF→Image] ❌ Rendering failed:', error.message);
    throw new Error(`PDF rendering failed: ${error.message}`);
  }
}

/**
 * Render a single page to image (for testing)
 */
export async function renderSinglePage(
  buffer: Buffer,
  pageNumber: number = 1,
  scale: number = 2.0
): Promise<RenderedPage> {
  const pages = await renderPdfToImages(buffer, { scale, maxPages: pageNumber });
  if (pages.length === 0) {
    throw new Error(`Page ${pageNumber} not found`);
  }
  return pages[0];
}

/**
 * Get image data URL for use in API calls
 */
export function getImageDataUrl(page: RenderedPage): string {
  return `data:image/png;base64,${page.imageData}`;
}

/**
 * Render PDF and return as data URLs for API
 */
export async function getPdfImageDataUrls(
  buffer: Buffer,
  options: { scale?: number; maxPages?: number } = {}
): Promise<string[]> {
  const pages = await renderPdfToImages(buffer, options);
  return pages.map(page => getImageDataUrl(page));
}
