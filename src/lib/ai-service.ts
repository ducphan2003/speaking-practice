import {
  conversationMessagesToGeminiTurns,
  evaluateSpeakingPair,
  generateAnswerHint,
  generateChatReply,
  normalizeTranscriptText,
  synthesizeSpeech,
} from '@/lib/google';
import { uploadAudioToR2 } from '@/lib/r2';

const ERROR_TYPES = new Set(['PRONUNCIATION', 'GRAMMAR', 'VOCAB']);

function sanitizeEvaluation(e: Awaited<ReturnType<typeof evaluateSpeakingPair>>) {
  return {
    pronunciation_score: Math.max(0, Math.min(100, Math.round(e.pronunciation_score))),
    grammar_score: Math.max(0, Math.min(100, Math.round(e.grammar_score))),
    details: (e.details ?? []).map((d) => ({
      ...d,
      error_type: ERROR_TYPES.has(d.error_type) ? d.error_type : 'GRAMMAR',
    })),
  };
}

export async function normalizeTranscript(transcript: string): Promise<string> {
  return normalizeTranscriptText(transcript);
}

export async function evaluateSpeaking(original: string, normalized: string) {
  const raw = await evaluateSpeakingPair(original, normalized);
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
