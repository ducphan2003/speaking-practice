import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech';
import {
  getGoogleTtsVoiceName,
  tryGetGoogleCloudCredentials,
} from './config';

let ttsClient: TextToSpeechClient | null = null;

function getTextToSpeechClient(): TextToSpeechClient {
  if (!ttsClient) {
    const creds = tryGetGoogleCloudCredentials();
    ttsClient = creds
      ? new TextToSpeechClient({
          credentials: creds,
          projectId: creds.project_id,
        })
      : new TextToSpeechClient();
  }
  return ttsClient;
}

export type SynthesizeSpeechInput = {
  text: string;
  /** Mặc định en-US */
  languageCode?: string;
  /** Ghi đè giọng (xem GOOGLE_TTS_VOICE) */
  voiceName?: string;
  audioEncoding?: protos.google.cloud.texttospeech.v1.AudioEncoding | string;
  speakingRate?: number;
};

export type SynthesizeSpeechResult = {
  audioContent: Buffer;
  mimeType: string;
};

/**
 * Chuyển văn bản thành âm thanh (mặc định MP3) qua Google Cloud Text-to-Speech.
 */
export async function synthesizeSpeech(
  input: SynthesizeSpeechInput
): Promise<SynthesizeSpeechResult> {
  const client = getTextToSpeechClient();
  const voiceName = input.voiceName ?? getGoogleTtsVoiceName();
  const languageCode = input.languageCode ?? 'en-US';

  const [response] = await client.synthesizeSpeech({
    input: { text: input.text },
    voice: {
      languageCode,
      name: voiceName,
    },
    audioConfig: {
      audioEncoding:
        (input.audioEncoding as protos.google.cloud.texttospeech.v1.AudioEncoding) ??
        'MP3',
      speakingRate: input.speakingRate ?? 1,
    },
  });

  const audio = response.audioContent;
  if (!audio || !(audio instanceof Uint8Array)) {
    throw new Error('Google TTS không trả về audioContent.');
  }

  return {
    audioContent: Buffer.from(audio),
    mimeType: 'audio/mpeg',
  };
}
