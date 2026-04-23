import type {
  GeneralChatRequest,
  GeneralChatResponse,
  SearchRequest,
  SearchResponse
} from '../types';

function normalizeSpeechText(text: string): string {
  return text
    .replace(/\b618\s*food\.com\b/gi, '618food.com')
    .replace(/\b618food\.com\b/gi, '618food.com')
    .replace(/\b618FOOD\.COM\b/g, '618food.com');
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : `Request failed with ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

export async function search618Food(request: SearchRequest): Promise<SearchResponse> {
  const response = await fetch('/api/food/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });

  return parseJsonResponse<SearchResponse>(response);
}

export interface FoodAudioResponse {
  audioBase64?: string;
  mimeType?: string;
  text?: string;
  fallback?: boolean;
}

export async function request618FoodAudio(text: string): Promise<FoodAudioResponse> {
  const response = await fetch('/api/food/audio', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text })
  });

  return parseJsonResponse<FoodAudioResponse>(response);
}

export interface RealtimeTokenResponse {
  client_secret?: {
    value?: string;
    expires_at?: number;
  };
  model?: string;
  voice?: string;
}

export async function request618RealtimeToken(): Promise<RealtimeTokenResponse> {
  const response = await fetch('/api/realtime-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  return parseJsonResponse<RealtimeTokenResponse>(response);
}

export async function ask618Chat(request: GeneralChatRequest): Promise<GeneralChatResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });

  return parseJsonResponse<GeneralChatResponse>(response);
}

export function playBrowserNarration(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis is not available in this browser.'));
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(normalizeSpeechText(text));
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error('Speech synthesis playback failed.'));
    window.speechSynthesis.speak(utterance);
  });
}

export function stopBrowserNarration(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
}
