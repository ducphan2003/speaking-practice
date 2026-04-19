'use client';

export type SseHandler = (event: string, data: unknown) => void;

/**
 * Đọc response POST dạng text/event-stream và gọi handler cho từng sự kiện.
 */
export async function readSseResponse(res: Response, onEvent: SseHandler): Promise<void> {
  if (!res.body) {
    throw new Error('Response không có body.');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const flushBlock = (block: string) => {
    const lines = block.split('\n');
    let eventName = 'message';
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    if (dataLines.length === 0) return;
    const dataStr = dataLines.join('\n');
    try {
      const parsed = JSON.parse(dataStr) as unknown;
      onEvent(eventName, parsed);
    } catch {
      onEvent(eventName, dataStr);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';
      for (const block of parts) {
        if (block.trim()) flushBlock(block);
      }
    }
    if (buffer.trim()) {
      flushBlock(buffer);
    }
  } finally {
    reader.releaseLock();
  }
}
