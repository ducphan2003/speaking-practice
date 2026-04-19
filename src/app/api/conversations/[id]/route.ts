import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import mongoose from 'mongoose';
import { getUserIdFromRequest, unauthorized } from '@/lib/auth';

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

    const body = await req.json();

    const updatedConversation = await Conversation.findByIdAndUpdate(id, { $set: body }, { new: true });

    return NextResponse.json({
      success: true,
      message: 'Conversation updated.',
      data: updatedConversation,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
