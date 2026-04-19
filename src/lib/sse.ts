/** Định dạng một sự kiện Server-Sent Events (RFC-style). */
export function encodeSseEvent(event: string, data: unknown): Uint8Array {
  const payload = JSON.stringify(data);
  const text = `event: ${event}\ndata: ${payload}\n\n`;
  return new TextEncoder().encode(text);
}
