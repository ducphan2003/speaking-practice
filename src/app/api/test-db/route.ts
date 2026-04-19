import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await dbConnect();
    const readyState = mongoose.connection.readyState;
    
    let statusMsg = '';
    switch (readyState) {
      case 0:
        statusMsg = 'Disconnected';
        break;
      case 1:
        statusMsg = 'Connected';
        break;
      case 2:
        statusMsg = 'Connecting';
        break;
      case 3:
        statusMsg = 'Disconnecting';
        break;
      default:
        statusMsg = 'Unknown';
    }

    return NextResponse.json({ 
      status: 'success', 
      message: 'MongoDB connection test',
      readyState,
      statusMsg
    });
  } catch (error: any) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to connect to database', error: error.message },
      { status: 500 }
    );
  }
}
