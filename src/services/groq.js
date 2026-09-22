import { File, UploadType } from 'expo-file-system';

import { getGroqApiKey } from './secureStore';

const BASE_URL = 'https://api.groq.com/openai/v1';
const CHAT_MODEL = 'qwen/qwen3.8-27b';
const TRANSCRIBE_MODEL = 'whisper-large-v3';

async function authHeader() {
  const key = await getGroqApiKey();
  if (!key) {
    throw new Error('Falta configurar tu API key de Groq en Ajustes.');
  }
  return `Bearer ${key}`;
}

async function readErrorMessage(res) {
  try {
    const data = await res.json();
    return data?.error?.message || JSON.stringify(data);
  } catch {
    return `HTTP ${res.status}`;
  }
}

/**
 * Sends a recorded audio file (m4a) to Groq Whisper and returns the transcribed Spanish text.
 * Uses expo-file-system's native multipart uploader instead of fetch+FormData: React Native's
 * FormData/fetch on the New Architecture rejects file-like parts ("Unsupported FormDataPart
 * implementation"), while File#upload builds the multipart request natively and works reliably.
 */
export async function transcribeAudio(fileUri) {
  const auth = await authHeader();
  const file = new File(fileUri);

  const result = await file.upload(`${BASE_URL}/audio/transcriptions`, {
    httpMethod: 'POST',
    uploadType: UploadType.MULTIPART,
    fieldName: 'file',
    mimeType: 'audio/m4a',
    headers: { Authorization: auth },
    parameters: {
      model: TRANSCRIBE_MODEL,
      language: 'es',
      response_format: 'json',
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Error de transcripción: ${result.body || `HTTP ${result.status}`}`);
  }
  const data = JSON.parse(result.body);
  return (data.text || '').trim();
}

/** Sends a chat-completion request to Groq's Llama model. `messages` follows the OpenAI chat format. */
export async function chatCompletion(messages, { temperature = 0.4, maxTokens = 900 } = {}) {
  const auth = await authHeader();
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    throw new Error(`Error de IA: ${await readErrorMessage(res)}`);
  }

  const data = await res.json();
  const content = (data.choices?.[0]?.message?.content || '').trim();

  // An empty completion (rate limiting, a truncated stream) would otherwise render as a
  // blank bubble, which looks like the app silently failed.
  if (!content) {
    throw new Error('La IA no devolvió respuesta. Reinténtalo en unos segundos.');
  }
  return content;
}
