/**
 * Test extraction with new hybrid approach
 * Uses text extraction + vision fallback
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234/v1';

async function testExtraction() {
  console.log('🧪 Testing Hybrid Extraction\n');

  const pdfs = [
    'Tech Rider Volvox 2023.pdf',
    'Tech Hospitality Rider Marron 092023.pdf',
    'RIDER AMORAL.pdf',
  ];

  for (const pdfName of pdfs) {
    const pdfPath = join(process.cwd(), pdfName);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📄 ${pdfName}`);
    console.log(`${'='.repeat(80)}\n`);

    try {
      const stats = await import('fs/promises').then(fs => fs.stat(pdfPath));
      console.log(`Size: ${(stats.size / 1024).toFixed(1)} KB`);
    } catch {
      console.log('❌ File not found\n');
      continue;
    }

    // Step 1: Try text extraction
    console.log('1. Text extraction...');
    const PDFParser = (await import('pdf2json')).default;
    const buffer = readFileSync(pdfPath);

    const text = await new Promise<string>((resolve, reject) => {
      const pdfParser = new PDFParser();
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

        resolve(extractedLines.join('\n').trim());
      });

      pdfParser.on('pdfParser_dataError', () => {
        resolve('');
      });

      pdfParser.parseBuffer(buffer);
    });

    const charCount = text.length;
    console.log(`   Characters: ${charCount}`);
    console.log(`   Sample: ${text.substring(0, 150)}...`);

    // Step 2: Send to model
    console.log('\n2. Sending to Gemma 4 2B...');
    const startTime = Date.now();

    try {
      const response = await fetch(`${LM_STUDIO_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemma-4-e2b',
          messages: [
            {
              role: 'system',
              content: `Extract technical and hospitality rider data.
Return JSON only. No markdown.`
            },
            {
              role: 'user',
              content: charCount > 0 ? text.slice(0, 12000) : 'No text extracted from PDF'
            }
          ],
          temperature: 0.1,
          max_tokens: 2000,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        console.log(`   ❌ HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      const timeMs = Date.now() - startTime;
      const content = data.choices?.[0]?.message?.content;

      console.log(`   ✅ Response in ${timeMs}ms`);
      console.log(`   Content length: ${content?.length || 0} chars`);

      // Try to parse JSON
      try {
        const jsonMatch = content?.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('   ✅ Successfully parsed JSON');
          console.log(`   Has tech_rider: ${!!parsed.tech_rider}`);
          console.log(`   Has hospitality_rider: ${!!parsed.hospitality_rider}`);
          if (parsed.tech_rider?.equipment) {
            console.log(`   Equipment items: ${parsed.tech_rider.equipment.length}`);
          }
        } else {
          console.log('   ⚠️  No JSON found in response');
          console.log(`   First 200 chars: ${content?.substring(0, 200)}`);
        }
      } catch (e: any) {
        console.log(`   ❌ JSON parse failed: ${e.message}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n✅ All tests complete!');
}

testExtraction().catch(console.error);
