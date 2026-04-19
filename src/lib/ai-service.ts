export async function normalizeTranscript(transcript: string): Promise<string> {
  // TODO: Call AI to normalize transcript 1 to transcript 2
  // For now, return the original transcript as normalized
  return transcript;
}

export async function evaluateSpeaking(original: string, normalized: string) {
  // TODO: Call AI to compare original vs normalized and extract pronunciation/grammar errors
  return {
    pronunciation_score: 90,
    grammar_score: 85,
    details: [],
  };
}

export async function generateAIReply(context: any[], newNormalizedMessage: string, personaPrompt: string): Promise<string> {
  // TODO: Call LLM (Context + New Message + Persona) to generate reply
  return "This is a mock AI reply. Please implement actual LLM logic.";
}

export async function generateHint(context: any[]): Promise<string[]> {
  // TODO: Call LLM to suggest 2-3 hints based on history
  return ["Hint 1: Mock hint", "Hint 2: Another mock hint"];
}

export async function textToSpeech(text: string): Promise<string> {
  // TODO: Convert text to audio file using TTS service, upload to Cloudflare R2, return URL
  return "https://mock-audio-url.com/audio.mp3";
}
