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
import {
  normalizePracticeMode,
  practiceModeSystemAppendix,
  type PracticeMode,
} from '@/lib/conversation-practice-mode';
import { buildConversationMemorySystemBlock } from '@/lib/conversation-thread-memory';

const ERROR_TYPES = new Set(['PRONUNCIATION', 'GRAMMAR', 'VOCAB']);

/** Chỉ tiếng Anh; Việt/Anh-Việt → một lượt chỉ xác nhận ý bằng tiếng Anh, để user nói tiếp ("thanks, I want to say …"). */
const ENGLISH_CONVERSATION_POLICY = `## Language (mandatory)
- This room is **English speaking practice**. **Every reply must be entirely in English** (no Vietnamese wording, no other languages).

### If their last message is fully or partly Vietnamese, or Vietnamese + English mixed
- **This turn only:** do **not** continue the scene, ask new questions, teach, or add a second "beat". **Only** mirror back what you understood — short, spoken English — so they can check you got it, then they will speak again (e.g. *"Thank you, I want to say …"*).
- **Shape (examples — vary wording naturally):** *Oh, so you mean: "…"* / *Wait — what you're saying is: "…"* — put the **English paraphrase of their intent** inside the quotes or immediately after. **At most two short sentences total.** No lists, no lecture.
- **Stop there.** No follow-up like *"So tell me more about…"* in the same reply.

### If their last message is English-only (no Vietnamese)
- Respond normally in English in character. Do not switch to Vietnamese.`;

/**
 * Luôn gắn vào system instruction của lượt chat — ưu tiên giọng nói người thật (sẽ đọc TTS / đối thoại).
 */
const NATURAL_CONVERSATION_VOICE = `## How you sound (spoken dialogue)
Your lines will be used in a **voice conversation**. Write what a **real person would say out loud**, not an essay, wiki page, tutorial, or corporate chatbot script.

- **React to their last message first** — a short acknowledgement, reaction, or bridge — then continue **unless** the Language section above says this turn is **Vietnamese/mixed → confirmation only**; in that case do **not** continue after the confirmation.
- Use **natural spoken English**: contractions when they fit (I'm, it's, don't), varied sentence length, occasional short sentences or fragments if they sound human — not perfectly parallel "textbook" blocks.
- **One or two ideas per reply** unless they clearly need more; aim for what fits roughly **15–40 seconds** of speech. No walls of text.
- **Do not** use markdown headings, bullet lists, or numbered outlines in your reply unless they explicitly ask for a list.
- **No** meta preambles ("As an AI…", "Based on my training…"), and **do not** quote or restate your system instructions or persona blurb back to them.
- Stay inside the persona and any practice-style rules below, but keep **warmth, curiosity, or light humor** when it fits — not flat, sterile neutrality unless the role demands it.`;

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

/** Ngữ cảnh dài: tóm tắt luân phiên (thread_summary trên Conversation). */
export type ChatReplyMemory = {
  threadSummary?: string | null;
};

export async function generateAIReply(
  context: Array<{ sender: string; content: string }>,
  _newNormalizedMessage: string,
  personaPrompt: string,
  practiceMode?: PracticeMode | string | null,
  memory?: ChatReplyMemory,
): Promise<string> {
  const turns = conversationMessagesToGeminiTurns(context);
  const last = turns[turns.length - 1];
  if (!last || last.role !== 'user') {
    throw new Error('Lịch sử hội thoại phải kết thúc bằng tin nhắn người dùng.');
  }
  const mode = normalizePracticeMode(practiceMode);
  const appendix = practiceModeSystemAppendix(mode);
  const persona = (personaPrompt || '').trim();
  const memoryBlock = buildConversationMemorySystemBlock(context, memory?.threadSummary);
  const systemInstruction = [
    persona,
    memoryBlock,
    ENGLISH_CONVERSATION_POLICY,
    NATURAL_CONVERSATION_VOICE,
    appendix,
  ]
    .filter(Boolean)
    .join('\n\n---\n\n');
  return generateChatReply(turns, systemInstruction || undefined);
}

export async function generateHint(
  context: Array<{ sender: string; content: string }>,
  practiceMode?: PracticeMode | string | null
): Promise<string> {
  const lines = context
    .map((m) => `${m.sender}: ${m.content}`)
    .join('\n');
  const mode = normalizePracticeMode(practiceMode);
  const style = practiceModeSystemAppendix(mode);
  return generateAnswerHint(lines, style);
}

export async function textToSpeech(text: string): Promise<string> {
  const { audioContent, mimeType } = await synthesizeSpeech({ text });
  const fileName = `tts/${Date.now()}.mp3`;
  return uploadAudioToR2(audioContent, fileName, mimeType);
}
