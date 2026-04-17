# Universal PDF Extraction System - Design Specification

**Date:** 2026-04-17
**Author:** PAL Development Team
**Status:** Approved for Implementation

---

## 1. Problem Statement

The current PDF extraction system relies solely on `pdf2json`, which struggles with:

- **Type3 fonts** (custom glyphs) - produces garbled/missing text
- **Image-based PDFs** - fails entirely
- **Control character artifacts** - pollutes extracted text

This directly impacts LM Studio AI extraction quality since it receives poor-quality raw text.

---

## 2. Goals

1. **Universal PDF Support** - Handle ALL PDF types from artist agencies without requiring reformatted documents
2. **Automatic Fallback** - Try multiple extraction methods until adequate quality is achieved
3. **Offline Processing** - All extraction must work locally (no external APIs)
4. **Enhanced Fallback Parser** - Improved regex-based extraction when LM Studio is unavailable
5. **Quality Transparency** - Users know when extraction quality is uncertain

---

## 3. Architecture

### 3.1 Cascade Extraction Pipeline

```
PDF Upload
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  CASCADE EXTRACTION PIPELINE                                   │
│  (tries in sequence until quality threshold met)               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: pdfjs-dist (Mozilla PDF.js)                          │
│  - Best standard font support                                  │
│  - Better Type3 handling than pdf2json                        │
│  - Returns text + font metadata                                │
│                                                                 │
│         │                                                       │
│         ▼ (if quality < threshold)                            │
│                                                                 │
│  Step 2: pdf2json (existing)                                 │
│  - Current implementation retained as backup                    │
│  - May succeed where pdfjs fails                               │
│                                                                 │
│         │                                                       │
│         ▼ (if quality < threshold)                            │
│                                                                 │
│  Step 3: pdf-parse                                            │
│  - ALREADY INSTALLED but unused!                               │
│  - Good Type3/embedded font handling                           │
│                                                                 │
│         │                                                       │
│         ▼ (if image-based detected or quality < threshold)    │
│                                                                 │
│  Step 4: Tesseract.js OCR                                     │
│  - Render PDF pages to images                                 │
│  - OCR on each page                                           │
│  - Language: English + common European languages             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
TEXT QUALITY ASSESSMENT
    │
    ├── Pass → Proceed to parsing
    │
    └── Fail → Return error with extraction attempt summary
    │
    ▼
ENHANCED REGEX PARSING
    │
    ▼
EXTRACTION RESULT
```

### 3.2 Quality Assessment Function

Quality metrics checked between cascade steps:

| Metric                  | Threshold                | Action if Failed |
| ----------------------- | ------------------------ | ---------------- |
| Character count         | < 50 chars               | Continue cascade |
| Control character ratio | > 5%                     | Continue cascade |
| Word density            | < 30% recognizable words | Continue cascade |
| Language confidence     | < 50% English-like       | Continue cascade |

### 3.3 Enhanced Regex Fallback Parser

Improvements to regex-based extraction (used when LM Studio unavailable):

#### Section Detection

- Multiple header patterns per section type
- Multi-column layout awareness
- Table structure detection

#### Equipment Parsing

- Extended quantity patterns: `1x`, `2x`, `×`, `two`, `pair of`, `pack of`
- Brand/model recognition: Pioneer, Allen & Heath, Funktion-One, Martin, etc.
- Equipment with specs in parentheses preserved
- Noise line filtering (promotional, legal text)

#### Hospitality Parsing

- Hotel night formats: `2 nights`, `2x overnight`, `2 nights accommodation`
- Dietary patterns: vegetarian, vegan, gluten-free, allergies
- Catering detection even for unusual phrasing
- Ground transport: car service, pickup, return journey patterns

---

## 4. New Dependencies

| Package        | Version  | Purpose                          |
| -------------- | -------- | -------------------------------- |
| `pdfjs-dist`   | ^5.6.205 | Primary PDF extraction (Mozilla) |
| `tesseract.js` | ^7.0.0   | OCR for image-based/scanned PDFs |

---

## 5. File Changes

### New Files

- `src/lib/riders/extraction-utils.ts` - Shared extraction utilities, enhanced regex parser

### Modified Files

- `src/app/api/artists/extract-rider/route.ts` - Implement cascade extraction, add pdfjs/tesseract

---

## 6. Extraction Result Structure

```typescript
interface ExtractionResult {
  success: boolean;
  quality: "high" | "medium" | "low" | "failed";
  methodsAttempted: string[];
  textLength: number;
  controlCharRatio: number;
  tech_rider: TechRider | null;
  hospitality_rider: HospitalityRider | null;
  warnings: string[];
  rawText: string;
}
```

---

## 7. Testing

Manual validation with existing PDFs:

- `Surf 2 Glory rider.pdf` - Type3 font issues
- `Tech Rider Volvox 2023.pdf` - Suspected image-based
- `Doudou MD Rider.pdf` - Standard rider
- Other PDFs in project root

---

## 8. Acceptance Criteria

1. All 11 test PDFs produce some extractable text (no complete failures)
2. Type3 font PDFs extract more text than with pdf2json alone
3. Image-based PDFs trigger Tesseract.js OCR
4. Enhanced regex parser extracts equipment/hospitality when LM Studio unavailable
5. Quality warnings shown to user when extraction is uncertain
6. All processing remains fully offline
