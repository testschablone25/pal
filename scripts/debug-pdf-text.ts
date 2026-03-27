/**
 * Debug script to extract text from a PDF and see what we send to LM Studio
 */

import fs from 'fs';
import path from 'path';
import PDFParser from 'pdf2json';

const pdfPath = 'F:/PAL/RIDER_.VRIL 2026.pdf';

async function extractPdfText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    
    pdfParser.on('pdfParser_dataReady', (pdfData: { Pages: Array<{ Texts: Array<{ R: Array<{ T: string }> }> }> }) => {
      let text = '';
      for (const page of pdfData.Pages) {
        for (const textItem of page.Texts) {
          for (const r of textItem.R) {
            text += decodeURIComponent(r.T) + ' ';
          }
        }
        text += '\n';
      }
      resolve(text);
    });
    
    pdfParser.on('pdfParser_dataError', (error: Error | { parserError: Error }) => {
      const msg = error instanceof Error ? error.message : error.parserError.message;
      reject(new Error(msg || 'PDF parsing failed'));
    });
    
    pdfParser.parseBuffer(buffer);
  });
}

async function main() {
  console.log('=== PDF Text Extraction Debug ===\n');
  
  const buffer = fs.readFileSync(pdfPath);
  console.log('PDF size:', buffer.length, 'bytes');
  
  const text = await extractPdfText(buffer);
  console.log('\nExtracted text length:', text.length, 'characters');
  
  // Save to file for inspection
  fs.writeFileSync('F:/PAL/pdf-extracted-text.txt', text);
  console.log('Saved to pdf-extracted-text.txt');
  
  // Show key sections
  console.log('\n=== First 2000 chars ===');
  console.log(text.substring(0, 2000));
  
  console.log('\n=== Looking for key phrases ===');
  const phrases = [
    'The Artist Will Bring',
    'must provide',
    'promoter provides',
    'venue must',
    'DJ brings',
    'Equipment List',
    'Technical Rider'
  ];
  
  for (const phrase of phrases) {
    const idx = text.toLowerCase().indexOf(phrase.toLowerCase());
    if (idx >= 0) {
      console.log(`Found "${phrase}" at position ${idx}`);
      console.log('  Context:', text.substring(Math.max(0, idx - 20), idx + 150));
    }
  }
}

main().catch(console.error);
