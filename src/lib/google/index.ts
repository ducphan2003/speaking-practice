export {
  getGeminiApiKey,
  getGeminiModel,
  tryGetGoogleCloudCredentials,
  getGoogleTtsVoiceName,
  type GoogleServiceAccountCredentials,
} from './config';

export {
  generateChatReply,
  streamChatReply,
  generateText,
  evaluateSpeakingPair,
  evaluatePracticeReadingFromAudio,
  normalizeTranscriptText,
  generateAnswerHint,
  conversationMessagesToGeminiTurns,
  type GeminiChatTurn,
  type SpeakingEvaluationResult,
} from './gemini';

export {
  recognizeSpeech,
  SpeechAudioEncoding,
  type RecognizeSpeechInput,
} from './speech-to-text';

export { synthesizeSpeech, type SynthesizeSpeechInput, type SynthesizeSpeechResult } from './text-to-speech';
