import { JWT } from 'google-auth-library';
import type { GoogleServiceAccountCredentials } from './config';

const NL_SCOPE = 'https://www.googleapis.com/auth/cloud-language';

type AnalyzeSyntaxResponse = {
  tokens?: Array<{
    text?: { content?: string };
    partOfSpeech?: { tag?: string };
  }>;
};

/** Map tag từ Cloud Natural Language (Universal) → nhãn ngắn cho UI. */
function universalTagToWordType(tag: string | undefined): string | null {
  if (!tag || tag === 'UNKNOWN' || tag === 'X' || tag === 'PUNCT') return null;
  const map: Record<string, string> = {
    NOUN: 'noun',
    VERB: 'verb',
    ADJ: 'adjective',
    ADV: 'adverb',
    PRON: 'pronoun',
    DET: 'determiner',
    ADP: 'preposition',
    CONJ: 'conjunction',
    NUM: 'numeral',
    PRT: 'particle',
    AFFIX: 'affix',
    INTJ: 'interjection',
  };
  return map[tag] ?? tag.toLowerCase();
}

/**
 * Phân tích từ loại (một token) qua Cloud Natural Language API — analyzeSyntax.
 * Cần bật API «Cloud Natural Language API» trên GCP.
 */
export async function analyzeEnglishWordType(
  word: string,
  credentials: GoogleServiceAccountCredentials
): Promise<string | null> {
  const w = word.trim();
  if (!w) return null;

  const client = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [NL_SCOPE],
  });
  const token = await client.getAccessToken();
  if (!token.token) {
    throw new Error('Không lấy được access token Google cho Natural Language API.');
  }

  const res = await fetch('https://language.googleapis.com/v1/documents:analyzeSyntax', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      document: {
        type: 'PLAIN_TEXT',
        language: 'en',
        content: w,
      },
      encodingType: 'UTF8',
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Natural Language API lỗi ${res.status}: ${errBody.slice(0, 400)}`);
  }

  const data = (await res.json()) as AnalyzeSyntaxResponse;
  const first = data.tokens?.[0];
  const tag = first?.partOfSpeech?.tag;
  return universalTagToWordType(tag);
}
