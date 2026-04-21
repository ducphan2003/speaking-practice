import mongoose, { Schema, Document } from 'mongoose';

/** Từ điển toàn hệ thống (cache dịch EN→VI), collection `system_vocabularies`. */
export interface ISystemVocabulary extends Document {
  source_language: string;
  target_language: string;
  /** Khóa tra cứu: chữ thường, trim */
  word_key: string;
  /** Từ gốc (lần tra đầu) */
  word: string;
  /** Nghĩa tiếng Việt */
  translated_text: string;
  /** IPA (tiếng Anh Mỹ) — từ Gemini, không có API Google chuyên IPA. */
  ipa?: string;
  /** Loại từ (vd. noun, verb) — từ Cloud Natural Language analyzeSyntax. */
  word_type?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SystemVocabularySchema: Schema = new Schema(
  {
    source_language: { type: String, required: true, default: 'en' },
    target_language: { type: String, required: true, default: 'vi' },
    word_key: { type: String, required: true },
    word: { type: String, required: true },
    translated_text: { type: String, required: true },
    ipa: { type: String },
    word_type: { type: String },
  },
  { timestamps: true, collection: 'system_vocabularies' }
);

SystemVocabularySchema.index(
  { source_language: 1, target_language: 1, word_key: 1 },
  { unique: true }
);

if (mongoose.models.SystemVocabulary) {
  delete mongoose.models.SystemVocabulary;
}

export default mongoose.model<ISystemVocabulary>('SystemVocabulary', SystemVocabularySchema);
