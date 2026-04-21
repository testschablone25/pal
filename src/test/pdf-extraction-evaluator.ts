/**
 * PDF Extraction Evaluator
 * Tests extraction capabilities across different PDF types
 * 
 * Usage: npx tsx src/test/pdf-extraction-evaluator.ts
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, extname } from 'path';
import PDFParser from 'pdf2json';

// Types
interface PdfAnalysis {
  filename: string;
  path: string;
  size: number;
  pageCount?: number;
  textExtraction: {
    method: string;
    textLength: number;
    characterCount: number;
    wordCount: number;
    lineCount: number;
    controlCharRatio: number;
    wordDensity: number;
    quality: 'high' | 'medium' | 'low' | 'failed';
    warnings: string[];
  };
  contentSample: string;
  metadata: {
    isScanned?: boolean;
    hasImages?: boolean;
    fontIssues?: boolean;
    layoutComplexity: 'simple' | 'medium' | 'complex';
  };
}

// Quality thresholds
const QUALITY_THRESHOLDS = {
  MIN_CHAR_COUNT: 50,
  MAX_CONTROL_CHAR_RATIO: 0.05,
  MIN_WORD_DENSITY: 0.3,
  HIGH_QUALITY_CHARS: 500,
  MEDIUM_QUALITY_CHARS: 150,
};

/**
 * Assess text quality
 */
function assessTextQuality(text: string): {
  characterCount: number;
  wordCount: number;
  lineCount: number;
  controlCharRatio: number;
  wordDensity: number;
  quality: 'high' | 'medium' | 'low' | 'failed';
  warnings: string[];
} {
  const warnings: string[] = [];

  // Count control characters
  const controlChars = (text.match(/[\x00-\x1F\x7F]/g) || []).length;
  const controlCharRatio = text.length > 0 ? controlChars / text.length : 1;

  // Count words (alphanumeric sequences > 2 chars)
  const words = text.match(/[a-zA-Z0-9]{3,}/g) || [];
  const wordCount = words.length;
  const wordDensity = text.length > 0 ? wordCount / (text.length / 5) : 0;

  // Count lines
  const lines = text.split(/\n/).filter(line => line.trim().length > 0);
  const lineCount = lines.length;

  // Character count
  const characterCount = text.length;

  // Determine quality
  let quality: 'high' | 'medium' | 'low' | 'failed' = 'low';

  if (characterCount < 50) {
    quality = 'failed';
    warnings.push('Very low character count - PDF may be image-based or corrupted');
  } else if (controlCharRatio > 0.1) {
    quality = 'low';
    warnings.push(`High control character ratio: ${(controlCharRatio * 100).toFixed(1)}%`);
  } else if (characterCount < 150 || wordDensity < 0.2) {
    quality = 'low';
    warnings.push('Low word density - extraction may be incomplete');
  } else if (characterCount < 500) {
    quality = 'medium';
  } else if (wordDensity >= 0.3) {
    quality = 'high';
  } else {
    quality = 'medium';
  }

  return {
    characterCount,
    wordCount,
    lineCount,
    controlCharRatio,
    wordDensity,
    quality,
    warnings,
  };
}

/**
 * Extract text from PDF using pdf2json
 */
async function extractTextWithPdf2Json(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
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
        extractedLines.push(''); // Page separator
      }

      resolve(extractedLines.join('\n').trim());
    });

    pdfParser.on('pdfParser_dataError', (error: any) => {
      reject(new Error(error.parserError?.message || 'PDF parsing failed'));
    });

    pdfParser.parseBuffer(buffer);
  });
}

/**
 * Analyze a single PDF file
 */
async function analyzePdf(filePath: string): Promise<PdfAnalysis> {
  const filename = filePath.split('/').pop() || '';
  const buffer = readFileSync(filePath);
  const stats = await import('fs/promises').then(fs => fs.stat(filePath));

  console.log(`\n📄 Analyzing: ${filename}`);
  console.log(`   Size: ${(stats.size / 1024).toFixed(1)} KB`);

  let text = '';
  let textExtraction: any = {};

  try {
    text = await extractTextWithPdf2Json(buffer);
    textExtraction = assessTextQuality(text);
  } catch (error) {
    console.log(`   ⚠️  Extraction failed: ${error}`);
    textExtraction = {
      characterCount: 0,
      wordCount: 0,
      lineCount: 0,
      controlCharRatio: 1,
      wordDensity: 0,
      quality: 'failed' as const,
      warnings: ['PDF parsing failed completely'],
    };
  }

  // Get content sample (first 500 chars)
  const contentSample = text.substring(0, 500);

  // Analyze metadata
  const metadata = {
    isScanned: textExtraction.quality === 'failed' && stats.size > 100000,
    hasImages: false, // Would need deeper analysis
    fontIssues: textExtraction.controlCharRatio > 0.05,
    layoutComplexity: textExtraction.lineCount > 50 ? 'complex' : textExtraction.lineCount > 20 ? 'medium' : 'simple' as const,
  };

  return {
    filename,
    path: filePath,
    size: stats.size,
    textExtraction: {
      method: 'pdf2json',
      ...textExtraction,
    },
    contentSample,
    metadata,
  };
}

/**
 * Format analysis result for display
 */
function formatAnalysis(analysis: PdfAnalysis): string {
  const { filename, size, textExtraction, contentSample, metadata } = analysis;

  const sizeKB = (size / 1024).toFixed(1);
  const qualityEmoji = {
    high: '✅',
    medium: '⚠️',
    low: '❌',
    failed: '🔴',
  }[textExtraction.quality];

  return `
${'='.repeat(80)}
📄 PDF: ${filename}
${'='.repeat(80)}

📊 BASIC INFO
  • Size: ${sizeKB} KB
  • Layout: ${metadata.layoutComplexity}
  • Font issues: ${metadata.fontIssues ? 'Yes' : 'No'}
  • Likely scanned: ${metadata.isScanned ? 'Yes' : 'No'}

📈 EXTRACTION QUALITY: ${qualityEmoji} ${textExtraction.quality.toUpperCase()}

  Character count: ${textExtraction.characterCount.toLocaleString()}
  Word count:      ${textExtraction.wordCount.toLocaleString()}
  Line count:      ${textExtraction.lineCount.toLocaleString()}
  Control chars:   ${(textExtraction.controlCharRatio * 100).toFixed(2)}%
  Word density:    ${(textExtraction.wordDensity * 100).toFixed(1)}%

${textExtraction.warnings.length > 0 ? '⚠️  WARNINGS:\n' + textExtraction.warnings.map(w => `  • ${w}`).join('\n') : ''}

📝 CONTENT SAMPLE (first 500 chars):
${'-'.repeat(80)}
${contentSample || '(No text extracted)'}
${'-'.repeat(80)}

💡 GEMMA 4 2B RECOMMENDATION:
${getGemmaRecommendation(textExtraction.quality, metadata)}
`;
}

/**
 * Get recommendation for Gemma 4 2B
 */
function getGemmaRecommendation(quality: string, metadata: any): string {
  if (quality === 'failed') {
    return `  Vision model required - current extraction failed completely`;
  }
  if (quality === 'low') {
    return `  Vision model recommended - current extraction has issues`;
  }
  if (metadata.layoutComplexity === 'complex') {
    return `  Vision model may help - complex layout detected`;
  }
  return `  Text-based extraction should work - simple layout with good quality`;
}

/**
 * Main function
 */
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    PDF EXTRACTION EVALUATOR                                   ║
║                    Testing current extraction method                          ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  // Find all PDF files in project root
  const projectRoot = process.cwd();
  const pdfFiles: string[] = [];

  // Check project root
  const files = readdirSync(projectRoot);
  for (const file of files) {
    if (file.endsWith('.pdf')) {
      pdfFiles.push(join(projectRoot, file));
    }
  }

  // Check .worktrees/pdf-extraction if it exists
  const worktreePath = join(projectRoot, '.worktrees/pdf-extraction');
  if (existsSync(worktreePath)) {
    const worktreeFiles = readdirSync(worktreePath);
    for (const file of worktreeFiles) {
      if (file.endsWith('.pdf')) {
        const fullPath = join(worktreePath, file);
        // Avoid duplicates
        if (!pdfFiles.some(p => p.endsWith(file))) {
          pdfFiles.push(fullPath);
        }
      }
    }
  }

  console.log(`Found ${pdfFiles.length} PDF files to analyze:\n`);
  pdfFiles.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.split('/').pop()}`);
  });

  // Analyze each PDF
  const analyses: PdfAnalysis[] = [];
  for (const pdfPath of pdfFiles) {
    try {
      const analysis = await analyzePdf(pdfPath);
      analyses.push(analysis);
      console.log(formatAnalysis(analysis));
    } catch (error) {
      console.log(`\n❌ Failed to analyze ${pdfPath}: ${error}`);
    }
  }

  // Summary
  console.log(`
${'='.repeat(80)}
📊 SUMMARY
${'='.repeat(80)}
`);

  const byQuality = {
    high: analyses.filter(a => a.textExtraction.quality === 'high'),
    medium: analyses.filter(a => a.textExtraction.quality === 'medium'),
    low: analyses.filter(a => a.textExtraction.quality === 'low'),
    failed: analyses.filter(a => a.textExtraction.quality === 'failed'),
  };

  console.log(`Quality Distribution:`);
  console.log(`  ✅ High:   ${byQuality.high.length}`);
  console.log(`  ⚠️  Medium: ${byQuality.medium.length}`);
  console.log(`  ❌ Low:    ${byQuality.low.length}`);
  console.log(`  🔴 Failed: ${byQuality.failed.length}`);

  console.log(`\n📁 By Layout Complexity:`);
  const simple = analyses.filter(a => a.metadata.layoutComplexity === 'simple').length;
  const medium = analyses.filter(a => a.metadata.layoutComplexity === 'medium').length;
  const complex = analyses.filter(a => a.metadata.layoutComplexity === 'complex').length;
  console.log(`  Simple:   ${simple}`);
  console.log(`  Medium:   ${medium}`);
  console.log(`  Complex:  ${complex}`);

  console.log(`\n🎯 GEMMA 4 2B RECOMMENDATIONS:`);
  console.log(`  • Text-based PDFs (high/medium quality): ${byQuality.high.length + byQuality.medium.length}`);
  console.log(`  • Vision model needed (low/failed): ${byQuality.low.length + byQuality.failed.length}`);
  console.log(`  • Total PDFs analyzed: ${analyses.length}`);

  console.log(`
${'='.repeat(80)}
✅ Evaluation complete!
${'='.repeat(80)}
  `);

  // Export results to JSON for further analysis
  const resultsPath = join(projectRoot, 'pdf-analysis-results.json');
  const { writeFileSync } = await import('fs');
  writeFileSync(resultsPath, JSON.stringify(analyses, null, 2));
  console.log(`Results exported to: ${resultsPath}`);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { analyzePdf, assessTextQuality, extractTextWithPdf2Json };
