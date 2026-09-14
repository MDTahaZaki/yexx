// Every write route reads its body through this instead of
// `request.json()` directly — a plain `request.json()` buffers the
// entire body no matter how large, so a POST with a multi-megabyte
// payload still costs full parse time/memory before any Zod schema gets
// a chance to reject it. This aborts the read as soon as the byte cap is
// exceeded, streaming rather than buffering-then-checking.
const DEFAULT_MAX_BYTES = 10_000; // 10 KB — every schema in this app is well under this

export async function readJsonBody(request: Request, maxBytes = DEFAULT_MAX_BYTES): Promise<unknown | null> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) return null;

  const reader = request.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }

  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(combined));
  } catch {
    return null;
  }
}
