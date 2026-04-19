import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Persona from '@/models/Persona';

export async function GET() {
  await dbConnect();
  try {
    const personas = await Persona.find();
    return NextResponse.json({ success: true, data: personas });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
