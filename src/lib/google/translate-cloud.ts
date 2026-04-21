import { JWT } from 'google-auth-library';
import type { GoogleServiceAccountCredentials } from './config';

const TRANSLATE_SCOPE = 'https://www.googleapis.com/auth/cloud-translation';

type TranslateV2Response = {
  data?: {
    translations?: Array<{ translatedText?: string }>;
  };
};

/**
 * Dịch EN → VI qua Cloud Translation API v2 (REST).
 * Cần bật API "Cloud Translation API" trên GCP và service account có quyền gọi.
 */
export async function translateEnglishToVietnamese(
  text: string,
  credentials: GoogleServiceAccountCredentials
): Promise<string> {
  const client = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [TRANSLATE_SCOPE],
  });
  const token = await client.getAccessToken();
  if (!token.token) {
    throw new Error('Không lấy được access token Google cho Translation API.');
  }

  const res = await fetch('https://translation.googleapis.com/language/translate/v2', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: text,
      source: 'en',
      target: 'vi',
      format: 'text',
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Translation API lỗi ${res.status}: ${errBody.slice(0, 500)}`);
  }

  const data = (await res.json()) as TranslateV2Response;
  const translated = data.data?.translations?.[0]?.translatedText;
  if (!translated?.trim()) {
    throw new Error('Translation API không trả về bản dịch.');
  }
  return translated.trim();
}
