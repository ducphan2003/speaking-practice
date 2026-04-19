import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';
import { evaluateSpeaking } from '@/lib/ai-service';
import { getUserIdFromRequest, unauthorized } from '@/lib/auth';
import { decodeAudioPayload, extFromMime } from '@/lib/audio-upload';
import { uploadAudioToR2 } from '@/lib/r2';

export const runtime = 'nodejs';

type Body = {
  original_transcript?: string;
  audio_base64?: string;
  audio_mime_type?: string;
};

async function assertConversationOwner(conversationId: string, userId: string) {
  const conv = await Conversation.findById(conversationId);
  if (!conv || String(conv.user_id) !== userId) return null;
  return conv;
}

function toPlainMessage(doc: unknown) {
  if (doc && typeof doc === 'object' && 'toJSON' in doc && typeof (doc as { toJSON: () => unknown }).toJSON === 'function') {
    return (doc as { toJSON: () => unknown }).toJSON();
  }
  return doc;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return unauthorized();

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
  }

  const originalTranscript =
    typeof body.original_transcript === 'string' ? body.original_transcript.trim() : '';
  if (!originalTranscript || originalTranscript.startsWith('(No speech detected')) {
    return NextResponse.json(
      { success: false, message: 'Cần bản ghi có nội dung nói (original_transcript).' },
      { status: 400 },
    );
  }

  await dbConnect();
  const { id: conversationId, messageId } = await params;
  const conv = await assertConversationOwner(conversationId, userId);
  if (!conv) {
    return NextResponse.json({ success: false, message: 'Conversation not found' }, { status: 404 });
  }

  const msg = await Message.findOne({
    _id: messageId,
    conversation_id: conversationId,
    sender: 'USER',
  });
  if (!msg) {
    return NextResponse.json({ success: false, message: 'Message not found' }, { status: 404 });
  }

  const targetText = typeof msg.content === 'string' ? msg.content.trim() : '';
  if (!targetText) {
    return NextResponse.json({ success: false, message: 'Tin nhắn không có nội dung chuẩn để so sánh.' }, { status: 400 });
  }

  try {
    let audioUrl: string | undefined;
    if (body.audio_base64 && typeof body.audio_base64 === 'string') {
      const { buffer, mimeType } = decodeAudioPayload(body.audio_base64, body.audio_mime_type);
      const ext = extFromMime(mimeType);
      const key = `conversations/${conversationId}/practice-read-${messageId}-${Date.now()}.${ext}`;
      audioUrl = await uploadAudioToR2(buffer, key, mimeType);
    }

    const evaluation = await evaluateSpeaking(originalTranscript, targetText);

    msg.practice_reading = {
      evaluation,
      audio_url: audioUrl,
      transcript: originalTranscript,
      createdAt: new Date(),
    };
    await msg.save();

    const plain = toPlainMessage(msg);
    return NextResponse.json({ success: true, data: plain });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
