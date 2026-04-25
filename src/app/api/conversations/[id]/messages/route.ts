import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';
import { normalizeTranscript, evaluateSpeaking, generateAIReply, textToSpeech } from '@/lib/ai-service';
import { buildThreadSummaryBriefDescription } from '@/lib/conversation-thread-memory';
import { normalizePracticeMode } from '@/lib/conversation-practice-mode';
import { summarizeDialogueWindow } from '@/lib/google';
import { getUserIdFromRequest, unauthorized } from '@/lib/auth';
import { encodeSseEvent } from '@/lib/sse';
import { decodeAudioPayload, extFromMime } from '@/lib/audio-upload';
import { uploadAudioToR2 } from '@/lib/r2';

export const runtime = 'nodejs';

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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return unauthorized();

  await dbConnect();
  try {
    const { id } = await params;
    const conv = await assertConversationOwner(id, userId);
    if (!conv) {
      return NextResponse.json({ success: false, message: 'Conversation not found' }, { status: 404 });
    }

    const messages = await Message.find({ conversation_id: id }).sort({ createdAt: 1 });
    return NextResponse.json({ success: true, data: messages });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

type PostBody = {
  original_transcript?: string;
  audio_url?: string;
  audio_base64?: string;
  audio_mime_type?: string;
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return unauthorized();

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
  }

  const originalTranscript = typeof body.original_transcript === 'string' ? body.original_transcript.trim() : '';
  if (!originalTranscript) {
    return NextResponse.json(
      { success: false, message: 'original_transcript is required' },
      { status: 400 },
    );
  }

  await dbConnect();
  const { id } = await params;
  if (!(await assertConversationOwner(id, userId))) {
    return NextResponse.json({ success: false, message: 'Conversation not found' }, { status: 404 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encodeSseEvent(event, data));
      };

      try {
        send('ack', { received: true });
        await new Promise((r) => setTimeout(r, 0));

        let audioUrl = typeof body.audio_url === 'string' ? body.audio_url.trim() : '';

        if (body.audio_base64 && typeof body.audio_base64 === 'string') {
          const { buffer, mimeType } = decodeAudioPayload(body.audio_base64, body.audio_mime_type);
          const ext = extFromMime(mimeType);
          const key = `conversations/${id}/user-audio-${Date.now()}.${ext}`;
          audioUrl = await uploadAudioToR2(buffer, key, mimeType);
        }

        const normalized = await normalizeTranscript(originalTranscript);
        const evaluation = await evaluateSpeaking(originalTranscript, normalized);

        send('dual_transcript', {
          transcript_1: originalTranscript,
          transcript_2: normalized,
        });

        const userMessageDoc = await Message.create({
          conversation_id: id,
          sender: 'USER',
          content: normalized,
          original_transcript: originalTranscript,
          audio_url: audioUrl || undefined,
          evaluation,
        });

        const userPlain = toPlainMessage(userMessageDoc);
        send('user_message', { message: userPlain });

        const history = await Message.find({ conversation_id: id }).sort({ createdAt: 1 });
        const convForChat = await Conversation.findById(id);
        if (!convForChat) {
          send('error', { success: false, message: 'Conversation not found' });
          return;
        }
        const practiceMode = normalizePracticeMode(convForChat.practice_mode);
        const historyForModel = history.map((m) => ({
          sender: m.sender,
          content: m.content,
        }));
        const aiContent = await generateAIReply(
          historyForModel,
          normalized,
          convForChat.persona_prompt_context || '',
          practiceMode,
          { threadSummary: convForChat.thread_summary },
        );
        const aiAudioUrl = await textToSpeech(aiContent);

        const aiMessageDoc = await Message.create({
          conversation_id: id,
          sender: 'AI',
          content: aiContent,
          audio_url: aiAudioUrl,
        });

        const aiPlain = toPlainMessage(aiMessageDoc);

        const dialogueAfter = await Message.find({
          conversation_id: id,
          sender: { $in: ['USER', 'AI'] },
        })
          .sort({ createdAt: 1 })
          .select('sender content')
          .lean();
        const lines = dialogueAfter.map((m) => ({
          sender: m.sender as string,
          content: m.content as string,
        }));
        const nDialogue = lines.length;
        if (nDialogue > 0 && nDialogue % 10 === 0) {
          const last10 = lines.slice(-10);
          const nUser = last10.filter((m) => m.sender === 'USER').length;
          const nAi = last10.filter((m) => m.sender === 'AI').length;
          if (last10.length === 10 && nUser === 5 && nAi === 5) {
            const convForSummary = await Conversation.findById(id);
            if (convForSummary) {
              const brief = buildThreadSummaryBriefDescription({
                custom_topic_name: convForSummary.custom_topic_name,
                persona_name: convForSummary.persona_name ?? null,
                chat_mode: convForSummary.chat_mode,
                practice_mode: convForSummary.practice_mode,
                learner_session_note: convForSummary.summary ?? null,
              });
              try {
                const prev =
                  typeof convForSummary.thread_summary === 'string'
                    ? convForSummary.thread_summary
                    : null;
                const next = await summarizeDialogueWindow({
                  briefDescription: brief,
                  previousSummary: prev,
                  lastTenMessages: last10,
                });
                await Conversation.updateOne({ _id: id }, { $set: { thread_summary: next } });
              } catch (e) {
                console.error('[thread_summary]', e);
              }
            }
          }
        }

        send('complete', {
          success: true,
          dual_transcript: {
            transcript_1: originalTranscript,
            transcript_2: normalized,
          },
          user_message: userPlain,
          ai_message: aiPlain,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        send('error', { success: false, message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
