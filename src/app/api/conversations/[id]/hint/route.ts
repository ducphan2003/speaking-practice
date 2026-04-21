/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';
import { generateHint } from '@/lib/ai-service';
import { getUserIdFromRequest, unauthorized } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return unauthorized();

  await dbConnect();
  try {
    const { id } = await params;
    const conv = await Conversation.findById(id);
    if (!conv || String(conv.user_id) !== userId) {
      return NextResponse.json({ success: false, message: 'Conversation not found' }, { status: 404 });
    }

    const history = await Message.find({ conversation_id: id }).sort({ createdAt: 1 });

    const hint = await generateHint(history);

    return NextResponse.json({ success: true, data: hint });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
