/**
 * PDF to Image Conversion Module
 * Converts PDF pages to PNG images for vision model processing
 * Uses pdf-raster (PDFium) for reliable rendering
 */

import { convert, type ConvertedPage } from 'pdf-raster';

export interface RenderedPage {
  imageData: string;
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
    console.log(`[PDF→Image] Converting PDF to images at ${scale}x scale...`);

    const pages = await convert(buffer, {
      scale,
      limit: maxPages,
      format: 'png',
    } as any);

    const renderedPages: RenderedPage[] = [];

    for (const page of pages as any) {
      const pngBuffer = Buffer.from(page.data);
      const base64 = pngBuffer.toString('base64');

      renderedPages.push({
        imageData: base64,
        pageNumber: page.pageNumber,
        width: page.width,
        height: page.height,
      });

      console.log(`[PDF→Image] Page ${page.pageNumber}: ${page.width}x${page.height}`);
    }

    console.log(`[PDF→Image] ✅ Converted ${renderedPages.length} page(s)`);
    return renderedPages;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PDF→Image] ❌ Conversion failed:', message);
    throw new Error(`PDF rendering failed: ${message}`);
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
  return pages[pageNumber - 1];
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