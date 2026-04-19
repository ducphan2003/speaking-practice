import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import Persona from '@/models/Persona';
import mongoose from 'mongoose';
import { getUserIdFromRequest, unauthorized } from '@/lib/auth';

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return unauthorized();

  await dbConnect();
  try {
    const body = await req.json();

    const personaId = body.persona_id;
    if (!personaId || !mongoose.Types.ObjectId.isValid(personaId)) {
      return NextResponse.json(
        { success: false, message: 'persona_id is required and must be valid' },
        { status: 400 },
      );
    }

    const persona = await Persona.findById(personaId);
    if (!persona) {
      return NextResponse.json({ success: false, message: 'Persona not found' }, { status: 404 });
    }

    let chat_mode = body.chat_mode as string;
    if (chat_mode === 'CUSTOM') chat_mode = 'CUSTOM_TOPIC';

    const custom_topic_name =
      typeof body.custom_topic_name === 'string' && body.custom_topic_name.trim()
        ? body.custom_topic_name.trim()
        : chat_mode === 'FREE_TALK'
          ? 'Free talk'
          : 'Practice';

    let sub_topic_id: mongoose.Types.ObjectId | null = null;
    if (body.sub_topic_id && mongoose.Types.ObjectId.isValid(body.sub_topic_id)) {
      sub_topic_id = new mongoose.Types.ObjectId(body.sub_topic_id);
    }

    const newConversation = await Conversation.create({
      user_id: new mongoose.Types.ObjectId(userId),
      chat_mode,
      sub_topic_id,
      custom_topic_name,
      active_mission_ids: [],
      persona_id: new mongoose.Types.ObjectId(personaId),
      persona_name: persona.name,
      persona_prompt_context: persona.prompt_context,
      status: 'ACTIVE',
    });

    return NextResponse.json({ success: true, data: newConversation }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
