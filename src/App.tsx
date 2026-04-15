import { useEffect, useRef, useState } from 'react';
import { AudioStrip } from './features/local-eats/components/AudioStrip';
import { FOOD_BRAND } from './features/local-eats/schemas';
import {
  ask618Chat,
  playBrowserNarration,
  request618FoodAudio,
  stopBrowserNarration
} from './features/local-eats/lib/client';
import type { ChatTurn } from './features/local-eats/types';

function getAudioSummary(conversation: ChatTurn[]): string {
  const assistantTurns = conversation.filter((turn) => turn.role === 'assistant');
  return assistantTurns.at(-1)?.content || 'Ask anything and 618FOOD.COM will chat with you.';
}

export default function App(): JSX.Element {
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantTranscript, setAssistantTranscript] = useState<ChatTurn[]>([
    {
      role: 'assistant',
      content: "Hello! I'm 618FOOD.COM. How can I help you today?"
    }
  ]);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [playedResponseContent, setPlayedResponseContent] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      stopBrowserNarration();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  async function handlePlaySummary(): Promise<void> {
    if (!speakerEnabled) return;
    const text = getAudioSummary(assistantTranscript);
    if (!text.trim()) return;
    if (playedResponseContent === text) return;

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

  function toggleSpeaker(): void {
    setSpeakerEnabled((current) => {
      const next = !current;
      if (!next) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        stopBrowserNarration();
        setIsPlaying(false);
      } else if (audioRef.current && audioRef.current.paused) {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
      return next;
    });
  }

  async function handleAssistantChat(value: string): Promise<void> {
    const followUp = value.trim();
    if (!followUp) return;

    setAssistantLoading(true);
    try {
      const historyBeforeMessage = assistantTranscript;
      const nextTranscript: ChatTurn[] = [
        ...historyBeforeMessage,
        { role: 'user', content: followUp }
      ];
      setAssistantTranscript(nextTranscript);

      const assistant = await ask618Chat({
        message: followUp,
        history: historyBeforeMessage,
        pageContext: {
          brand: FOOD_BRAND,
          pageTitle: '618FOOD.COM',
          pageSummary: 'A general-purpose assistant running inside the 618FOOD.COM page shell.'
        }
      });

      setAssistantTranscript((current) => [
        ...current,
        {
          role: 'assistant',
          content: assistant.reply,
          sources: assistant.sources || []
        }
      ]);
    } catch {
      setAssistantTranscript((current) => [
        ...current,
        {
          role: 'assistant',
          content: 'I could not reach the live assistant just now. Please try again in a moment.',
          sources: []
        }
      ]);
    } finally {
      setAssistantLoading(false);
    }
  }

  useEffect(() => {
    const latestAssistant = [...assistantTranscript].reverse().find((turn) => turn.role === 'assistant');
    if (latestAssistant?.content && latestAssistant.content !== playedResponseContent) {
      setPlayedResponseContent(null);
    }
  }, [assistantTranscript, playedResponseContent]);

  const audioSummary = getAudioSummary(assistantTranscript);

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
            speakerEnabled={speakerEnabled}
            isPlaying={isPlaying}
            isLoading={audioLoading}
            assistantLoading={assistantLoading}
            conversation={assistantTranscript}
            onToggleSpeaker={toggleSpeaker}
            onPlay={handlePlaySummary}
            onAskAssistant={handleAssistantChat}
          />
        </section>
      </main>
    </div>
  );
}
