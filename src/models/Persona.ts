import mongoose, { Schema, Document } from 'mongoose';

export interface IPersona extends Document {
  name: string;
  prompt_context: string;
  avatar_url: string;
}

const PersonaSchema: Schema = new Schema({
  name: { type: String, required: true },
  prompt_context: { type: String, required: true },
  avatar_url: { type: String },
});

export default mongoose.models.Persona || mongoose.model<IPersona>('Persona', PersonaSchema);
