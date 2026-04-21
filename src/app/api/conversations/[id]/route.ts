import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import mongoose from 'mongoose';
import { getUserIdFromRequest, unauthorized } from '@/lib/auth';
import { normalizeAvatarCode } from '@/lib/conversation-avatars';
import { isValidGender } from '@/lib/conversation-gender';

async function loadOwnedConversation(id: string, userId: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const conv = await Conversation.findById(id);
  if (!conv || String(conv.user_id) !== userId) return null;
  return conv;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return unauthorized();

  await dbConnect();
  try {
    const { id } = await params;
    const conv = await loadOwnedConversation(id, userId);
    if (!conv) {
      return NextResponse.json({ success: false, message: 'Conversation not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: conv });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return unauthorized();

  await dbConnect();
  try {
    const { id } = await params;
    const existing = await loadOwnedConversation(id, userId);
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Conversation not found' }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const $set: Record<string, unknown> = {};

    const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
    const parseCoord = (v: unknown): number | null => {
      if (typeof v === 'number' && Number.isFinite(v)) return clamp01(v);
      if (typeof v === 'string') {
        const t = v.trim();
        if (t === '') return null;
        const n = Number(t);
        if (Number.isFinite(n)) return clamp01(n);
      }
      return null;
    };

    if ('canvas_x' in body || 'canvas_y' in body) {
      const canvas_x = parseCoord(body.canvas_x);
      const canvas_y = parseCoord(body.canvas_y);
      if (canvas_x === null || canvas_y === null) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Khi gửi canvas: canvas_x và canvas_y là bắt buộc (số 0–1, có thể dạng chuỗi).',
          },
          { status: 400 },
        );
      }
      $set.canvas_x = canvas_x;
      $set.canvas_y = canvas_y;
    }

    if (typeof body.gender === 'string' && isValidGender(body.gender)) {
      $set.gender = body.gender;
    }

    if (typeof body.avatar_code === 'string') {
      $set.avatar_code = normalizeAvatarCode(body.avatar_code);
    }

    if (body.avatar_url === null || body.avatar_url === '') {
      $set.avatar_url = null;
    } else if (typeof body.avatar_url === 'string') {
      const t = body.avatar_url.trim();
      if (t === '') {
        $set.avatar_url = null;
      } else if (t.startsWith('https://') || t.startsWith('http://') || t.startsWith('/')) {
        $set.avatar_url = t.slice(0, 2048);
      } else {
        return NextResponse.json(
          { success: false, message: 'avatar_url phải là URL hợp lệ hoặc đường dẫn /...' },
          { status: 400 },
        );
      }
    }

    if (body.summary === null || body.summary === '') {
      $set.summary = null;
    } else if (typeof body.summary === 'string') {
      const t = body.summary.trim();
      $set.summary = t.length > 0 ? t.slice(0, 8000) : null;
    }

    if (Object.keys($set).length === 0) {
      return NextResponse.json(
        { success: false, message: 'Không có trường hợp lệ để cập nhật.' },
        { status: 400 },
      );
    }

    const updatedConversation = await Conversation.findOneAndUpdate(
      { _id: id, user_id: new mongoose.Types.ObjectId(userId) },
      { $set },
      { new: true },
    );
    if (!updatedConversation) {
      return NextResponse.json({ success: false, message: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation updated.',
      data: updatedConversation,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
