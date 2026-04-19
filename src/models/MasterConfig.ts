import mongoose, { Schema, Document } from 'mongoose';

/**
 * Bảng cấu hình master — mỗi bản ghi: key duy nhất + value JSON (vd. { model, name }).
 * Collection: master_configs
 */
export interface IMasterConfig extends Document {
  key: string;
  value: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const MasterConfigSchema: Schema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, collection: 'master_configs' },
);

export default mongoose.models.MasterConfig || mongoose.model<IMasterConfig>('MasterConfig', MasterConfigSchema);
