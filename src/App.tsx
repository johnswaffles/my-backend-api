import { useEffect, useRef, useState } from 'react';
import { AudioStrip } from './features/local-eats/components/AudioStrip';
import { FOOD_BRAND } from './features/local-eats/schemas';
import { findSponsoredPlacement } from './features/local-eats/data/sponsoredPlacements';
import {
  ask618Chat,
  playBrowserNarration,
  request618FoodAudio,
  stopBrowserNarration
} from './features/local-eats/lib/client';
import type { ChatTurn, GeneralChatRequest } from './features/local-eats/types';

const LOADING_MESSAGES = ['Thinking...', 'Researching reviews...', 'Searching the internet...'];
const INITIAL_GREETING =
  "Hello! I’m 618FOOD.COM. Tell me a town or ZIP, and I’ll find the top restaurants there. If you have a food type in mind, include it for even better results.";

function getAudioSummary(conversation: ChatTurn[]): string {
  const assistantTurns = conversation.filter((turn) => turn.role === 'assistant');
  const latest = assistantTurns.at(-1);
  return latest?.featuredWriteup || latest?.content || 'Ask anything and 618FOOD.COM will chat with you.';
}

function summarizeAssistantTurn(turn: ChatTurn): string {
  if (turn.restaurants?.length) {
    const names = turn.restaurants
      .slice(0, 7)
      .map((restaurant) => restaurant.name)
      .filter(Boolean);
    if (names.length) {
      return `Previous restaurant results: ${names.join(', ')}.`;
    }
  }

  if (turn.featuredWriteup) {
    return turn.featuredWriteup.slice(0, 260);
  }

  return turn.content;
}

function buildChatHistoryForApi(conversation: ChatTurn[]): ChatTurn[] {
  return conversation
    .filter((turn, index) => !(index === 0 && turn.role === 'assistant'))
    .slice(-8)
    .map((turn) => {
      if (turn.role === 'assistant') {
        return {
          role: 'assistant' as const,
          content: summarizeAssistantTurn(turn)
        };
      }

      return {
        role: 'user' as const,
        content: turn.content
      };
    });
}

function getRecentRestaurantContext(conversation: ChatTurn[]): NonNullable<GeneralChatRequest['pageContext']> {
  const latestRestaurantTurn = [...conversation].reverse().find((turn) => turn.role === 'assistant' && turn.restaurants?.length);
  const recentRestaurants = latestRestaurantTurn?.restaurants?.slice(0, 7).map((restaurant) => ({
    place_id: restaurant.place_id,
    name: restaurant.name,
    formatted_address: restaurant.formatted_address ?? null,
    city: restaurant.city ?? null,
    phone: restaurant.phone ?? null,
    website: restaurant.website ?? null
  }));

  const recentLocation =
    latestRestaurantTurn?.restaurants?.find((restaurant) => restaurant.city)?.city ||
    latestRestaurantTurn?.restaurants?.[0]?.formatted_address ||
    undefined;

  return {
    recentLocation,
    recentRestaurants
  };
}

export default function App(): JSX.Element {
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantTranscript, setAssistantTranscript] = useState<ChatTurn[]>([
    {
      role: 'assistant',
      content: INITIAL_GREETING
    }
  ]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [playedResponseContent, setPlayedResponseContent] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [assistantLoadingLabel, setAssistantLoadingLabel] = useState(LOADING_MESSAGES[0]);

  const hasSearched = assistantTranscript.some((turn) => turn.role === 'user');

  useEffect(() => {
    return () => {
      stopBrowserNarration();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  useEffect(() => {
    if (!assistantLoading) {
      setAssistantLoadingLabel(LOADING_MESSAGES[0]);
      return;
    }

    let index = 0;
    setAssistantLoadingLabel(LOADING_MESSAGES[index]);
    const interval = window.setInterval(() => {
      index = (index + 1) % LOADING_MESSAGES.length;
      setAssistantLoadingLabel(LOADING_MESSAGES[index]);
    }, 10000);

    return () => {
      window.clearInterval(interval);
    };
  }, [assistantLoading]);

  async function handlePlaySummary(): Promise<void> {
    const text = getAudioSummary(assistantTranscript);
    if (!text.trim()) return;

    if (audioLoading) return;

    const currentAudio = audioRef.current;
    if (currentAudio) {
      if (!isPlaying) {
        if (currentAudio.ended) {
          currentAudio.currentTime = 0;
        }
        try {
          await currentAudio.play();
          setIsPlaying(true);
          return;
        } catch {
          // Fall through and regenerate audio if resuming fails.
        }
      } else {
        currentAudio.pause();
        stopBrowserNarration();
        setIsPlaying(false);
        return;
      }
    }

    const browserSpeech = typeof window !== 'undefined' ? window.speechSynthesis : null;
    if (browserSpeech) {
      if (browserSpeech.speaking || browserSpeech.paused) {
        if (browserSpeech.paused) {
          browserSpeech.resume();
          setIsPlaying(true);
        } else {
          browserSpeech.pause();
          setIsPlaying(false);
        }
        return;
      }

      setPlayedResponseContent(text);
      setIsPlaying(true);
      void playBrowserNarration(text)
        .catch(() => {
          setIsPlaying(false);
        })
        .finally(() => {
          setIsPlaying(false);
        });
      return;
    }

    setAudioLoading(true);
    try {
      setPlayedResponseContent(text);
      const audio = await request618FoodAudio(text);
      if (audio.audioBase64) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        const mimeType = audio.mimeType || 'audio/mpeg';
        const player = new Audio(`data:${mimeType};base64,${audio.audioBase64}`);
        player.onplay = () => setIsPlaying(true);
        player.onended = () => setIsPlaying(false);
        player.onerror = () => {
          setIsPlaying(false);
        };
        audioRef.current = player;
        await player.play();
        return;
      }
      await playBrowserNarration(text);
      setIsPlaying(false);
    } catch {
      try {
        await playBrowserNarration(text);
      } catch {
        setIsPlaying(false);
      } finally {
        setIsPlaying(false);
      }
    } finally {
      setAudioLoading(false);
    }
  }

  async function handleAssistantChat(value: string): Promise<void> {
    const followUp = value.trim();
    if (!followUp) return;

    setAssistantLoading(true);
    try {
      const historyBeforeMessage = assistantTranscript;
      const historyForApi = buildChatHistoryForApi(historyBeforeMessage);
      const nextTranscript: ChatTurn[] = [...historyBeforeMessage, { role: 'user', content: followUp }];
      const recentRestaurantContext = getRecentRestaurantContext(historyBeforeMessage);
      setAssistantTranscript(nextTranscript);

        const assistant = await ask618Chat({
          message: followUp,
          history: historyForApi,
          pageContext: {
            brand: FOOD_BRAND,
            pageTitle: '618FOOD.COM',
            pageSummary: 'A restaurant finder focused on real places and customer experience.',
            ...recentRestaurantContext
          }
        });

        setAssistantTranscript((current) => [
          ...current,
          {
            role: 'assistant',
            content: assistant.reply,
            sources: assistant.sources || [],
            restaurants: assistant.restaurants || [],
            featuredWriteup: assistant.featuredWriteup || ''
          }
        ]);
    } catch {
      setAssistantTranscript((current) => [
        ...current,
        {
          role: 'assistant',
          content: 'I could not reach 618FOOD.COM right now. Please try again in a moment.',
          sources: [],
          restaurants: []
        }
      ]);
    } finally {
      setAssistantLoading(false);
    }
  }

  function handleResetSearch(): void {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
      audioRef.current = null;
    }
    stopBrowserNarration();
    setIsPlaying(false);
    setAudioLoading(false);
    setAssistantLoading(false);
    setAssistantLoadingLabel(LOADING_MESSAGES[0]);
    setPlayedResponseContent(null);
    setAssistantTranscript([
      {
        role: 'assistant',
        content: INITIAL_GREETING
      }
    ]);
  }

  useEffect(() => {
    const latestAssistant = [...assistantTranscript].reverse().find((turn) => turn.role === 'assistant');
    if (latestAssistant?.content && latestAssistant.content !== playedResponseContent) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      stopBrowserNarration();
      setIsPlaying(false);
      setPlayedResponseContent(null);
    }
  }, [assistantTranscript, playedResponseContent]);

  const audioSummary = getAudioSummary(assistantTranscript);
  const latestAssistantResponse = [...assistantTranscript].reverse().find((turn) => turn.role === 'assistant');
  const sponsoredMatch = findSponsoredPlacement(latestAssistantResponse?.restaurants || []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(250,246,236,0.82)_34%,_rgba(236,244,227,0.96)_66%,_rgba(247,241,228,1)_100%)] text-stone-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(111,162,98,0.24),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(206,179,95,0.18),_transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0))]" />
      <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27 opacity=%270.14%27/%3E%3C/svg%3E')] opacity-25" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-[1080px] flex-col gap-5 px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
        <header className="rounded-[2rem] border border-white/70 bg-white/72 px-4 py-4 shadow-[0_18px_55px_rgba(61,79,42,0.12)] backdrop-blur-2xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-lg font-black text-white shadow-[0_16px_30px_rgba(22,83,44,0.18)]">
                618
              </div>
              <div>
                <div className="font-display text-2xl font-semibold tracking-tight text-[#173528] sm:text-3xl">
                  {FOOD_BRAND}
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="mx-auto w-full max-w-3xl">
          <AudioStrip
            summary={audioSummary}
            isPlaying={isPlaying}
            isLoading={audioLoading}
            assistantLoading={assistantLoading}
            assistantLoadingLabel={assistantLoadingLabel}
            conversation={assistantTranscript}
            showSearchInput={!hasSearched}
            sponsoredPlacement={sponsoredMatch?.placement || null}
            sponsoredRestaurant={sponsoredMatch?.restaurant || null}
            onPlay={handlePlaySummary}
            onResetSearch={handleResetSearch}
            onAskAssistant={handleAssistantChat}
          />
        </section>
      </main>
    </div>
  );
}
