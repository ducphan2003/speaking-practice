/**
 * Khóa cấu hình trong `master_configs` cho từng bước gọi AI.
 * value JSON gợi ý: { "model": "gemini-2.5-flash-lite", "name": "Tên hiển thị (tuỳ chọn)" }
 */
export const AI_STEP_KEYS = {
  NORMALIZE_TRANSCRIPT: 'ai_step_normalize_transcript',
  EVALUATE_SPEAKING: 'ai_step_evaluate_speaking',
  /** Luyện đọc: chấm từ audio + câu mẫu (Gemini đa phương tiện). */
  EVALUATE_PRACTICE_READING: 'ai_step_evaluate_practice_reading',
  CHAT_REPLY: 'ai_step_chat_reply',
  HINT: 'ai_step_hint',
  GENERIC_TEXT: 'ai_step_generic_text',
} as const;

export type AiStepKey = (typeof AI_STEP_KEYS)[keyof typeof AI_STEP_KEYS];
