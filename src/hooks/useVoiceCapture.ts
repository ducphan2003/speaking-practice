'use client';

import { useCallback, useRef, useState } from 'react';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export type VoiceCaptureResult = {
  transcript: string;
  audioBase64?: string;
  mimeType: string;
};

/**
 * Ghi âm (MediaRecorder) + transcript tiếng Anh (Web Speech API) khi trình duyệt hỗ trợ.
 */
export function useVoiceCapture() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const speechRecRef = useRef<{ stop: () => void } | null>(null);
  const transcriptRef = useRef('');

  const start = useCallback(async () => {
    transcriptRef.current = '';
    chunksRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    const mr = new MediaRecorder(stream, { mimeType: mime });
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.start(250);
    mediaRecorderRef.current = mr;

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognition;
      webkitSpeechRecognition?: new () => SpeechRecognition;
    };
    const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.lang = 'en-US';
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (ev: SpeechRecognitionEvent) => {
        let full = '';
        for (let i = 0; i < ev.results.length; i++) {
          full += ev.results[i][0].transcript;
        }
        transcriptRef.current = full.trim();
      };
      rec.start();
      speechRecRef.current = rec;
    }

    setIsRecording(true);
  }, []);

  const stop = useCallback(async (): Promise<VoiceCaptureResult> => {
    speechRecRef.current?.stop();
    speechRecRef.current = null;

    const mr = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    const mime = mr?.mimeType || 'audio/webm';

    const blob = await new Promise<Blob>((resolve, reject) => {
      if (!mr || mr.state === 'inactive') {
        resolve(new Blob(chunksRef.current, { type: mime }));
        return;
      }
      mr.onstop = () => {
        resolve(new Blob(chunksRef.current, { type: mime }));
      };
      mr.onerror = () => reject(new Error('Lỗi ghi âm.'));
      mr.stop();
    });

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    setIsRecording(false);

    let audioBase64: string | undefined;
    if (blob.size > 0) {
      const buf = await blob.arrayBuffer();
      audioBase64 = arrayBufferToBase64(buf);
    }

    const raw = transcriptRef.current.trim();
    const transcript =
      raw ||
      '(No speech detected in the browser — server will still normalize from this placeholder.)';

    return { transcript, audioBase64, mimeType: mime };
  }, []);

  return { isRecording, start, stop };
}
