'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Front-end yêu cầu prefix NEXT_PUBLIC_ để Next.js đưa biến Môi trường vào trình duyệt
  // trim(): tránh CRLF/khoảng trắng trong .env trên Windows làm sai Client ID
  const clientId = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setError(null);
    try {
      // Gửi idToken nhận được từ Google cho Backend xử lý
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: credentialResponse.credential,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Lưu App JWT vào LocalStorage (hoặc cookie tuỳ best practice của bạn)
        localStorage.setItem('auth_token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        
        // Cập nhật xong thì chuyển hướng
        router.push('/');
      } else {
        setError(data.message || 'Authentication failed on server.');
      }
    } catch (err: any) {
      setError('An error occurred during network request.');
    } finally {
      setLoading(false);
    }
  };

  if (!clientId && process.env.NODE_ENV !== 'production') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4 font-sans">
        <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl max-w-lg">
          <h2 className="font-bold mb-2">Thiếu Environment Variable</h2>
          <p>Bạn cần thêm biến <code className="bg-black/30 p-1 rounded">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> vào file <strong>.env.local</strong> để nút Google Login hiển thị.</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 font-sans text-white p-4 overflow-hidden relative">
        
        {/* Background Gradients */}
        <div className="absolute top-0 -left-4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 -right-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className="relative z-10 w-full max-w-md bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 items-center justify-center font-bold text-2xl text-white shadow-lg shadow-indigo-500/20 mb-6">
              S
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Chào mừng trở lại</h1>
            <p className="text-neutral-400 text-sm">Đăng nhập bằng Google để tiếp tục học</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <div className="flex flex-col items-center justify-center w-full relative h-[44px]">
             {loading ? (
                 <div className="absolute inset-0 z-20 flex items-center justify-center bg-transparent rounded-full border border-white/5">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-3 text-sm text-neutral-400">Đang xác thực...</span>
                 </div>
             ) : (
                <div className="w-full flex justify-center transform transition-transform hover:scale-105 active:scale-95">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Popup closed or Google authentication failed')}
                    useOneTap={false}
                    theme="filled_black"
                    shape="pill"
                    text="continue_with"
                  />
                </div>
             )}
          </div>

          <div className="mt-8 text-center text-xs text-neutral-500">
            Khi tiếp tục, bạn đồng ý với Điều khoản dịch vụ và <br/> Chính sách bảo mật của chúng tôi.
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
