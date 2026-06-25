import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

type SaveConceptRequestBody = {
  subject?: unknown;
  concept?: unknown;
  masteryLevel?: unknown;
  overviewGist?: unknown;
  deepDiveGist?: unknown;
  strongAreas?: unknown;
  weakAreas?: unknown;
  nextSteps?: unknown;
  notes?: unknown;
};

type SaveConceptResponse = {
  success: boolean;
  message: string;
};

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as SaveConceptRequestBody | null;

    const subject = normalizeString(body?.subject);
    const concept = normalizeString(body?.concept);

    if (!subject || !concept) {
      return NextResponse.json<SaveConceptResponse>({ success: false, message: 'subject and concept are required.' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json<SaveConceptResponse>({ success: false, message: 'Supabase client is not configured.' }, { status: 500 });
    }

    const payload = {
      subject,
      concept,
      mastery_level: normalizeString(body?.masteryLevel),
      overview_gist: normalizeString(body?.overviewGist),
      deep_dive_gist: normalizeArray(body?.deepDiveGist),
      strong_areas: normalizeArray(body?.strongAreas),
      weak_areas: normalizeArray(body?.weakAreas),
      next_steps: normalizeArray(body?.nextSteps),
      notes: normalizeString(body?.notes),
      last_updated: new Date().toISOString(),
    };

    const { error } = await supabase.from('concepts').upsert(payload, {
      onConflict: 'subject,concept',
    });

    if (error) {
      console.error('Failed to save concept', error);
      return NextResponse.json<SaveConceptResponse>({ success: false, message: 'Failed to save concept.' }, { status: 500 });
    }

    return NextResponse.json<SaveConceptResponse>({ success: true, message: 'Concept saved successfully.' });
  } catch (error) {
    console.error('Save concept route failed', error);
    return NextResponse.json<SaveConceptResponse>({ success: false, message: 'Failed to save concept.' }, { status: 500 });
  }
}
