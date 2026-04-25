import { parseForm, toJsonSchema, toMarkdownSpec } from '@formless/core';
import { NextRequest, NextResponse } from 'next/server';

type ApiFormat = 'json' | 'md' | 'both';

interface ParseRequestBody {
  url?: unknown;
  format?: unknown;
}

interface RateWindow {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const LIMIT = 30;

const globalRateStore = globalThis as typeof globalThis & {
  __formlessRateStore?: Map<string, RateWindow>;
};

const rateStore = globalRateStore.__formlessRateStore ?? new Map<string, RateWindow>();
if (!globalRateStore.__formlessRateStore) {
  globalRateStore.__formlessRateStore = rateStore;
}

export async function POST(request: NextRequest) {
  const ip = getIpAddress(request);
  if (!allowRequest(ip)) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded: max 30 requests per minute.'
      },
      {
        status: 429
      }
    );
  }

  let body: ParseRequestBody;
  try {
    body = (await request.json()) as ParseRequestBody;
  } catch {
    return NextResponse.json(
      {
        error: 'Invalid JSON body.'
      },
      {
        status: 400
      }
    );
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const format = normalizeFormat(body.format);
  if (!url) {
    return NextResponse.json(
      {
        error: 'The url field is required.'
      },
      {
        status: 400
      }
    );
  }

  try {
    const parsed = await parseForm(url);
    const jsonSchema = format === 'md' ? undefined : toJsonSchema(parsed);
    const markdown = format === 'json' ? undefined : toMarkdownSpec(parsed);
    const fieldCount = parsed.fields.filter((field) => !field.hidden).length;

    return NextResponse.json({
      jsonSchema,
      markdown,
      meta: {
        platform: parsed.platform,
        fieldCount,
        parsedAt: parsed.parsedAt
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected parse error';
    return NextResponse.json(
      {
        error: message
      },
      {
        status: 400
      }
    );
  }
}

function normalizeFormat(raw: unknown): ApiFormat {
  if (raw === 'json' || raw === 'md' || raw === 'both') {
    return raw;
  }

  return 'json';
}

function getIpAddress(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (!forwarded) {
    return 'local';
  }

  const first = forwarded.split(',')[0]?.trim();
  return first || 'local';
}

function allowRequest(ip: string): boolean {
  const now = Date.now();
  const current = rateStore.get(ip);

  if (!current || current.resetAt <= now) {
    rateStore.set(ip, {
      count: 1,
      resetAt: now + WINDOW_MS
    });
    pruneExpiredWindows(now);
    return true;
  }

  if (current.count >= LIMIT) {
    return false;
  }

  current.count += 1;
  return true;
}

function pruneExpiredWindows(now: number): void {
  for (const [key, value] of rateStore.entries()) {
    if (value.resetAt <= now) {
      rateStore.delete(key);
    }
  }
}