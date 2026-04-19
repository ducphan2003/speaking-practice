import mongoose, { Schema, Document } from 'mongoose';

export interface IVocabulary extends Document {
  user_id: mongoose.Types.ObjectId;
  conversation_id?: mongoose.Types.ObjectId;
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
    conversation_id: { type: Schema.Types.ObjectId, ref: 'Conversation' },
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

export default mongoose.models.Vocabulary || mongoose.model<IVocabulary>('Vocabulary', VocabularySchema);
