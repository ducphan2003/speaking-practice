import dbConnect from '@/lib/mongodb';
import MasterConfig from '@/models/MasterConfig';
import { getGeminiModel } from '@/lib/google/config';

export type AiStepConfigValue = {
  /** Tên hiển thị / mô tả bước (tuỳ chọn) */
  name?: string;
  /** Model Gemini cho bước này */
  model?: string;
  [key: string]: unknown;
};

const modelCache = new Map<string, { model: string; at: number }>();
const CACHE_MS = 60_000;

function parseStepValue(raw: unknown): AiStepConfigValue | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as AiStepConfigValue;
}

/**
 * Đọc value JSON theo key (không cache — dùng khi cần đọc toàn bộ cấu hình).
 */
export async function getMasterConfigValue(key: string): Promise<unknown | null> {
  await dbConnect();
  const row = await MasterConfig.findOne({ key })
    .lean<{ value?: unknown }>()
    .exec();
  if (!row) return null;
  return row.value as unknown;
}

/**
 * Lấy model Gemini cho một bước AI: đọc `master_configs` theo key,
 * lấy `value.model` nếu có; không thì fallback `GEMINI_MODEL` / mặc định.
 */
export async function resolveGeminiModelForStep(stepKey: string): Promise<string> {
  const now = Date.now();
  const hit = modelCache.get(stepKey);
  if (hit && now - hit.at < CACHE_MS) {
    return hit.model;
  }

  await dbConnect();
  const row = await MasterConfig.findOne({ key: stepKey })
    .lean<{ value?: unknown }>()
    .exec();
  const parsed = parseStepValue(row?.value);
  const fromDb = typeof parsed?.model === 'string' ? parsed.model.trim() : '';
  const resolved = fromDb || getGeminiModel();

  modelCache.set(stepKey, { model: resolved, at: now });
  return resolved;
}

/** Xóa cache sau khi admin cập nhật master_configs (gọi từ API PATCH sau này). */
export function invalidateMasterConfigCache(key?: string): void {
  if (key) modelCache.delete(key);
  else modelCache.clear();
}
