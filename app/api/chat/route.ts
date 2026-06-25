import { anthropic } from '@ai-sdk/anthropic';
import { createClient } from '@supabase/supabase-js';
import { streamText } from 'ai';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

type ChatRequestBody = {
  userMessage?: unknown;
  subject?: unknown;
  concept?: unknown;
};

type ConceptRow = {
  subject?: string | null;
  concept?: string | null;
  mastery_level?: string | null;
  weak_areas?: string[] | string | null;
  strong_areas?: string[] | string | null;
};

function isAnthropicAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message?.toLowerCase() ?? '';
  return message.includes('api key') || message.includes('authentication') || message.includes('anthropic');
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function formatAreas(areas: unknown): string {
  if (Array.isArray(areas)) {
    return areas.filter(Boolean).join(', ');
  }

  if (typeof areas === 'string') {
    return areas.trim();
  }

  return '';
}

async function findConceptRow(subject: string, concept: string): Promise<ConceptRow | null> {
  if (!supabase || !subject || !concept) {
    return null;
  }

  const { data, error } = await supabase
    .from('concepts')
    .select('*')
    .eq('subject', subject)
    .eq('concept', concept)
    .maybeSingle<ConceptRow>();

  if (error) {
    console.error('Supabase concept lookup failed', error);
    return null;
  }

  return data ?? null;
}

function buildSystemPrompt(options: {
  subject: string;
  concept: string;
  userMessage: string;
  conceptRow: ConceptRow | null;
}): string {
  const { subject, concept, userMessage, conceptRow } = options;
  const weakAreas = formatAreas(conceptRow?.weak_areas);
  const strongAreas = formatAreas(conceptRow?.strong_areas);
  const masteryLevel = conceptRow?.mastery_level?.trim();

  const contextLines = [
    'You are a patient, adaptive tutor helping a learner understand a concept clearly.',
    `The learner is asking about ${subject || 'the requested topic'} and ${concept || 'the requested concept'}.`,
  ];

  if (conceptRow) {
    contextLines.push(`The learner's known mastery level for this concept is ${masteryLevel || 'unknown'}.`);
  }

  let modeInstruction =
    'Mode A: Begin with beginner-friendly language, use analogies first, define all key terms, and keep explanations approachable.';

  if (conceptRow) {
    if (masteryLevel === 'Introduced' || masteryLevel === 'Developing') {
      modeInstruction =
        'Mode B: Assume the learner has some prior knowledge, reference it explicitly, mention weak areas clearly, and keep a moderate pace.';
    } else if (masteryLevel === 'Proficient' || masteryLevel === 'Strong') {
      modeInstruction =
        'Mode C: Use a technical tone, skip basic definitions unless they are essential, and focus on nuance, tradeoffs, and deeper implications.';
    }
  }

  contextLines.push(modeInstruction);

  if (weakAreas) {
    contextLines.push(`Weak areas to address: ${weakAreas}.`);
  }

  if (strongAreas) {
    contextLines.push(`Strong areas to build on: ${strongAreas}.`);
  }

  if (!conceptRow) {
    contextLines.push('No prior concept profile was found, so default to a beginner-friendly explanation.');
  }

  contextLines.push(
    'Answer the learner directly, stay focused on the question, and avoid unnecessary jargon unless the mode calls for it.',
  );

  if (userMessage) {
    contextLines.push(`Learner message: ${userMessage}`);
  }

  return contextLines.join('\n');
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as ChatRequestBody | null;
    const userMessage = normalizeText(body?.userMessage);
    const subject = normalizeText(body?.subject);
    const concept = normalizeText(body?.concept);

    if (!userMessage) {
      return NextResponse.json({ error: 'userMessage is required.' }, { status: 400 });
    }

    const conceptRow = subject && concept ? await findConceptRow(subject, concept) : null;
    const systemPrompt = buildSystemPrompt({
      subject,
      concept,
      userMessage,
      conceptRow,
    });

    const result = streamText({
      model: anthropic('claude-sonnet-4-5'),
      system: systemPrompt,
      prompt: userMessage,
    });

    const response = result.toTextStreamResponse();

    return new NextResponse(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    console.error('Chat route failed', error);

    if (isAnthropicAuthError(error)) {
      return NextResponse.json(
        {
          error: 'AI service is unavailable right now. Please add a valid Anthropic API key to continue.',
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: 'Failed to generate response.' }, { status: 500 });
  }
}
