/**
 * Giải mã audio gửi kèm JSON (base64 thuần hoặc data URL).
 */
export function decodeAudioPayload(
  audioBase64: string,
  mimeHint?: string
): { buffer: Buffer; mimeType: string } {
  const trimmed = audioBase64.trim();
  if (trimmed.startsWith('data:')) {
    const match = trimmed.match(/^data:([^;,]+)(?:;[^;,]*)*;base64,(.+)$/s);
    if (!match) {
      throw new Error('Chuỗi audio base64 (data URL) không hợp lệ.');
    }
    return {
      buffer: Buffer.from(match[2].replace(/\s/g, ''), 'base64'),
      mimeType: match[1],
    };
  }
  return {
    buffer: Buffer.from(trimmed.replace(/\s/g, ''), 'base64'),
    mimeType: (mimeHint ?? 'audio/webm').trim() || 'audio/webm',
  };
}

export function extFromMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes('webm')) return 'webm';
  if (m.includes('wav')) return 'wav';
  if (m.includes('mp4') || m.includes('m4a')) return 'm4a';
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  if (m.includes('ogg')) return 'ogg';
  return 'bin';
}
