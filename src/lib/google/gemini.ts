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

  const prompt = `You are an English speaking coach. Compare the learner's raw speech transcript with the normalized version.

Raw (as spoken): ${JSON.stringify(original)}
Normalized intent: ${JSON.stringify(normalized)}

Score pronunciation (0-100) and grammar (0-100). List concrete issues in "details": error_type must be one of PRONUNCIATION, GRAMMAR, VOCAB.
Return JSON only per schema.`;

  const result = await model.generateContent(prompt);
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

export async function generateAnswerHint(conversationSummary: string): Promise<string> {
  const modelName = await resolveGeminiModelForStep(AI_STEP_KEYS.HINT);
  console.log('modelName', modelName);
  const model = getGoogleGenerativeAI().getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: hintSchema,
      temperature: 0.6,
    },
  });

  const prompt = `Given this English conversation context, write ONE complete sample reply the learner could say next, in natural English.

Requirements:
- A single coherent answer (not bullet points, not multiple alternatives).
- About 30–40 words total.
- Match the tone and topic of the conversation; address the last AI turn appropriately.

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
