import type { SearchRequest, SearchResponse } from '../types';

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

export function playBrowserNarration(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis is not available in this browser.'));
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
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

