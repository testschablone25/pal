/**
 * Updated Rider Extraction API
 * Uses hybrid approach: text extraction + vision fallback
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractRiderHybrid, extractWithMethod } from '@/lib/riders/hybrid-extraction';
import { generateRiderTasksForArtist } from '@/lib/riders/task-generation';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234/v1';
const DEFAULT_MODEL = 'google/gemma-4-e2b';
const VISION_MODEL = process.env.VISION_MODEL || 'llava-v1.6-vicuna-7b';

// Extraction prompt
const EXTRACTION_PROMPT = `Extract technical and hospitality rider data from the PDF text.

Return JSON only. No markdown. No commentary.

Schema:
{
  "tech_rider": {
    "equipment": [{ "name": "", "quantity": 1, "artist_brings": false, "notes": "" }],
    "stage_setup": {
      "monitors": [{ "type": "", "quantity": 0, "location": "" }],
      "power": [{ "type": "", "quantity": 0 }],
      "furniture": [{ "type": "", "quantity": 0, "dimensions": "" }]
    },
    "backline": {
      "cdjs": [{ "model": "", "quantity": 0 }],
      "turntables": [{ "model": "", "quantity": 0 }],
      "mixer_minimum_requirements": ""
    },
    "audio": {
      "inputs_needed": 2,
      "monitor_type": "booth",
      "preferred_mixers": [{ "model": "", "required_features": "", "priority": 1 }],
      "special_requirements": ""
    },
    "transport": {
      "flights_needed": false,
      "priority_boarding": false,
      "baggage_requirements": "",
      "origin_city": ""
    },
    "technical_notes": "",
    "referenced_images": [""],
    "performance_requirements": {
      "staff": {
        "sound_tech": false,
        "sound_tech_notes": "",
        "lighting_tech": false,
        "lighting_tech_notes": "",
        "soundcheck_required": false,
        "soundcheck_duration_min": null,
        "set_required": false,
        "specific_time": null,
        "party_mentioned": null
      },
      "stage": {
        "requirements": [""]
      }
    }
  },
  "hospitality_rider": {
    "accommodation": {
      "required": false,
      "nights": 0,
      "room_type": "",
      "check_in": "",
      "check_out": "",
      "location_preference": ""
    },
    "catering": {
      "meals": [""],
      "dietary": [""],
      "drinks": {
        "alcopops": false,
        "spirits": [""],
        "mixers": [""],
        "water": false
      },
      "special_requests": ""
    },
    "transport_ground": {
      "car_service": false,
      "pickup_time": "",
      "pickup_location": "",
      "return_required": false,
      "vehicle_type": ""
    },
    "hospitality_notes": ""
  }
}`;

/**
 * Parse JSON from AI response
 */
function extractJsonFromResponse(content: string): Record<string, unknown> | null {
  if (!content) return null;

  // Try to find JSON in the response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Call LM Studio API for text extraction
 */
async function callLmStudio(
  text: string,
  model: string
): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`${LM_STUDIO_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: text.slice(0, 12000) },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      console.error(`[LM Studio] HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    return extractJsonFromResponse(content);
  } catch (error: any) {
    console.error(`[LM Studio] Error: ${error.message}`);
    return null;
  }
}

/**
 * Call LM Studio API for vision extraction
 */
async function callLmStudioVision(
  imageBase64: string,
  model: string
): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`${LM_STUDIO_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract rider data from this PDF image:' },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 3000,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      console.error(`[LM Studio Vision] HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    return extractJsonFromResponse(content);
  } catch (error: any) {
    console.error(`[LM Studio Vision] Error: ${error.message}`);
    return null;
  }
}

/**
 * Main extraction function with hybrid approach
 */
async function extractRider(buffer: Buffer, method: 'auto' | 'text' | 'vision') {
  const startTime = Date.now();
  let extractionMethod = method;
  let extractedData: Record<string, unknown> | null = null;
  let warnings: string[] = [];

  // Step 1: Try text extraction
  if (method === 'auto' || method === 'text') {
    console.log('[Extract] Trying text extraction...');
    const textResult = await extractRiderHybrid(buffer, {
      lmStudioUrl: LM_STUDIO_URL,
      modelName: DEFAULT_MODEL,
      useVisionFallback: method === 'auto',
    });

    if (textResult.quality !== 'failed') {
      console.log(`[Extract] Text extraction: ${textResult.quality}`);
      extractedData = await callLmStudio(textResult.text, DEFAULT_MODEL);
      extractionMethod = 'text';
      warnings = textResult.warnings;
    }
  }

  // Step 2: If text extraction failed or method is vision, use vision
  if (!extractedData && (method === 'auto' || method === 'vision')) {
    console.log('[Extract] Text extraction failed, trying vision...');
    extractionMethod = 'vision';

    // Render PDF to image
    const { renderPdfToImages } = await import('@/lib/riders/pdf-to-image');
    const pages = await renderPdfToImages(buffer, { scale: 2.0, maxPages: 1 });

    if (pages.length > 0) {
      console.log('[Extract] Calling vision model...');
      extractedData = await callLmStudioVision(pages[0].imageData, VISION_MODEL);
      warnings.push('Extracted using vision model');
    } else {
      warnings.push('Could not render PDF to image');
    }
  }

  const duration = Date.now() - startTime;

  return {
    extractedData,
    method: extractionMethod,
    duration,
    warnings,
  };
}

/**
 * GET - Check extraction status
 */
export async function GET() {
  try {
    const response = await fetch(`${LM_STUDIO_URL}/models`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json({
        status: 'disconnected',
        message: 'LM Studio not running',
      });
    }

    const data = await response.json();
    const models = Array.isArray(data.data) ? data.data.map((m: any) => m.id) : [];

    return NextResponse.json({
      status: 'connected',
      models,
      defaultModel: DEFAULT_MODEL,
      visionModel: VISION_MODEL,
    });
  } catch {
    return NextResponse.json({
      status: 'disconnected',
      message: 'LM Studio not accessible',
    });
  }
}

/**
 * POST - Extract rider from PDF
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const artistId = formData.get('artist_id');
    const riderType = formData.get('rider_type');
    const eventId = formData.get('event_id');
    const method = formData.get('method') || 'auto'; // 'auto', 'text', or 'vision'

    if (!(file instanceof File) || typeof artistId !== 'string') {
      return NextResponse.json(
        { error: 'Missing file or artist_id' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    console.log(`[API] Processing: ${file.name} (method: ${method})`);

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract rider data
    const { extractedData, method: usedMethod, duration, warnings } = await extractRider(
      buffer,
      method as any
    );

    if (!extractedData) {
      return NextResponse.json(
        { error: 'Failed to extract rider data', warnings },
        { status: 500 }
      );
    }

    // Update artist record
    const updateData: Record<string, unknown> = {};
    if (riderType === 'tech' || riderType === 'both') {
      updateData.tech_rider = (extractedData as any).tech_rider;
    }
    if (riderType === 'hospitality' || riderType === 'both' || !riderType) {
      updateData.hospitality_rider = (extractedData as any).hospitality_rider;
    }

    // Add document to artist's documents
    const { data: artist } = await supabase
      .from('artists')
      .select('documents, tech_rider, hospitality_rider')
      .eq('id', artistId)
      .single();

    const documents = Array.isArray(artist?.documents) ? [...artist.documents] : [];

    if (artist?.tech_rider || artist?.hospitality_rider) {
      documents.push({
        name: `Rider Archive - ${new Date().toISOString().split('T')[0]}`,
        type: 'archived_rider',
        archived_at: new Date().toISOString(),
        tech_rider: artist.tech_rider,
        hospitality_rider: artist.hospitality_rider,
      });
    }

    documents.push({
      name: file.name,
      type: 'rider',
      uploaded_at: new Date().toISOString(),
    });
    updateData.documents = documents;

    const { error: updateError } = await supabase
      .from('artists')
      .update(updateData)
      .eq('id', artistId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to save rider: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Generate tasks
    let tasksCreated = 0;
    let taskEvents: any[] = [];
    let taskWarnings: string[] = [];

    try {
      const taskResult = await generateRiderTasksForArtist(
        supabase,
        artistId,
        typeof eventId === 'string' ? eventId : undefined
      );
      tasksCreated = taskResult.tasks_created;
      taskEvents = taskResult.events;
      taskWarnings = taskResult.warnings;
    } catch (taskError: any) {
      console.error('[Tasks] Generation failed:', taskError.message);
      taskWarnings.push('Rider saved, but automatic task generation failed');
    }

    return NextResponse.json({
      success: true,
      extractionMethod: usedMethod,
      durationMs: duration,
      tech_rider: (extractedData as any).tech_rider,
      hospitality_rider: (extractedData as any).hospitality_rider,
      tasks_created: tasksCreated,
      task_events: taskEvents,
      warnings: [...warnings, ...taskWarnings],
    });
  } catch (error: any) {
    console.error('[API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
