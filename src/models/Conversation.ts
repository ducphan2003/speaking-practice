import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  user_id: mongoose.Types.ObjectId;
  chat_mode: string;
  sub_topic_id?: mongoose.Types.ObjectId | null;
  custom_topic_name: string;
  active_mission_ids: mongoose.Types.ObjectId[];
  persona_id?: mongoose.Types.ObjectId | null;
  persona_name?: string;
  persona_prompt_context?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema: Schema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    chat_mode: { type: String, enum: ['SAMPLE_TOPIC', 'CUSTOM_TOPIC', 'FREE_TALK'], required: true },
    sub_topic_id: { type: Schema.Types.ObjectId, ref: 'SubTopic', default: null },
    custom_topic_name: { type: String, required: true },
    active_mission_ids: [{ type: Schema.Types.ObjectId, ref: 'Mission' }],
    persona_id: { type: Schema.Types.ObjectId, ref: 'Persona', default: null },
    persona_name: { type: String },
    persona_prompt_context: { type: String },
    status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export default mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);
