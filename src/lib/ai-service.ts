import {
  conversationMessagesToGeminiTurns,
  evaluatePracticeReadingFromAudio,
  evaluateSpeakingPair,
  generateAnswerHint,
  generateChatReply,
  normalizeTranscriptText,
  synthesizeSpeech,
  type SpeakingEvaluationResult,
} from '@/lib/google';
import { uploadAudioToR2 } from '@/lib/r2';

const ERROR_TYPES = new Set(['PRONUNCIATION', 'GRAMMAR', 'VOCAB']);

/** Bỏ qua lỗi chỉ là viết hoa / dấu câu cuối (văn bản nói thường thiếu). */
function isCosmeticGrammarOnly(d: {
  error_type?: string;
  word?: string;
  correction?: string;
}): boolean {
  if (d.error_type !== 'GRAMMAR') return false;
  const w = typeof d.word === 'string' ? d.word.trim() : '';
  const c = typeof d.correction === 'string' ? d.correction.trim() : '';
  if (!w || !c) return false;
  if (w.toLowerCase() === c.toLowerCase()) return true;
  const stripTrailingPunct = (s: string) => s.replace(/[.?!,;:]+$/g, '').trim();
  if (stripTrailingPunct(w).toLowerCase() === stripTrailingPunct(c).toLowerCase()) return true;
  return false;
}

function sanitizeEvaluation(e: SpeakingEvaluationResult) {
  const details = (e.details ?? [])
    .filter((d) => !isCosmeticGrammarOnly(d))
    .map((d) => ({
      ...d,
      error_type: ERROR_TYPES.has(d.error_type) ? d.error_type : 'GRAMMAR',
    }));
  return {
    pronunciation_score: Math.max(0, Math.min(100, Math.round(e.pronunciation_score))),
    grammar_score: Math.max(0, Math.min(100, Math.round(e.grammar_score))),
    details,
  };
}

export async function normalizeTranscript(transcript: string): Promise<string> {
  return normalizeTranscriptText(transcript);
}

export async function evaluateSpeaking(original: string, normalized: string) {
  const raw = await evaluateSpeakingPair(original, normalized);
  return sanitizeEvaluation(raw);
}

/** Luyện đọc: chấm từ âm thanh + câu mẫu (Gemini). */
export async function evaluatePracticeReading(input: {
  targetText: string;
  audioBuffer: Buffer;
  audioMimeType: string;
  transcriptHint?: string;
}) {
  const raw = await evaluatePracticeReadingFromAudio(input);
  return sanitizeEvaluation(raw);
}

export async function generateAIReply(
  context: Array<{ sender: string; content: string }>,
  _newNormalizedMessage: string,
  personaPrompt: string
): Promise<string> {
  const turns = conversationMessagesToGeminiTurns(context);
  const last = turns[turns.length - 1];
  if (!last || last.role !== 'user') {
    throw new Error('Lịch sử hội thoại phải kết thúc bằng tin nhắn người dùng.');
  }
  return generateChatReply(turns, personaPrompt || undefined);
}

export async function generateHint(context: Array<{ sender: string; content: string }>): Promise<string> {
  const lines = context
    .map((m) => `${m.sender}: ${m.content}`)
    .join('\n');
  return generateAnswerHint(lines);
}

export async function textToSpeech(text: string): Promise<string> {
  const { audioContent, mimeType } = await synthesizeSpeech({ text });
  const fileName = `tts/${Date.now()}.mp3`;
  return uploadAudioToR2(audioContent, fileName, mimeType);
}
