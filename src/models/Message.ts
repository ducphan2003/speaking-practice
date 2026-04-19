import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  conversation_id: mongoose.Types.ObjectId;
  sender: string;
  content: string;
  original_transcript?: string;
  audio_url?: string;
  evaluation?: {
    pronunciation_score: number;
    grammar_score: number;
    details: Array<{
      error_type: string;
      word: string;
      correction: string;
      explanation: string;
    }>;
  };
  /** Lần luyện đọc lại (ghi âm + chấm điểm) — không ghi đè evaluation lần gửi đầu */
  practice_reading?: {
    evaluation: {
      pronunciation_score: number;
      grammar_score: number;
      details: Array<{
        error_type: string;
        word: string;
        correction: string;
        explanation: string;
      }>;
    };
    audio_url?: string;
    transcript?: string;
    createdAt: Date;
  };
  createdAt: Date;
}

const MessageSchema: Schema = new Schema({
  conversation_id: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: String, enum: ['USER', 'AI', 'SYSTEM_SRS'], required: true },
  content: { type: String, required: true },
  original_transcript: { type: String },
  audio_url: { type: String },
  evaluation: {
    pronunciation_score: { type: Number },
    grammar_score: { type: Number },
    details: [
      {
        error_type: { type: String, enum: ['PRONUNCIATION', 'GRAMMAR', 'VOCAB'] },
        word: { type: String },
        correction: { type: String },
        explanation: { type: String },
      },
    ],
  },
  practice_reading: {
    evaluation: {
      pronunciation_score: { type: Number },
      grammar_score: { type: Number },
      details: [
        {
          error_type: { type: String, enum: ['PRONUNCIATION', 'GRAMMAR', 'VOCAB'] },
          word: { type: String },
          correction: { type: String },
          explanation: { type: String },
        },
      ],
    },
    audio_url: { type: String },
    transcript: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
