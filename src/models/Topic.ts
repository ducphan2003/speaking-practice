import mongoose, { Schema, Document } from 'mongoose';

export interface ITopic extends Document {
  name: string;
  name_vi: string;
  icon: string;
  order: number;
}

const TopicSchema: Schema = new Schema({
  name: { type: String, required: true },
  name_vi: { type: String, required: true },
  icon: { type: String },
  order: { type: Number, default: 0 },
});

export default mongoose.models.Topic || mongoose.model<ITopic>('Topic', TopicSchema);
