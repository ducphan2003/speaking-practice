import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Một player audio dùng chung: phát theo id tin nhắn, bấm lại cùng id thì tạm dừng.
 */
export function useInlineAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    setPlayingId(null);
  }, []);

  const play = useCallback(
    (messageId: string, url: string) => {
      const current = audioRef.current;
      if (playingId === messageId && current && !current.paused) {
        stop();
        return;
      }
      stop();
      let el = audioRef.current;
      if (!el) {
        el = new Audio();
        el.addEventListener("ended", () => setPlayingId(null));
        audioRef.current = el;
      }
      el.src = url;
      void el.play().then(() => setPlayingId(messageId)).catch(() => setPlayingId(null));
    },
    [playingId, stop],
  );

  useEffect(() => {
    return () => {
      const a = audioRef.current;
      if (a) {
        a.pause();
        a.src = "";
      }
    };
  }, []);

  return { playingId, play, stop };
}
