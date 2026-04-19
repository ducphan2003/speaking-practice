import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json({ success: false, message: 'idToken is required' }, { status: 400 });
    }

    // 1. Verify Google idToken
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.json({ success: false, message: 'Invalid google token' }, { status: 401 });
    }

    const { email, name, picture } = payload;

    // 2. Connect to Database
    await dbConnect();

    // 3. Find or Create User
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        name: name || 'Trang Nguyen',
        avatar_url: picture || '',
        total_speaking_minutes: 0,
      });
    } else {
      // Cập nhật avatar hoặc name nếu cần
      if (picture && user.avatar_url !== picture) {
        user.avatar_url = picture;
        await user.save();
      }
    }

    // 4. Generate App JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' } // Token sống 7 ngày
    );

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
          total_speaking_minutes: user.total_speaking_minutes,
        },
      },
    });
  } catch (error: any) {
    console.error('Google Auth Error:', error);
    return NextResponse.json(
      { success: false, message: 'Authentication failed', error: error.message },
      { status: 500 }
    );
  }
}
