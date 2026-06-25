import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

function isAnthropicAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message?.toLowerCase() ?? '';
  return message.includes('api key') || message.includes('authentication') || message.includes('anthropic');
}

type DetectConceptRequestBody = {
  userMessage?: unknown;
};

type DetectConceptResponse = {
  subject: string;
  concept: string;
};

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as DetectConceptRequestBody | null;
    const userMessage = normalizeText(body?.userMessage);

    if (!userMessage) {
      return NextResponse.json<DetectConceptResponse>({ subject: '', concept: '' }, { status: 400 });
    }

    const prompt = `Extract the study subject and concept from the following message. If the message is not about studying a concept, return empty strings for both fields.

Return ONLY valid JSON in this exact shape:
{"subject":"","concept":""}

Message:
${userMessage}`;

    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-5'),
      prompt,
    });

    let parsed: DetectConceptResponse = { subject: '', concept: '' };

    try {
      parsed = JSON.parse(text);
    } catch {
      const fallbackMatch = text.match(/"subject"\s*:\s*"([^"]*)"[\s\S]*"concept"\s*:\s*"([^"]*)"/i);
      if (fallbackMatch) {
        parsed = {
          subject: fallbackMatch[1] ?? '',
          concept: fallbackMatch[2] ?? '',
        };
      }
    }

    return NextResponse.json<DetectConceptResponse>({
      subject: typeof parsed.subject === 'string' ? parsed.subject : '',
      concept: typeof parsed.concept === 'string' ? parsed.concept : '',
    });
  } catch (error) {
    console.error('Concept detection failed', error);

    if (isAnthropicAuthError(error)) {
      return NextResponse.json<DetectConceptResponse>({ subject: '', concept: '' }, { status: 200 });
    }

    return NextResponse.json<DetectConceptResponse>({ subject: '', concept: '' }, { status: 500 });
  }
}
