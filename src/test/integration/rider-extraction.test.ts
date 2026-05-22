/**
 * Vitest Integration Test — Rider Extraction Pipeline
 * Tests the full pipeline: extraction → task creation → Supabase.
 *
 * Run: npm run test:unit src/test/integration/rider-extraction.test.ts
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const API_URL = 'http://localhost:3000/api/artists/extract-rider';
const ARTIST_ID = 'aa3332fc-d361-410a-b55b-dbac754b726c'; // Surf 2 Glory

// Supabase client for verification
const supabase = createClient(
  'https://cysoyvyjrhiukklxjqfe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5c295dnlqcmhpdWtrbHhqcWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTYzNjUwNjIwMCwiZXhwIjoxOTUyMDgyMjAwfQ.0Y0RtKgpIwmK7P7X8xG0P3wZ8vLJHmN8vP9wZ6xYhJk'
);

describe.skip('Rider Extraction - Integration Test', () => {
  it('should extract PDF and create tasks in Supabase', async () => {
    // Load the PDF file
    const pdfPath = path.join(process.cwd(), 'Surf 2 Glory rider.pdf');
    expect(fs.existsSync(pdfPath)).toBe(true);

    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfBase64 = pdfBuffer.toString('base64');

    // Get current task count before extraction
    const { data: tasksBefore } = await supabase
      .from('tasks')
      .select('id')
      .eq('artist_id', ARTIST_ID);

    const tasksBeforeCount = tasksBefore?.length || 0;
    console.log('Tasks before extraction:', tasksBeforeCount);

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
    expect(result.tech_rider).toBeDefined();
    expect(result.hospitality_rider).toBeDefined();

    // Wait briefly for tasks to be created
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Query Supabase for tasks created for this artist
    const { data: tasksAfter, error } = await supabase
      .from('tasks')
      .select('id, title, status, priority, artist_id')
      .eq('artist_id', ARTIST_ID)
      .order('created_at', { ascending: false })
      .limit(10);

    expect(error).toBeNull();
    expect(tasksAfter).toBeDefined();

    const newTasksCount = (tasksAfter?.length || 0) - tasksBeforeCount;
    console.log('New tasks created:', newTasksCount);

    // Assert at least 1 task was created (we extract equipment + hospitality = multiple tasks)
    expect(newTasksCount, 'Should have created at least 1 task').toBeGreaterThan(0);

    // Verify task fields are valid
    const latestTask = tasksAfter?.[0];
    if (latestTask) {
      expect(latestTask.title).toBeDefined();
      expect(typeof latestTask.title).toBe('string');
      expect(latestTask.title.length).toBeGreaterThan(0);

      expect(latestTask.status).toMatch(/^(todo|in_progress|review|completed)$/);
      expect(latestTask.priority).toMatch(/^(low|medium|high|urgent)$/);
      expect(latestTask.artist_id).toBe(ARTIST_ID);

      console.log('✓ Latest task:', latestTask.title, `(${latestTask.status}, ${latestTask.priority})`);
    }

    console.log('✓ Full pipeline test passed');
  }, 120000); // 2 minute timeout for API call + DB query
});