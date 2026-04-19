import { SpeechClient, protos } from '@google-cloud/speech';
import { tryGetGoogleCloudCredentials } from './config';

/** Gợi ý: WEBM_OPUS (webm từ MediaRecorder), LINEAR16 (PCM), OGG_OPUS */
export const SpeechAudioEncoding =
  protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding;

let speechClient: SpeechClient | null = null;

function getSpeechClient(): SpeechClient {
  if (!speechClient) {
    const creds = tryGetGoogleCloudCredentials();
    speechClient = creds
      ? new SpeechClient({
          credentials: creds,
          projectId: creds.project_id,
        })
      : new SpeechClient();
  }
  return speechClient;
}

export type RecognizeSpeechInput = {
  /** PCM, WebM/Opus, FLAC, MP3, ... — khớp với `encoding` */
  audioContent: Buffer | Uint8Array;
  encoding: protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding | string;
  /** Bắt buộc với hầu hết encoding (WebM Opus thường 48000) */
  sampleRateHertz: number;
  languageCode?: string;
  enableAutomaticPunctuation?: boolean;
};

/**
 * Nhận dạng giọng nói (đoạn ngắn, một file) qua Google Cloud Speech-to-Text.
 * Với ghi âm từ trình duyệt (audio/webm), thường dùng WEBM_OPUS + 48000 Hz.
 */
export async function recognizeSpeech(
  input: RecognizeSpeechInput
): Promise<string> {
  const client = getSpeechClient();
  const buf = Buffer.isBuffer(input.audioContent)
    ? input.audioContent
    : Buffer.from(input.audioContent);

  const [response] = await client.recognize({
    config: {
      encoding: input.encoding as protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding,
      sampleRateHertz: input.sampleRateHertz,
      languageCode: input.languageCode ?? 'en-US',
      enableAutomaticPunctuation: input.enableAutomaticPunctuation ?? true,
    },
    audio: { content: buf },
  });

  const parts = response.results?.map((r) => r.alternatives?.[0]?.transcript).filter(Boolean) as
    | string[]
    | undefined;
  return (parts?.join(' ') ?? '').trim();
}
