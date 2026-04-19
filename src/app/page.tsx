import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 selection:bg-indigo-500/30 overflow-hidden relative font-sans">
      
      {/* Dynamic Background Gradients */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-4000"></div>

      {/* Navbar */}
      <nav className="relative z-10 w-full px-6 py-6 md:px-12 lg:px-24 flex justify-between items-center border-b border-white/5 bg-neutral-950/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            S
          </div>
          <span className="font-semibold text-lg tracking-tight">SpeakAI</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">
            Log in
          </Link>
          <Link href="/practice" className="text-sm font-medium px-4 py-2 rounded-full bg-white text-black hover:bg-neutral-200 transition-colors">
            Start Practice
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-32 pb-24 md:pt-48 md:pb-32 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-8 backdrop-blur-sm">
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
          AI-Powered English Tutoring
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-400">
          Master spoken English <br className="hidden md:block"/> with your AI tutor
        </h1>
        
        <p className="text-lg md:text-xl text-neutral-400 mb-10 max-w-2xl font-light leading-relaxed">
          Realistic conversations, instant feedback on pronunciation, and adaptive learning paths powered by state-of-the-art AI. Practice anytime, anywhere without judgment.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full">
          <Link href="/practice" className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold transition-all transform hover:scale-105 shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2">
            Start Speaking Now
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
          
          <button className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-all backdrop-blur-sm flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            See how it works
          </button>
        </div>
      </main>

      {/* Feature Cards Showcase */}
      <section className="relative z-10 px-6 pb-32 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 p-6 rounded-2xl hover:bg-neutral-900/80 transition-colors">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-4 text-indigo-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Real-time Feedback</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Instantly know your mistakes and improve pronunciation with targeted feedback during your conversation.
            </p>
          </div>
          
          <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 p-6 rounded-2xl hover:bg-neutral-900/80 transition-colors">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 text-emerald-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Dynamic Scenarios</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Practice ordering food, job interviews, or casual chat. The AI adapts perfectly to any situation you choose.
            </p>
          </div>

          <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 p-6 rounded-2xl hover:bg-neutral-900/80 transition-colors">
            <div className="w-12 h-12 bg-rose-500/20 rounded-xl flex items-center justify-center mb-4 text-rose-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Track Progress</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Visualize your learning journey with detailed stats on your vocabulary richness, fluency, and grammar.
            </p>
          </div>
        </div>
      </section>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}} />
    </div>
  );
}
