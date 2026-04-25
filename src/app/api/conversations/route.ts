import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import Persona from '@/models/Persona';
import mongoose from 'mongoose';
import { getUserIdFromRequest, unauthorized } from '@/lib/auth';
import { normalizeAvatarCode } from '@/lib/conversation-avatars';
import { normalizeGender } from '@/lib/conversation-gender';
import { normalizePracticeMode } from '@/lib/conversation-practice-mode';

export async function GET(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return unauthorized();

  await dbConnect();
  try {
    const list = await Conversation.find({
      user_id: new mongoose.Types.ObjectId(userId),
      status: 'ACTIVE',
    })
      .sort({ updatedAt: -1 })
      .lean();
    return NextResponse.json({ success: true, data: list });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return unauthorized();

  await dbConnect();
  try {
    const body = await req.json();

    const customPromptRaw =
      typeof body.persona_prompt_custom === 'string' ? body.persona_prompt_custom.trim() : '';
    const useCustomPersona = customPromptRaw.length > 0;

    let persona_name: string;
    let persona_prompt_context: string;
    let persona_id: mongoose.Types.ObjectId | null = null;

    if (useCustomPersona) {
      if (customPromptRaw.length < 8) {
        return NextResponse.json(
          { success: false, message: 'Mô tả tính cách AI (persona_prompt_custom) cần ít nhất 8 ký tự.' },
          { status: 400 },
        );
      }
      const nameRaw =
        typeof body.persona_name_custom === 'string' ? body.persona_name_custom.trim() : '';
      persona_name = nameRaw ? nameRaw.slice(0, 120) : 'Persona tùy chỉnh';
      persona_prompt_context = customPromptRaw.slice(0, 12000);
    } else {
      const pid = body.persona_id;
      if (!pid || !mongoose.Types.ObjectId.isValid(pid)) {
        return NextResponse.json(
          { success: false, message: 'Chọn persona có sẵn (persona_id) hoặc gửi persona_prompt_custom.' },
          { status: 400 },
        );
      }
      const persona = await Persona.findById(pid);
      if (!persona) {
        return NextResponse.json({ success: false, message: 'Persona not found' }, { status: 404 });
      }
      persona_id = new mongoose.Types.ObjectId(pid);
      persona_name = persona.name;
      persona_prompt_context = persona.prompt_context;
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

    const uid = new mongoose.Types.ObjectId(userId);
    const existingCount = await Conversation.countDocuments({ user_id: uid, status: 'ACTIVE' });
    const col = existingCount % 4;
    const row = Math.floor(existingCount / 4);
    const canvas_x = Math.min(0.88, 0.1 + col * 0.22);
    const canvas_y = Math.min(0.82, 0.1 + row * 0.2);

    const gender = normalizeGender(body.gender);
    const avatar_code = normalizeAvatarCode(body.avatar_code);

    let avatar_url: string | undefined;
    if (typeof body.avatar_url === 'string') {
      const t = body.avatar_url.trim();
      if (t.length > 0 && (t.startsWith('https://') || t.startsWith('http://') || t.startsWith('/'))) {
        avatar_url = t.slice(0, 2048);
      }
    }

    let summary: string | undefined;
    if (typeof body.summary === 'string') {
      const t = body.summary.trim();
      if (t.length > 0) summary = t.slice(0, 8000);
    }

    const practice_mode = normalizePracticeMode(body.practice_mode);

    const newConversation = await Conversation.create({
      user_id: uid,
      chat_mode,
      practice_mode,
      sub_topic_id,
      custom_topic_name,
      active_mission_ids: [],
      persona_id,
      persona_name,
      persona_prompt_context,
      status: 'ACTIVE',
      canvas_x,
      canvas_y,
      gender,
      avatar_code,
      ...(avatar_url ? { avatar_url } : {}),
      ...(summary ? { summary } : {}),
    });

    return NextResponse.json({ success: true, data: newConversation }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
