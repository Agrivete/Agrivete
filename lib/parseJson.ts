import { NextRequest, NextResponse } from 'next/server';

const MAX_BODY_SIZE = 1024 * 1024; // 1MB

export async function parseJsonBody(req: NextRequest): Promise<{ data?: unknown; error?: NextResponse }> {
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return {
      error: NextResponse.json({ error: 'Request body too large' }, { status: 413 }),
    };
  }

  const reader = req.body?.getReader();
  if (!reader) {
    return { data: {} };
  }

  const chunks: Uint8Array[] = [];
  let totalSize = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    totalSize += value.length;

    if (totalSize > MAX_BODY_SIZE) {
      return {
        error: NextResponse.json({ error: 'Request body too large' }, { status: 413 }),
      };
    }
  }

  const body = Buffer.concat(chunks).toString('utf-8');
  if (!body) return { data: {} };

  try {
    return { data: JSON.parse(body) };
  } catch {
    return {
      error: NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }),
    };
  }
}

export { parseJsonBody as parseJson };

export function withJsonBodyLimit(
  handler: (req: NextRequest, body: unknown) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const { data, error } = await parseJsonBody(req);
    if (error) return error;
    return handler(req, data);
  };
}