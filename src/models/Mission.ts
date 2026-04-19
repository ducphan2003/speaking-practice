import mongoose, { Schema, Document } from 'mongoose';

export interface IMission extends Document {
  sub_topic_id?: mongoose.Types.ObjectId | null;
  content: string;
  content_vi: string;
  difficulty: string;
}

const MissionSchema: Schema = new Schema({
  sub_topic_id: { type: Schema.Types.ObjectId, ref: 'SubTopic', default: null },
  content: { type: String, required: true },
  content_vi: { type: String, required: true },
  difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD'], default: 'MEDIUM' },
});

export default mongoose.models.Mission || mongoose.model<IMission>('Mission', MissionSchema);
