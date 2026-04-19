/**
 * Cấu hình chung cho Google AI (Gemini API key) và Google Cloud (STT/TTS).
 *
 * - Gemini: tạo key tại https://aistudio.google.com/apikey
 * - Cloud Speech & TTS: tạo project GCP, bật API, tạo service account JSON
 */

import fs from 'fs';
import path from 'path';

export function getGeminiApiKey(): string {
  const key =
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GOOGLE_API_KEY;
  if (!key?.trim()) {
    throw new Error(
      'Thiếu GEMINI_API_KEY (hoặc GOOGLE_GENERATIVE_AI_API_KEY). Thêm vào .env.local.'
    );
  }
  return key.trim();
}

/** Model Gemini, ví dụ gemini-2.5-flash, gemini-1.5-flash */
export function getGeminiModel(): string {
  return (process.env.GEMINI_MODEL ?? 'gemini-2.5-flash').trim();
}

export type GoogleServiceAccountCredentials = {
  project_id?: string;
  client_email: string;
  private_key: string;
  [key: string]: unknown;
};

/**
 * Đường dẫn tới file JSON service account (tuyệt đối hoặc tương đối theo thư mục chạy app, thường là root project).
 * Nếu không set, client Cloud dùng Application Default Credentials (vd. biến GOOGLE_APPLICATION_CREDENTIALS).
 */
export function tryGetGoogleCloudCredentials():
  | GoogleServiceAccountCredentials
  | undefined {
  const filePath = process.env.GOOGLE_CLOUD_CREDENTIALS_JSON?.trim();
  if (!filePath) return undefined;

  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.join(/* turbopackIgnore: true */ process.cwd(), filePath);

  let raw: string;
  try {
    raw = fs.readFileSync(resolved, 'utf-8');
  } catch {
    throw new Error(
      `Không đọc được file GOOGLE_CLOUD_CREDENTIALS_JSON: ${resolved}`
    );
  }

  try {
    return JSON.parse(raw) as GoogleServiceAccountCredentials;
  } catch {
    throw new Error(
      `File ${resolved} không phải JSON hợp lệ (service account).`
    );
  }
}

/** Giọng TTS: ví dụ en-US-Neural2-F */
export function getGoogleTtsVoiceName(): string {
  return (process.env.GOOGLE_TTS_VOICE ?? 'en-US-Neural2-F').trim();
}
