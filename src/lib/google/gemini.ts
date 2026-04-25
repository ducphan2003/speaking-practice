import {
  Content,
  GoogleGenerativeAI,
  SchemaType,
  type GenerativeModel,
  type ModelParams,
  type Schema,
} from '@google/generative-ai';
import { getGeminiApiKey } from './config';
import { AI_STEP_KEYS, type AiStepKey } from '@/lib/ai-step-keys';
import { resolveGeminiModelForStep } from '@/lib/master-config';

/** MIME an toàn cho inline audio (bỏ tham số codec sau `;`). */
function normalizeAudioMimeType(mime: string): string {
  return mime.split(';')[0]!.trim().toLowerCase();
}

let genAiSingleton: GoogleGenerativeAI | null = null;

function getGoogleGenerativeAI(): GoogleGenerativeAI {
  if (!genAiSingleton) {
    genAiSingleton = new GoogleGenerativeAI(getGeminiApiKey());
  }
  return genAiSingleton;
}

async function getGenerativeModelForStep(
  stepKey: AiStepKey,
  params?: Omit<ModelParams, 'model'>
): Promise<GenerativeModel> {
  const modelName = await resolveGeminiModelForStep(stepKey);
  return getGoogleGenerativeAI().getGenerativeModel({
    model: modelName,
    ...params,
  });
}

/** Tin nhắn hội thoại cho Gemini (role user | model) */
export type GeminiChatTurn = { role: 'user' | 'model'; text: string };

function toContents(turns: GeminiChatTurn[]): Content[] {
  return turns.map((t) => ({
    role: t.role,
    parts: [{ text: t.text }],
  }));
}

/**
 * Trả lời một lượt chat: `turns` phải kết thúc bằng tin user; model trả lời tiếp.
 */
export async function generateChatReply(
  turns: GeminiChatTurn[],
  systemInstruction?: string
): Promise<string> {
  if (turns.length === 0) {
    throw new Error('generateChatReply: cần ít nhất một lượt.');
  }
  const last = turns[turns.length - 1];
  if (last.role !== 'user') {
    throw new Error('generateChatReply: lượt cuối phải là user.');
  }

  const model = await getGenerativeModelForStep(AI_STEP_KEYS.CHAT_REPLY, {
    systemInstruction,
  });
  const history = toContents(turns.slice(0, -1));
  const chat = model.startChat({ history });
  const result = await chat.sendMessage(last.text);
  const text = result.response.text();
  return text.trim();
}

/**
 * Stream một lượt trả lời (dùng cho UI gõ dần).
 */
export async function streamChatReply(
  turns: GeminiChatTurn[],
  systemInstruction?: string
) {
  if (turns.length === 0) {
    throw new Error('streamChatReply: cần ít nhất một lượt.');
  }
  const last = turns[turns.length - 1];
  if (last.role !== 'user') {
    throw new Error('streamChatReply: lượt cuối phải là user.');
  }

  const model = await getGenerativeModelForStep(AI_STEP_KEYS.CHAT_REPLY, {
    systemInstruction,
  });
  const history = toContents(turns.slice(0, -1));
  const chat = model.startChat({ history });
  return chat.sendMessageStream(last.text);
}

/**
 * Một prompt đơn (không lưu history phía SDK).
 */
export async function generateText(prompt: string): Promise<string> {
  const model = await getGenerativeModelForStep(AI_STEP_KEYS.GENERIC_TEXT);
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

const MAX_THREAD_SUMMARY_CHARS = 14_000;

/**
 * Cập nhật tóm tắt luân phiên: tóm tắt trước + 10 dòng USER/AI + mô tả ngữ cảnh.
 */
export async function summarizeDialogueWindow(input: {
  briefDescription: string;
  previousSummary: string | null | undefined;
  lastTenMessages: Array<{ sender: string; content: string }>;
}): Promise<string> {
  const prev =
    input.previousSummary && input.previousSummary.trim().length > 0
      ? input.previousSummary.trim()
      : '(No previous summary — this is the first 10-message chunk.)';
  const transcript = input.lastTenMessages
    .map((m) => `${m.sender}: ${m.content}`)
    .join('\n');
  const prompt = `You maintain a **rolling English summary** of a speaking-practice chat (learner USER lines vs AI tutor/partner).

## What this conversation is about (for orientation)
${input.briefDescription.trim()}

## Previous cumulative summary
${prev}

## Latest 10 lines (5 USER + 5 AI), chronological
${transcript}

Write ONE updated **cumulative** summary in English that merges the previous summary with what happens in these 10 lines. Be concise but information-dense (aim under ~600 words). Continuous prose — no markdown headings, no bullet list unless absolutely necessary. Capture: topics, tone, recurring mistakes, vocabulary worth remembering, open questions, and anything that helps the AI stay coherent in the next turns.

Output ONLY the new summary text — no preamble, no wrapping quotes.`;

  const out = await generateText(prompt);
  return out.slice(0, MAX_THREAD_SUMMARY_CHARS);
}

const evaluationSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    pronunciation_score: { type: SchemaType.NUMBER },
    grammar_score: { type: SchemaType.NUMBER },
    details: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          error_type: { type: SchemaType.STRING },
          word: { type: SchemaType.STRING },
          correction: { type: SchemaType.STRING },
          explanation: { type: SchemaType.STRING },
        },
        required: ['error_type', 'word', 'correction', 'explanation'],
      },
    },
  },
  required: ['pronunciation_score', 'grammar_score', 'details'],
};

export type SpeakingEvaluationResult = {
  pronunciation_score: number;
  grammar_score: number;
  details: Array<{
    error_type: string;
    word: string;
    correction: string;
    explanation: string;
  }>;
};

export async function evaluateSpeakingPair(
  original: string,
  normalized: string
): Promise<SpeakingEvaluationResult> {
  const modelName = await resolveGeminiModelForStep(AI_STEP_KEYS.EVALUATE_SPEAKING);
  const model = getGoogleGenerativeAI().getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: evaluationSchema,
      temperature: 0.3,
    },
  });

  const prompt = `You are an English speaking coach. Compare the learner's RAW speech transcript with the TARGET text.

Raw transcript (speech-to-text; often lowercase and without final punctuation): ${JSON.stringify(original)}
Target sentence: ${JSON.stringify(normalized)}

## pronunciation_score (0–100) — use a STRICT scale
- Be demanding: this reflects how well what they said matches the target in words and clarity. Mis-heard words, missing words, or extra wrong words must lower the score sharply.
- Do NOT give 90+ unless the transcript substantially matches the target (same main words, same idea) and there is no sign of major mispronunciation or omission.
- 95–100: essentially full match to target wording; minor STT quirks only.
- 75–94: understandable but noticeable gaps (wrong/missing words, unclear chunks).
- Below 75: large mismatch, many wrong or missing words, or largely unintelligible vs target.
- Spoken English rarely needs a "perfect" 100 unless the raw text aligns very closely with the target.

## grammar_score (0–100)
- Score meaningful grammar: tense, agreement, word order, missing articles/auxiliaries, wrong word forms when they change meaning.
- IGNORE completely — do NOT list these in "details" and do NOT lower grammar_score for these alone:
  - Capitalization (e.g. "hello" vs "Hello" at the start of a sentence)
  - Missing or different terminal punctuation only (. ? !) when the words otherwise match the target
  - Comma placement or minor punctuation that does not change meaning
  - STT spacing or hyphen quirks

## details
- Each item: error_type must be exactly one of: PRONUNCIATION, GRAMMAR, VOCAB.
- NEVER emit an item whose only issue is capitalization or sentence-final punctuation.
- PRONUNCIATION: wrong or unclear words vs target, missing spoken words, substitutions that sound like mispronunciation.
- GRAMMAR / VOCAB: real mistakes in structure or word choice (not cosmetic).

Return JSON only, matching the schema.`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  return JSON.parse(raw) as SpeakingEvaluationResult;
}

/**
 * Luyện đọc: chấm từ file âm thanh + câu mẫu (không chấm chỉ từ text).
 * Model lấy từ `master_configs` key `ai_step_evaluate_practice_reading` (vd. gemini-2.5-flash-lite).
 */
export async function evaluatePracticeReadingFromAudio(input: {
  targetText: string;
  audioBuffer: Buffer;
  audioMimeType: string;
  /** Bản ghi Web Speech phía client — chỉ gợi ý, không dùng làm nguồn chấm điểm chính. */
  transcriptHint?: string;
}): Promise<SpeakingEvaluationResult> {
  const modelName = await resolveGeminiModelForStep(AI_STEP_KEYS.EVALUATE_PRACTICE_READING);
  const model = getGoogleGenerativeAI().getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: evaluationSchema,
      temperature: 0.3,
    },
  });

  const mime = normalizeAudioMimeType(input.audioMimeType);
  const base64 = input.audioBuffer.toString('base64');

  const hint = input.transcriptHint?.trim();
  const hintBlock =
    hint &&
    !hint.startsWith('(No speech detected') &&
    hint.length > 0
      ? `\nOptional browser speech-to-text caption (often incomplete or wrong — do NOT score from this alone; rely on the audio): ${JSON.stringify(hint)}\n`
      : '';

  const prompt = `You are an English speaking coach. The learner recorded themselves reading a sentence aloud. Use the ATTACHED AUDIO as the only ground truth for how they spoke.

TARGET sentence they were asked to read (compare against this):
${JSON.stringify(input.targetText.trim())}
${hintBlock}
## How to score
- **pronunciation_score (0–100), STRICT:** Judge from the audio only — clarity, word stress, intonation, fluency, and how closely the *spoken* content matches the target (missing words, wrong words, slurred sounds). Do not infer from optional captions.
- **grammar_score (0–100):** Meaningful spoken grammar vs the target (tense, agreement, word order, missing function words). IGNORE: capitalization only; sentence-final punctuation only; STT quirks.

## details
- error_type: exactly PRONUNCIATION, GRAMMAR, or VOCAB.
- Ground every item in what you **hear** in the audio.
- NEVER add items that are only capitalization or final punctuation fixes.

Return JSON only, matching the schema.`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType: mime, data: base64 } },
  ]);
  const raw = result.response.text();
  return JSON.parse(raw) as SpeakingEvaluationResult;
}

export async function normalizeTranscriptText(raw: string): Promise<string> {
  const model = await getGenerativeModelForStep(AI_STEP_KEYS.NORMALIZE_TRANSCRIPT);
  const prompt = `Rewrite the following English learner transcript into clear, grammatical English that preserves the intended meaning. Output ONLY the rewritten sentence(s), no quotes or explanation.

Transcript: ${JSON.stringify(raw)}`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

const hintSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    hint: { type: SchemaType.STRING },
  },
  required: ['hint'],
};

export async function generateAnswerHint(
  conversationSummary: string,
  practiceStyleGuidance?: string
): Promise<string> {
  const modelName = await resolveGeminiModelForStep(AI_STEP_KEYS.HINT);
  const model = getGoogleGenerativeAI().getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: hintSchema,
      temperature: 0.6,
    },
  });

  const styleBlock =
    typeof practiceStyleGuidance === 'string' && practiceStyleGuidance.trim().length > 0
      ? `\n\nPractice-style constraints (the learner chose this mode — follow when shaping vocabulary, formality, and how "exam-like" or casual the reply is):\n${practiceStyleGuidance.trim()}`
      : '';

  const prompt = `Given this English conversation context, write ONE complete sample reply the learner could say next — phrasing they could **say out loud** naturally, not stiff essay English. The sample must be **entirely in English** (English practice app). If the last user line was partly or fully Vietnamese, the natural next line is often short acknowledgment + continuing in English, e.g. *"Thanks — I mean …"* or *"Thank you, I want to say …"* followed by their idea in English.

Requirements:
- A single coherent answer (not bullet points, not multiple alternatives).
- About 30–40 words total.
- Sound like a real person speaking: contractions OK, avoid robotic fillers, respond directly to the last AI turn.
- Match the tone and topic of the conversation; address the last AI turn appropriately.${styleBlock}

Context:
${conversationSummary}`;

  const result = await model.generateContent(prompt);
  const parsed = JSON.parse(result.response.text()) as { hint: string };
  return (parsed.hint ?? '').trim();
}

/**
 * Chuyển tin nhắn DB (USER / AI) sang lượt Gemini; bỏ qua SYSTEM_SRS và tin khác.
 */
export function conversationMessagesToGeminiTurns(
  messages: Array<{ sender: string; content: string }>
): GeminiChatTurn[] {
  const out: GeminiChatTurn[] = [];
  for (const m of messages) {
    if (m.sender === 'USER') {
      out.push({ role: 'user', text: m.content });
    } else if (m.sender === 'AI') {
      out.push({ role: 'model', text: m.content });
    }
  }
  return out;
}
