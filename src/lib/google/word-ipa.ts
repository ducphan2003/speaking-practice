import { generateText } from './gemini';

/**
 * IPA tiếng Anh (Mỹ) — không có API Google chuyên IPA; dùng Gemini (Google AI).
 */
export async function generateEnglishWordIpa(word: string): Promise<string | null> {
  const w = word.trim();
  if (!w) return null;
  const raw = await generateText(
    `English headword: ${JSON.stringify(w)}\n` +
      `Reply with ONLY the American English IPA between slashes, e.g. /həˈloʊ/. One line. No explanation.`
  );
  const m = raw.match(/\/[^/\n]+\//);
  if (m) return m[0].trim();
  const t = raw.replace(/^[\s"'`]+|[\s"'`]+$/g, '').trim();
  return t.length > 0 && t.length < 120 ? t : null;
}
