import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Topic from '@/models/Topic';

export async function GET() {
  await dbConnect();
  try {
    const topics = await Topic.find().sort({ order: 1 });
    return NextResponse.json({ success: true, data: topics });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
