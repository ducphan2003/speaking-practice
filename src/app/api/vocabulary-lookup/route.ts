import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SystemVocabulary from '@/models/SystemVocabulary';
import { getUserIdFromRequest, unauthorized } from '@/lib/auth';
import { tryGetGoogleCloudCredentials, type GoogleServiceAccountCredentials } from '@/lib/google/config';
import { translateEnglishToVietnamese } from '@/lib/google/translate-cloud';
import { analyzeEnglishWordType } from '@/lib/google/natural-language-syntax';
import { generateEnglishWordIpa } from '@/lib/google/word-ipa';
import { vocabularyWordKey } from '@/lib/vocab-word-key';

const SOURCE = 'en';
const TARGET = 'vi';
const MAX_WORD_LEN = 500;

type LeanSys = {
  _id: unknown;
  word: string;
  translated_text: string;
  ipa?: string | null;
  word_type?: string | null;
};

function lookupPayload(doc: LeanSys, fromCache: boolean) {
  return {
    system_vocabulary_id: String(doc._id),
    word: doc.word,
    meaning: doc.translated_text,
    ipa: doc.ipa ?? null,
    word_type: doc.word_type ?? null,
    from_cache: fromCache,
  };
}

/** Bổ sung ipa / word_type cho bản ghi cũ (thiếu trường). */
async function enrichMissingMetadata(
  doc: LeanSys,
  creds: GoogleServiceAccountCredentials | undefined
): Promise<LeanSys> {
  const needIpa = !doc.ipa?.trim();
  const needPos = !doc.word_type?.trim();
  if (!needIpa && !needPos) return doc;

  const updates: { ipa?: string; word_type?: string } = {};

  if (needIpa) {
    try {
      const ipa = await generateEnglishWordIpa(doc.word);
      if (ipa) updates.ipa = ipa;
    } catch {
      /* bỏ qua — thiếu GEMINI hoặc lỗi model */
    }
  }

  if (needPos && creds?.client_email && creds.private_key) {
    try {
      const wt = await analyzeEnglishWordType(doc.word, creds);
      if (wt) updates.word_type = wt;
    } catch {
      /* API Natural Language chưa bật hoặc lỗi */
    }
  }

  if (Object.keys(updates).length > 0) {
    await SystemVocabulary.updateOne({ _id: doc._id }, { $set: updates });
    return { ...doc, ...updates };
  }
  return doc;
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return unauthorized();

  await dbConnect();
  try {
    const body = await req.json();
    const raw = typeof body.word === 'string' ? body.word : '';
    const word = raw.trim();
    if (!word) {
      return NextResponse.json({ success: false, message: 'Thiếu từ (word).' }, { status: 400 });
    }
    if (word.length > MAX_WORD_LEN) {
      return NextResponse.json(
        { success: false, message: `Từ quá dài (tối đa ${MAX_WORD_LEN} ký tự).` },
        { status: 400 }
      );
    }

    const wordKey = vocabularyWordKey(word);
    const creds = tryGetGoogleCloudCredentials();
    const hasGcp = Boolean(creds?.client_email && creds.private_key);

    const existing = await SystemVocabulary.findOne({
      source_language: SOURCE,
      target_language: TARGET,
      word_key: wordKey,
    }).lean<LeanSys | null>();

    if (existing) {
      const filled = await enrichMissingMetadata(existing, creds ?? undefined);
      return NextResponse.json({
        success: true,
        data: lookupPayload(filled, true),
      });
    }

    if (!hasGcp || !creds) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Chưa cấu hình GOOGLE_CLOUD_CREDENTIALS_JSON (service account) để gọi Translation API.',
        },
        { status: 503 }
      );
    }

    const translated = await translateEnglishToVietnamese(word, creds);

    const [wordType, ipa] = await Promise.all([
      analyzeEnglishWordType(word, creds).catch(() => null as string | null),
      generateEnglishWordIpa(word).catch(() => null as string | null),
    ]);

    try {
      const created = await SystemVocabulary.create({
        source_language: SOURCE,
        target_language: TARGET,
        word_key: wordKey,
        word,
        translated_text: translated,
        ...(ipa ? { ipa } : {}),
        ...(wordType ? { word_type: wordType } : {}),
      });
      const lean = created.toObject() as LeanSys;
      return NextResponse.json({
        success: true,
        data: lookupPayload(lean, false),
      });
    } catch (e: unknown) {
      const code = (e as { code?: number })?.code;
      if (code === 11000) {
        const again = await SystemVocabulary.findOne({
          source_language: SOURCE,
          target_language: TARGET,
          word_key: wordKey,
        }).lean<LeanSys | null>();
        if (again) {
          const filled = await enrichMissingMetadata(again, creds);
          return NextResponse.json({
            success: true,
            data: lookupPayload(filled, true),
          });
        }
      }
      throw e;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
