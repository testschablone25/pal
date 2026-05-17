/**
 * Vitest Unit Test — Rider Extraction with Real OpenRouter API
 * Tests the full PDF extraction pipeline against the actual OpenRouter API.
 *
 * Run: npm run test:unit src/test/unit/rider-extraction.test.ts
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:3000/api/artists/extract-rider';
const ARTIST_ID = 'aa3332fc-d361-410a-b55b-dbac754b726c'; // Surf 2 Glory

describe('Rider Extraction - Unit Test', () => {
  it('should extract valid JSON from Surf 2 Glory PDF via real OpenRouter API', async () => {
    // Load the PDF file
    const pdfPath = path.join(process.cwd(), 'Surf 2 Glory rider.pdf');
    expect(fs.existsSync(pdfPath)).toBe(true);

    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfBase64 = pdfBuffer.toString('base64');

    // Call the extraction API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artist_id: ARTIST_ID,
        pdf_data: pdfBase64,
      }),
    });

    expect(response.ok, `API returned ${response.status}: ${await response.text()}`).toBe(true);

    const result = await response.json();

    // Verify response structure
    expect(result).toBeDefined();
    expect(result.tech_rider).toBeDefined();
    expect(result.hospitality_rider).toBeDefined();

    // Verify tech_rider has equipment
    expect(Array.isArray(result.tech_rider.equipment)).toBe(true);
    expect(result.tech_rider.equipment.length).toBeGreaterThan(0);

    // Verify equipment has required fields
    const equipment = result.tech_rider.equipment[0];
    expect(equipment.name).toBeDefined();
    expect(typeof equipment.quantity).toBe('number');
    expect(typeof equipment.artist_brings).toBe('boolean');

    // Verify at least one hospitality field is populated
    const hospitality = result.hospitality_rider;
    const hasHospitalityData =
      hospitality.accommodation?.required ||
      (hospitality.catering?.meals && hospitality.catering.meals.length > 0) ||
      hospitality.transport_ground?.car_service ||
      hospitality.hospitality_notes;

    expect(hasHospitalityData, 'Hospitality rider should have at least one populated field').toBe(true);

    console.log('✓ Extraction successful');
    console.log('  Tech rider equipment:', result.tech_rider.equipment.length, 'items');
    console.log('  Hospitality:', hospitality.accommodation?.required ? 'accommodation needed' : 'no accommodation');
  }, 120000); // 2 minute timeout for API call
});