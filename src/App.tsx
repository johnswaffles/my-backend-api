import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AudioStrip } from './features/local-eats/components/AudioStrip';
import { WidgetLauncherPage } from './features/local-eats/components/WidgetLauncherPage';
import { VoiceWidgetPanel } from './features/local-eats/components/VoiceWidgetPanel';
import { FOOD_BRAND } from './features/local-eats/schemas';
import { findSponsoredPlacement } from './features/local-eats/data/sponsoredPlacements';
import {
  ask618Chat,
  playBrowserNarration,
  request618FoodAudio,
  stopBrowserNarration
} from './features/local-eats/lib/client';
import type { FoodAudioResponse } from './features/local-eats/lib/client';
import type { ChatTurn, GeneralChatRequest } from './features/local-eats/types';

const LOADING_MESSAGES = ['Thinking...', 'Researching reviews...', 'Searching the internet...'];
const INITIAL_GREETING =
  "Hello! I’m 618FOOD.COM. Just tell me a town and what kind of food you want, and I’ll find the top restaurants.";
const MAX_AUDIO_CHARS = 900;
const CONTACT_API_BASE_URL = 'https://johnny-chat.onrender.com';

type ContactStatus = {
  kind: 'idle' | 'sending' | 'success' | 'error';
  message: string;
};

function getContactApiBase(): string {
  if (typeof window === 'undefined') return CONTACT_API_BASE_URL;
  const override = (window as Window & { JOHNNY_CONTACT_API_BASE_URL?: string }).JOHNNY_CONTACT_API_BASE_URL;
  return String(override || CONTACT_API_BASE_URL).replace(/\/+$/, '');
}

function navigateTo(path: string): void {
  if (typeof window === 'undefined') return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function getNormalizedPathname(): string {
  if (typeof window === 'undefined') return '/';
  const normalized = window.location.pathname.replace(/\/+$/, '');
  return normalized || '/';
}

function normalizeSpeechSummary(text: string): string {
  const compact = text
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();

  if (compact.length <= MAX_AUDIO_CHARS) {
    return compact;
  }

  const sentenceEnd = compact.lastIndexOf('. ', MAX_AUDIO_CHARS);
  if (sentenceEnd > 280) {
    return compact.slice(0, sentenceEnd + 1).trim();
  }

  const softCut = compact.lastIndexOf(', ', MAX_AUDIO_CHARS);
  if (softCut > 280) {
    return compact.slice(0, softCut).trim();
  }

  return compact.slice(0, MAX_AUDIO_CHARS).trim();
}

function getAudioSummary(conversation: ChatTurn[]): string {
  const latestWithResults = [...conversation]
    .reverse()
    .find((turn) => turn.role === 'assistant' && (turn.featuredWriteup || turn.restaurants?.length));

  if (!latestWithResults) {
    return '';
  }

  return normalizeSpeechSummary(
    latestWithResults.featuredWriteup || latestWithResults.restaurants?.[0]?.summary || ''
  );
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

function SiteNav({ currentPath }: { currentPath: string }): JSX.Element {
  const navItems = [
    { href: '/', label: 'Voice Widget' },
    { href: '/classic', label: 'Classic Search' },
    { href: '/contact', label: 'Contact' }
  ];

  return (
    <nav className="flex flex-wrap justify-center gap-2" aria-label="618FOOD pages">
      {navItems.map((item) => {
        const active = currentPath === item.href || (item.href === '/' && currentPath === '/widget');
        return (
          <a
            key={item.href}
            href={item.href}
            onClick={(event) => {
              event.preventDefault();
              navigateTo(item.href);
            }}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              active
                ? 'border-emerald-200 bg-emerald-700 text-white shadow-[0_12px_24px_rgba(22,83,44,0.18)]'
                : 'border-emerald-200 bg-white/88 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-50'
            }`}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}

function AdvertisingContactPage({ currentPath }: { currentPath: string }): JSX.Element {
  const [contactStatus, setContactStatus] = useState<ContactStatus>({ kind: 'idle', message: '' });
  const [submittingContact, setSubmittingContact] = useState(false);

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setSubmittingContact(true);
    setContactStatus({ kind: 'sending', message: 'Sending your message...' });

    try {
      const response = await fetch(`${getContactApiBase()}/api/contact`, {
        method: 'POST',
        body: formData
      });

      let payload: { ok?: boolean; error?: string; detail?: string } = {};
      try {
        payload = (await response.json()) as typeof payload;
      } catch {
        payload = {};
      }

      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error || payload.detail || 'The message could not be sent yet.');
      }

      form.reset();
      setContactStatus({
        kind: 'success',
        message: 'Thanks. Your message was sent to Johnny.'
      });
    } catch (error) {
      setContactStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong.'
      });
    } finally {
      setSubmittingContact(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(250,246,236,0.9)_34%,_rgba(236,244,227,0.98)_66%,_rgba(247,241,228,1)_100%)] text-stone-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(17,120,82,0.16),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(238,160,54,0.16),_transparent_28%)]" />
      <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
        <header className="rounded-[2rem] border border-white/70 bg-white/78 px-4 py-4 shadow-[0_18px_55px_rgba(61,79,42,0.12)] backdrop-blur-2xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-lg font-black text-white shadow-[0_16px_30px_rgba(22,83,44,0.18)]">
                618
              </div>
              <div>
                <div className="font-display text-2xl font-semibold tracking-tight text-[#173528] sm:text-3xl">
                  {FOOD_BRAND}
                </div>
                <div className="mt-1 text-xs font-medium uppercase tracking-[0.24em] text-stone-500">
                  Restaurant contact
                </div>
              </div>
            </div>
            <SiteNav currentPath={currentPath} />
          </div>
        </header>

        <section className="grid flex-1 items-start gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-white/75 bg-white/82 p-6 shadow-[0_24px_70px_rgba(49,67,38,0.14)] backdrop-blur-2xl sm:p-8">
            <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
              Contact Johnny
            </div>
            <h1 className="mt-5 max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight text-[#173528] sm:text-5xl">
              Tell us what you want to do on 618FOOD.COM.
            </h1>
            <div className="mt-7 grid gap-3 text-sm leading-6 text-stone-650 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <strong className="block text-emerald-950">Advertising</strong>
                Sponsored spots, thumbnails, links, and writeups.
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                <strong className="block text-emerald-950">Restaurant info</strong>
                Send updates, corrections, menus, or better links.
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white/80 p-4">
                <strong className="block text-emerald-950">Questions</strong>
                Ask about the site or what would fit your business.
              </div>
            </div>
          </div>

          <form
            onSubmit={handleContactSubmit}
            className="rounded-[2rem] border border-white/75 bg-white/88 p-5 shadow-[0_24px_70px_rgba(49,67,38,0.14)] backdrop-blur-2xl sm:p-7"
          >
            <input type="hidden" name="profile" value="food" />
            <input
              type="hidden"
              name="page_url"
              value={typeof window === 'undefined' ? '618FOOD.COM contact page' : window.location.href}
            />

            <div className="flex flex-col gap-2">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
                Simple message form
              </div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-[#173528]">
                Send Johnny the details.
              </h2>
              <p className="text-sm leading-6 text-stone-600">
                Name, email, message. Add a phone number or file only if it helps.
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-stone-600">Name</span>
                <input
                  name="name"
                  required
                  autoComplete="name"
                  className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Your name"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-stone-600">Email</span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-stone-600">Phone</span>
                <input
                  name="phone"
                  autoComplete="tel"
                  className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Optional"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-stone-600">Topic</span>
                <select
                  name="topic"
                  className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  defaultValue="Advertising / sponsored placement"
                >
                  <option>Advertising / sponsored placement</option>
                  <option>Restaurant writeup</option>
                  <option>Restaurant info update</option>
                  <option>Website or ordering link</option>
                  <option>General question</option>
                </select>
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-stone-600">
                  Business or restaurant name
                </span>
                <input
                  name="company"
                  autoComplete="organization"
                  className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Restaurant, business, or project name"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-stone-600">Message</span>
                <textarea
                  name="message"
                  required
                  rows={6}
                  className="mt-2 w-full resize-y rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base leading-7 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Tell Johnny what you need. For example: sponsored placement, restaurant writeup, menu/link update, or a question about 618FOOD.COM."
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-stone-600">
                  Photos, menu, or screenshots
                </span>
                <input
                  name="attachments"
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  className="mt-2 w-full rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-stone-700 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-700 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
                />
                <span className="mt-2 block text-xs leading-5 text-stone-500">
                  Optional. Useful for menus, logos, restaurant photos, or screenshots of what needs changed.
                </span>
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={submittingContact}
                className="rounded-full bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-[0_16px_34px_rgba(22,83,44,0.22)] transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingContact ? 'Sending...' : 'Send message'}
              </button>
              <div
                aria-live="polite"
                className={`text-sm font-semibold ${
                  contactStatus.kind === 'error'
                    ? 'text-red-700'
                    : contactStatus.kind === 'success'
                      ? 'text-emerald-800'
                      : 'text-stone-500'
                }`}
              >
                {contactStatus.message || 'Your message will be sent directly to Johnny.'}
              </div>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

export default function App(): JSX.Element {
  const [currentPath, setCurrentPath] = useState(getNormalizedPathname);
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
  const browserSpeechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioCacheRef = useRef<{
    text: string;
    audio: FoodAudioResponse | null;
    promise: Promise<FoodAudioResponse> | null;
  }>({
    text: '',
    audio: null,
    promise: null
  });
  const autoPlayedSummaryRef = useRef('');
  const [autoPlaybackEnabled, setAutoPlaybackEnabled] = useState(false);
  const [assistantLoadingLabel, setAssistantLoadingLabel] = useState(LOADING_MESSAGES[0]);
  const isWidgetLauncherPage = currentPath === '/' || currentPath === '/widget';
  const isWidgetPanelPage = currentPath === '/widget/panel';
  const isClassicPage = currentPath === '/classic';
  const isContactPage = currentPath === '/contact';
  const isWidgetRoute = isWidgetLauncherPage || isWidgetPanelPage;

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

  useEffect(() => {
    if (isWidgetRoute) return;
    const enableAutoPlayback = () => {
      setAutoPlaybackEnabled(true);
    };

    window.addEventListener('pointerdown', enableAutoPlayback, { once: true, passive: true });
    window.addEventListener('touchstart', enableAutoPlayback, { once: true, passive: true });
    window.addEventListener('keydown', enableAutoPlayback, { once: true });

    return () => {
      window.removeEventListener('pointerdown', enableAutoPlayback);
      window.removeEventListener('touchstart', enableAutoPlayback);
      window.removeEventListener('keydown', enableAutoPlayback);
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(getNormalizedPathname());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  async function prefetchAudio(text: string): Promise<FoodAudioResponse> {
    const normalizedText = text.trim();
    if (!normalizedText) {
      return { fallback: true, text: normalizedText };
    }

    const cached = audioCacheRef.current;
    if (cached.text === normalizedText && cached.audio) {
      return cached.audio;
    }
    if (cached.text === normalizedText && cached.promise) {
      return cached.promise;
    }

    const request = request618FoodAudio(normalizedText)
      .then((audio) => {
        audioCacheRef.current = {
          text: normalizedText,
          audio,
          promise: null
        };
        return audio;
      })
      .catch(() => {
        const fallbackAudio: FoodAudioResponse = {
          fallback: true,
          text: normalizedText
        };
        audioCacheRef.current = {
          text: normalizedText,
          audio: fallbackAudio,
          promise: null
        };
        return fallbackAudio;
      });

    audioCacheRef.current = {
      text: normalizedText,
      audio: null,
      promise: request
    };

    return request;
  }

  async function playSummaryText(text: string): Promise<void> {
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

    setAudioLoading(true);
    try {
      setPlayedResponseContent(text);
      const audio = await prefetchAudio(text);
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

  async function handlePlaySummary(): Promise<void> {
    const text = getAudioSummary(assistantTranscript);
    await playSummaryText(text);
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
            pageSummary:
              'A restaurant finder focused on real places and customer experience. It does not provide ordering, reservations, delivery, checkout, or partner services.',
            ...recentRestaurantContext
          }
        });

        const assistantTurn: ChatTurn = {
          role: 'assistant',
          content: assistant.reply,
          sources: assistant.sources || [],
          restaurants: assistant.restaurants || [],
          featuredWriteup: assistant.featuredWriteup || ''
        };
        const assistantAudioText = getAudioSummary([...historyBeforeMessage, assistantTurn]);
        void prefetchAudio(assistantAudioText);
        if (autoPlaybackEnabled && assistantAudioText && autoPlayedSummaryRef.current !== assistantAudioText) {
          autoPlayedSummaryRef.current = assistantAudioText;
          void playSummaryText(assistantAudioText);
        }

        setAssistantTranscript((current) => [...current, assistantTurn]);
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
    audioCacheRef.current = {
      text: '',
      audio: null,
      promise: null
    };
    autoPlayedSummaryRef.current = '';
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    browserSpeechRef.current = null;
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

  const audioSummary = getAudioSummary(assistantTranscript);
  const latestAssistantResponse = [...assistantTranscript].reverse().find((turn) => turn.role === 'assistant');
  const sponsoredMatch = findSponsoredPlacement(latestAssistantResponse?.restaurants || []);

  function renderPageTitle(): JSX.Element {
    return (
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-lg font-black text-white shadow-[0_16px_30px_rgba(22,83,44,0.18)]">
          618
        </div>
        <div>
          <div className="font-display text-2xl font-semibold tracking-tight text-[#173528] sm:text-3xl">
            {FOOD_BRAND}
          </div>
          <div className="mt-1 text-xs font-medium uppercase tracking-[0.24em] text-stone-500">
            Restaurant finder
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (isWidgetRoute) return;
    const latestAssistant = [...assistantTranscript].reverse().find((turn) => turn.role === 'assistant');
    if (latestAssistant?.content && latestAssistant.content !== playedResponseContent) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      browserSpeechRef.current = null;
      stopBrowserNarration();
      setIsPlaying(false);
      setPlayedResponseContent(null);
    }
  }, [assistantTranscript, playedResponseContent]);

  useEffect(() => {
    if (isWidgetRoute) return;
    const text = audioSummary.trim();
    if (!text || !hasSearched) return;
    void prefetchAudio(text);
  }, [audioSummary, hasSearched]);

  useEffect(() => {
    if (isWidgetRoute) return;
    const text = audioSummary.trim();
    if (!autoPlaybackEnabled || !hasSearched || !text) return;
    if (autoPlayedSummaryRef.current === text) return;
    autoPlayedSummaryRef.current = text;
    void handlePlaySummary();
  }, [autoPlaybackEnabled, audioSummary, hasSearched]);

  if (isWidgetLauncherPage) {
    return <WidgetLauncherPage currentPath={currentPath} />;
  }

  if (isWidgetPanelPage) {
    return <VoiceWidgetPanel />;
  }

  if (isContactPage) {
    return <AdvertisingContactPage currentPath={currentPath} />;
  }

  if (!isClassicPage) {
    return <WidgetLauncherPage currentPath="/" />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(250,246,236,0.82)_34%,_rgba(236,244,227,0.96)_66%,_rgba(247,241,228,1)_100%)] text-stone-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(111,162,98,0.24),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(206,179,95,0.18),_transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0))]" />
      <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27 opacity=%270.14%27/%3E%3C/svg%3E')] opacity-25" />

      <main
        className={`relative mx-auto flex min-h-screen w-full flex-col gap-5 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 ${
          isWidgetRoute ? 'max-w-5xl' : 'max-w-[1080px]'
        }`}
      >
        <header className="rounded-[2rem] border border-white/70 bg-white/72 px-4 py-4 shadow-[0_18px_55px_rgba(61,79,42,0.12)] backdrop-blur-2xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            {renderPageTitle()}
            <div className="flex flex-wrap gap-2">
              <SiteNav currentPath={currentPath} />
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
