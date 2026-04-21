import mongoose, { Schema, Document } from 'mongoose';

export interface IVocabulary extends Document {
  user_id: mongoose.Types.ObjectId;
  /** Liên kết từ trong kho user với bản ghi `system_vocabularies` (tra cứu / dịch hệ thống). */
  system_vocabulary_id?: mongoose.Types.ObjectId | null;
  conversation_id?: mongoose.Types.ObjectId;
  /** Chủ đề (Topic) gắn với từ — ref `topics._id` khi có. */
  topic_id?: mongoose.Types.ObjectId | null;
  /** Đánh dấu đã thuộc (học thuộc). */
  mastered: boolean;
  word: string;
  meaning: string;
  word_type: string;
  ipa?: string;
  example_sentence?: string;
  user_note?: string;
  srs: {
    repetition_count: number;
    ease_factor: number;
    interval: number;
    next_review_date: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const VocabularySchema: Schema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    system_vocabulary_id: {
      type: Schema.Types.ObjectId,
      ref: 'SystemVocabulary',
      default: null,
    },
    conversation_id: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    topic_id: { type: Schema.Types.ObjectId, ref: 'Topic', default: null },
    mastered: { type: Boolean, default: false },
    word: { type: String, required: true },
    meaning: { type: String, required: true },
    word_type: { type: String, required: true },
    ipa: { type: String },
    example_sentence: { type: String },
    user_note: { type: String },
    srs: {
      repetition_count: { type: Number, default: 0 },
      ease_factor: { type: Number, default: 2.5 },
      interval: { type: Number, default: 0 },
      next_review_date: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

/** Next.js HMR có thể giữ model cũ không có field mới → populate báo lỗi. Xóa cache trước khi compile lại. */
if (mongoose.models.Vocabulary) {
  delete mongoose.models.Vocabulary;
}

export default mongoose.model<IVocabulary>('Vocabulary', VocabularySchema);
