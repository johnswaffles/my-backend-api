import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ask618Chat, playBrowserNarration, request618RealtimeToken, stopBrowserNarration } from '../lib/client';
import { FOOD_BRAND } from '../schemas';
import type {
  ChatTurn,
  GeneralChatRequest,
  GeneralChatResponse,
  RestaurantAgentRestaurant
} from '../types';

const INITIAL_GREETING =
  "Hello! I’m 618FOOD.COM. Just tell me a town and what kind of food you want, and I’ll find the top restaurants.";
const LOADING_MESSAGES = ['Thinking...', 'Researching reviews...', 'Searching the internet...'];
const MAX_AUDIO_CHARS = 900;
const VOICE_CUBE_CELLS = Array.from({ length: 100 }, (_, index) => index);

type VoiceCubeMode = 'idle' | 'thinking' | 'listening' | 'speaking';

function getVoiceCubeCellClass(index: number, mode: VoiceCubeMode): string {
  const row = Math.floor(index / 10);
  const col = index % 10;
  const eyeCell =
    (row === 2 && [2, 3, 6, 7].includes(col)) ||
    (row === 3 && [2, 7].includes(col));
  const mouthCell =
    (row === 6 && col >= 2 && col <= 7) ||
    (row === 7 && col >= 3 && col <= 6) ||
    (row === 8 && col >= 4 && col <= 5);
  const cheekCell = row === 4 && [1, 8].includes(col);
  const signalCell = Math.abs(col - 4.5) + Math.abs(row - 5.5) <= 3;

  if (mode === 'speaking') {
    if (eyeCell) {
      return 'voice-cube-eye border-cyan-100/30 bg-cyan-200 shadow-[0_0_12px_rgba(125,249,255,0.75)]';
    }

    if (mouthCell) {
      return 'voice-cube-mouth border-rose-100/25 bg-rose-400 shadow-[0_0_14px_rgba(251,113,133,0.75)]';
    }

    if (cheekCell) {
      return 'voice-cube-cheek border-fuchsia-100/20 bg-fuchsia-300/85 shadow-[0_0_12px_rgba(232,121,249,0.55)]';
    }

    if (signalCell) {
      return 'voice-cube-signal border-emerald-100/25 bg-emerald-300/90 shadow-[0_0_12px_rgba(52,211,153,0.62)]';
    }

    return 'voice-cube-cell-speaking border-white/15 bg-cyan-800/80 shadow-[0_0_9px_rgba(34,211,238,0.22)]';
  }

  if (mode === 'thinking') {
    return 'voice-cube-cell-thinking border-white/12 bg-cyan-900/75 shadow-[0_0_8px_rgba(34,211,238,0.2)]';
  }

  if (mode === 'listening') {
    return 'border-cyan-100/20 bg-cyan-300/80 shadow-[0_0_10px_rgba(34,211,238,0.55)]';
  }

  return index % 11 === 0 || index % 17 === 0
    ? 'border-emerald-100/10 bg-emerald-300/45 shadow-[0_0_8px_rgba(52,211,153,0.24)]'
    : 'border-white/8 bg-cyan-950/70';
}

type RealtimeBridgeState = {
  pc: RTCPeerConnection | null;
  dc: RTCDataChannel | null;
  stream: MediaStream | null;
  audioEl: HTMLAudioElement | null;
  readyPromise: Promise<void> | null;
  pendingSpeakText: string | null;
  hasMicrophone: boolean;
};

type SearchInputMode = 'typed' | 'voice';

function estimateSpeechDurationMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = words / 2.35;
  return Math.min(60000, Math.max(5200, Math.round(estimatedSeconds * 1000) + 2200));
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
  if (sentenceEnd > 240) {
    return compact.slice(0, sentenceEnd + 1).trim();
  }

  const softCut = compact.lastIndexOf(', ', MAX_AUDIO_CHARS);
  if (softCut > 240) {
    return compact.slice(0, softCut).trim();
  }

  return compact.slice(0, MAX_AUDIO_CHARS).trim();
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

function domainFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function createSpeechRecognition(): any | null {
  if (typeof window === 'undefined') return null;
  const SpeechRecognitionCtor = (window as Window & {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }).SpeechRecognition || (window as Window & { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

  if (!SpeechRecognitionCtor) return null;

  try {
    return new SpeechRecognitionCtor();
  } catch {
    return null;
  }
}

function RestaurantPreview({ restaurant, rank }: { restaurant: RestaurantAgentRestaurant; rank: number }): JSX.Element {
  const websiteDomain = domainFromUrl(restaurant.website);
  const ratingText =
    typeof restaurant.rating === 'number' && Number.isFinite(restaurant.rating)
      ? `${restaurant.rating.toFixed(1)}`
      : 'Unrated';
  const reviewText =
    typeof restaurant.review_count === 'number' && Number.isFinite(restaurant.review_count)
      ? `${restaurant.review_count.toLocaleString()} reviews`
      : 'Review count unavailable';

  return (
    <div className="rounded-[1.1rem] border border-white/10 bg-white/6 px-4 py-3 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">#{rank}</div>
          <div className="mt-1 text-sm font-semibold text-white">{restaurant.name}</div>
          <div className="mt-1 text-xs leading-5 text-white/65">
            {ratingText} • {reviewText}
            {typeof restaurant.score === 'number' ? ` • Score ${restaurant.score.toFixed(2)}` : ''}
          </div>
        </div>
        <div className="inline-flex rounded-full bg-emerald-400/12 px-3 py-1 text-xs font-semibold text-emerald-100">
          {typeof restaurant.score === 'number' ? `Score ${restaurant.score.toFixed(1)}` : 'Ranked result'}
        </div>
      </div>

      {restaurant.summary ? <p className="mt-2 text-sm leading-6 text-white/75">{restaurant.summary}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {websiteDomain && restaurant.website ? (
          <a
            href={restaurant.website}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-50 transition hover:border-emerald-300/40 hover:bg-emerald-300/15"
          >
            {websiteDomain}
          </a>
        ) : null}
        {restaurant.maps_url ? (
          <a
            href={restaurant.maps_url}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold text-white/85 transition hover:border-emerald-300/40 hover:bg-white/12"
          >
            Open map
          </a>
        ) : null}
        {restaurant.phone ? (
          <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold text-white/65">
            {restaurant.phone}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function CasaRayaMiniAd(): JSX.Element {
  return (
    <a
      href="https://casaraya.toast.site/"
      target="_blank"
      rel="noreferrer"
      className="mt-3 flex items-center gap-3 rounded-[1rem] border border-emerald-300/15 bg-white/[0.06] p-2 text-left transition hover:border-emerald-300/35 hover:bg-white/[0.09]"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[0.8rem] bg-black">
        <img
          src="/sponsored/raya3.png"
          alt="Casa Raya Mexican Restaurant & Taqueria"
          className="h-full w-full object-contain"
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100/70">
          Sponsored
        </span>
        <span className="mt-0.5 block truncate text-sm font-semibold text-white">
          Casa Raya
        </span>
        <span className="block truncate text-xs text-white/55">
          Authentic Mexican in Mt. Vernon
        </span>
      </span>
    </a>
  );
}

export function VoiceWidgetPanel(): JSX.Element {
  const [conversation, setConversation] = useState<ChatTurn[]>([
    {
      role: 'assistant',
      content: INITIAL_GREETING
    }
  ]);
  const [draftText, setDraftText] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantLoadingLabel, setAssistantLoadingLabel] = useState(LOADING_MESSAGES[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioPaused, setAudioPaused] = useState(false);
  const [speechVisualActive, setSpeechVisualActive] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [statusLabel, setStatusLabel] = useState('VOICE CHAT');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchLocked, setSearchLocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const transcriptRef = useRef('');
  const realtimeBridgeRef = useRef<RealtimeBridgeState>({
    pc: null,
    dc: null,
    stream: null,
    audioEl: null,
    readyPromise: null,
    pendingSpeakText: null,
    hasMicrophone: false
  });
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const hadUserGestureRef = useRef(false);
  const legacyRecognitionRef = useRef<any | null>(null);
  const browserNarrationActiveRef = useRef(false);
  const browserNarrationPausedRef = useRef(false);
  const lastInputModeRef = useRef<SearchInputMode>('typed');
  const speechVisualTimerRef = useRef<number | null>(null);
  const voiceCubeMode: VoiceCubeMode = speechVisualActive || isPlaying
    ? 'speaking'
    : assistantLoading || audioLoading
    ? 'thinking'
    : isListening
    ? 'listening'
    : 'idle';
  const voiceActive = voiceCubeMode !== 'idle';
  const latestAudioSummary = getAudioSummary(conversation);
  const hasAudioSummary = Boolean(latestAudioSummary);

  useEffect(() => {
    let index = 0;
    if (!assistantLoading) {
      setAssistantLoadingLabel(LOADING_MESSAGES[0]);
      return;
    }

    setAssistantLoadingLabel(LOADING_MESSAGES[index]);
    const interval = window.setInterval(() => {
      index = (index + 1) % LOADING_MESSAGES.length;
      setAssistantLoadingLabel(LOADING_MESSAGES[index]);
    }, 10000);

    return () => window.clearInterval(interval);
  }, [assistantLoading]);

  useEffect(() => {
    if (!messageListRef.current) return;
    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [conversation, assistantLoading]);

  useEffect(() => {
    if (isCollapsed) return;
    if (isListening || assistantLoading || searchLocked) return;
    textInputRef.current?.focus();
  }, [assistantLoading, isCollapsed, isListening, searchLocked]);

  useEffect(() => {
    return () => {
      stopRealtimeBridge();
      stopSpeechVisual();
      stopBrowserNarration();
      if (legacyRecognitionRef.current) {
        try {
          legacyRecognitionRef.current.abort?.();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  function normalizeSpeechText(text: string): string {
    return text
      .replace(/\b618\s*food\.com\b/gi, '618food.com')
      .replace(/\b618food\.com\b/gi, '618food.com')
      .replace(/\b618FOOD\.COM\b/g, '618food.com');
  }

  function stopRealtimeBridge(): void {
    const bridge = realtimeBridgeRef.current;

    if (bridge.audioEl) {
      bridge.audioEl.pause();
      bridge.audioEl.srcObject = null;
      bridge.audioEl.remove();
    }

    if (bridge.pc) {
      try {
        bridge.pc.close();
      } catch {
        // ignore
      }
    }

    if (bridge.stream) {
      bridge.stream.getTracks().forEach((track) => track.stop());
    }

    audioRef.current = null;
    realtimeBridgeRef.current = {
      pc: null,
      dc: null,
      stream: null,
      audioEl: null,
      readyPromise: null,
      pendingSpeakText: null,
      hasMicrophone: false
    };
    stopSpeechVisual();
    setIsPlaying(false);
    setAudioPaused(false);
    setAudioLoading(false);
  }

  function setRealtimeMicEnabled(enabled: boolean): void {
    const bridge = realtimeBridgeRef.current;
    if (bridge.stream) {
      bridge.stream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  function clearSpeechVisualTimer(): void {
    if (speechVisualTimerRef.current !== null) {
      window.clearTimeout(speechVisualTimerRef.current);
      speechVisualTimerRef.current = null;
    }
  }

  function stopSpeechVisual(): void {
    clearSpeechVisualTimer();
    setSpeechVisualActive(false);
  }

  function startSpeechVisual(text: string): void {
    clearSpeechVisualTimer();
    setSpeechVisualActive(true);
    speechVisualTimerRef.current = window.setTimeout(() => {
      setSpeechVisualActive(false);
      setIsPlaying(false);
      setAudioPaused(false);
      if (!assistantLoading && !isListening) {
        setStatusLabel('VOICE CHAT');
      }
    }, estimateSpeechDurationMs(text));
  }

  function pauseCurrentPlayback(): boolean {
    let paused = false;
    const currentAudio = audioRef.current;
    if (currentAudio && !currentAudio.paused) {
      currentAudio.pause();
      paused = true;
    }

    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      browserNarrationActiveRef.current &&
      !window.speechSynthesis.paused
    ) {
      window.speechSynthesis.pause();
      browserNarrationPausedRef.current = true;
      paused = true;
    }

    if (paused) {
      stopSpeechVisual();
      setIsPlaying(false);
      setAudioPaused(true);
      if (!assistantLoading && !isListening) {
        setStatusLabel('VOICE CHAT');
      }
    }

    return paused;
  }

  function resumeCurrentPlayback(): boolean {
    const currentAudio = audioRef.current;
    if (currentAudio && currentAudio.paused && currentAudio.srcObject) {
      currentAudio.play().catch(() => {
        setIsPlaying(false);
      });
      if (latestAudioSummary) {
        startSpeechVisual(latestAudioSummary);
      }
      setIsPlaying(true);
      setAudioPaused(false);
      setStatusLabel('SPEAKING...');
      return true;
    }

    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      browserNarrationActiveRef.current &&
      browserNarrationPausedRef.current
    ) {
      window.speechSynthesis.resume();
      browserNarrationPausedRef.current = false;
      if (latestAudioSummary) {
        startSpeechVisual(latestAudioSummary);
      }
      setIsPlaying(true);
      setAudioPaused(false);
      setStatusLabel('SPEAKING...');
      return true;
    }

    return false;
  }

  async function ensureRealtimeBridge(options: { microphone?: boolean } = {}): Promise<void> {
    const needsMicrophone = Boolean(options.microphone);
    let bridge = realtimeBridgeRef.current;
    if (needsMicrophone && bridge.pc && !bridge.hasMicrophone) {
      stopRealtimeBridge();
      bridge = realtimeBridgeRef.current;
    }

    if (
      bridge.pc &&
      bridge.dc &&
      bridge.pc.connectionState !== 'closed' &&
      bridge.pc.connectionState !== 'failed' &&
      (!needsMicrophone || bridge.hasMicrophone)
    ) {
      if (bridge.readyPromise) {
        await bridge.readyPromise;
      }
      return;
    }

    if (bridge.readyPromise) {
      await bridge.readyPromise;
      if (needsMicrophone && !realtimeBridgeRef.current.hasMicrophone) {
        stopRealtimeBridge();
        await ensureRealtimeBridge({ microphone: true });
      }
      return;
    }

    const readyPromise = (async () => {
      const token = await request618RealtimeToken();
      const clientSecret = token.client_secret?.value;
      if (!clientSecret) {
        throw new Error('Missing realtime client secret.');
      }

      const audioConstraints: MediaTrackConstraints & Record<string, boolean> = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        googEchoCancellation: true,
        googNoiseSuppression: true,
        googAutoGainControl: true
      };

      const pc = new RTCPeerConnection();
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.setAttribute('playsinline', 'true');
      audioEl.preload = 'auto';
      audioEl.muted = false;
      audioEl.setAttribute('aria-hidden', 'true');
      audioEl.style.display = 'none';
      document.body.appendChild(audioEl);

      audioEl.onended = () => {
        stopSpeechVisual();
        setIsPlaying(false);
        setAudioPaused(false);
        if (!assistantLoading && !isListening) {
          setStatusLabel('VOICE CHAT');
        }
      };
      audioEl.onerror = () => {
        stopSpeechVisual();
        setIsPlaying(false);
        setAudioPaused(false);
        if (!assistantLoading && !isListening) {
          setStatusLabel('VOICE CHAT');
        }
      };

      pc.ontrack = async (event) => {
        audioEl.srcObject = event.streams[0];
        try {
          await audioEl.play();
        } catch {
          // ignore autoplay retry noise
        }
      };
      pc.onconnectionstatechange = () => {
        if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
          if (!assistantLoading && !isListening) {
            setStatusLabel('VOICE CHAT');
          }
        }
      };

      let stream: MediaStream | null = null;
      if (needsMicrophone) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints
        });
        pc.addTrack(stream.getAudioTracks()[0], stream);
      } else {
        pc.addTransceiver('audio', { direction: 'recvonly' });
      }

      const dc = pc.createDataChannel('oai-events');
      dc.onopen = () => {
        const pendingSpeakText = realtimeBridgeRef.current.pendingSpeakText;
        if (pendingSpeakText) {
          realtimeBridgeRef.current.pendingSpeakText = null;
          sendRealtimeSpeech(pendingSpeakText).catch(() => {
            // ignore flush failures
          });
        }
      };
      dc.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type === 'conversation.item.input_audio_transcription.completed') {
            const transcript = String(message.transcript || '').trim();
            if (transcript) {
              setIsMuted(true);
              setRealtimeMicEnabled(false);
              setIsListening(false);
              void sendAssistantMessage(transcript, 'voice');
            }
          }
          if (message?.type === 'response.done') {
            setAudioLoading(false);
          }
        } catch {
          // ignore malformed realtime events
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const realtimeModel = token.model || 'gpt-realtime-1.5';
      const realtimeResponse = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(realtimeModel)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          'Content-Type': 'application/sdp'
        },
        body: offer.sdp
      });

      if (!realtimeResponse.ok) {
        throw new Error('OpenAI Realtime handshake failed.');
      }

      const answerSdp = await realtimeResponse.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      realtimeBridgeRef.current = {
        pc,
        dc,
        stream,
        audioEl,
        readyPromise: null,
        pendingSpeakText: null,
        hasMicrophone: needsMicrophone
      };
      audioRef.current = audioEl;
    })()
      .catch((error) => {
        stopRealtimeBridge();
        throw error;
      })
      .finally(() => {
        if (realtimeBridgeRef.current.readyPromise === readyPromise) {
          realtimeBridgeRef.current.readyPromise = null;
        }
      });

    realtimeBridgeRef.current.readyPromise = readyPromise;
    await readyPromise;
  }

  async function sendRealtimeSpeech(text: string): Promise<void> {
    const normalizedText = normalizeSpeechText(text.trim());
    if (!normalizedText) return;

    await ensureRealtimeBridge({ microphone: false });
    setRealtimeMicEnabled(false);
    const bridge = realtimeBridgeRef.current;
    if (!bridge.dc || bridge.dc.readyState !== 'open') {
      bridge.pendingSpeakText = normalizedText;
      return;
    }

    bridge.dc.send(
      JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: normalizedText }]
        }
      })
    );

    bridge.dc.send(
      JSON.stringify({
        type: 'response.create',
        response: {
          instructions:
            `Read the following text exactly as written in a warm, natural voice. Do not add commentary or change the wording.\n\n${normalizedText}`
        }
      })
    );
  }

  async function playSummaryText(text: string): Promise<void> {
    if (!text.trim()) return;
    if (audioLoading) return;

    const normalizedText = normalizeSpeechText(text);
    stopBrowserNarration();
    browserNarrationActiveRef.current = false;
    browserNarrationPausedRef.current = false;
    setIsMuted(true);
    setRealtimeMicEnabled(false);
    const currentAudio = audioRef.current;
    if (currentAudio && isPlaying) {
      currentAudio.pause();
      setIsPlaying(false);
    }

    setAudioLoading(true);
    setAudioPaused(false);
    setStatusLabel('SPEAKING...');
    try {
      await sendRealtimeSpeech(normalizedText);
      setIsPlaying(true);
      startSpeechVisual(normalizedText);
    } catch {
      try {
        setIsPlaying(true);
        setAudioPaused(false);
        startSpeechVisual(normalizedText);
        await playBrowserNarration(normalizedText);
      } catch {
        setIsPlaying(false);
        if (!assistantLoading && !isListening) {
          setStatusLabel('VOICE CHAT');
        }
      } finally {
        stopSpeechVisual();
        setIsPlaying(false);
      }
    } finally {
      setAudioLoading(false);
    }
  }

  function playLatestSummaryText(text: string): void {
    void playSummaryText(text);
  }

  async function startVoiceSession(): Promise<void> {
    if (searchLocked) return;
    hadUserGestureRef.current = true;
    setIsMuted(false);
    setIsListening(true);
    setStatusLabel('LISTENING...');

    try {
      await ensureRealtimeBridge({ microphone: true });
      setRealtimeMicEnabled(true);
      const bridge = realtimeBridgeRef.current;
      if (bridge.audioEl) {
        try {
          await bridge.audioEl.play();
        } catch {
          // ignore autoplay retry noise
        }
      }
    } catch {
      stopRealtimeBridge();
      setIsListening(false);
      setStatusLabel('VOICE CHAT');
      throw new Error('Unable to start realtime voice session.');
    }
  }

  function stopVoiceSession(): void {
    stopListening();
    stopRealtimeBridge();
    setStatusLabel('VOICE CHAT');
  }

  async function sendAssistantMessage(text: string, inputMode: SearchInputMode = 'typed'): Promise<void> {
    const message = text.trim();
    if (!message) return;

    lastInputModeRef.current = inputMode;
    hadUserGestureRef.current = true;
    setSearchLocked(true);
    setIsMuted(true);
    setRealtimeMicEnabled(false);
    if (legacyRecognitionRef.current) {
      try {
        legacyRecognitionRef.current.abort?.();
      } catch {
        // ignore
      }
      legacyRecognitionRef.current = null;
    }
    setIsListening(false);
    setDraftText('');
    setAssistantLoading(true);
    setStatusLabel('THINKING...');
    setRealtimeMicEnabled(false);

    const historyBeforeMessage = conversation;
    const historyForApi = buildChatHistoryForApi(historyBeforeMessage);
    const nextConversation: ChatTurn[] = [...historyBeforeMessage, { role: 'user', content: message }];
    const recentRestaurantContext = getRecentRestaurantContext(historyBeforeMessage);
    setConversation(nextConversation);

    try {
      const assistant: GeneralChatResponse = await ask618Chat({
        message,
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
      setConversation((current) => [...current, assistantTurn]);

      if (hadUserGestureRef.current && assistantAudioText) {
        playLatestSummaryText(assistantAudioText);
      }
    } catch {
      setConversation((current) => [
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
      if (!isListening && !isPlaying) {
        setStatusLabel('VOICE CHAT');
      }
    }
  }

  function startListening(): void {
    if (assistantLoading || searchLocked) return;
    void startVoiceSession().catch(() => {
      const recognition = createSpeechRecognition();
      if (!recognition) {
        setConversation((current) => [
          ...current,
          {
            role: 'assistant',
            content: 'Speech recognition is not available in this browser. You can still type in the box below.',
            sources: [],
            restaurants: []
          }
        ]);
        setIsListening(false);
        setStatusLabel('VOICE CHAT');
        return;
      }

      // Legacy fallback when realtime startup is unavailable.
      setIsMuted(false);
      setIsListening(true);
      setStatusLabel('LISTENING...');
      transcriptRef.current = '';
      setDraftText('');

      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onresult = (event: any) => {
        let finalText = '';
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcript = String(result?.[0]?.transcript || '').trim();
          if (!transcript) continue;
          if (result.isFinal) {
            finalText += `${transcript} `;
          } else {
            interimText += `${transcript} `;
          }
        }

        const combined = `${transcriptRef.current} ${finalText}`.trim();
        if (finalText.trim()) {
          transcriptRef.current = combined;
          setIsMuted(true);
          setRealtimeMicEnabled(false);
          recognition.stop?.();
        }

        setDraftText((combined || interimText).trim());
      };

      recognition.onerror = () => {
        setIsListening(false);
        setStatusLabel('VOICE CHAT');
        legacyRecognitionRef.current = null;
        transcriptRef.current = '';
      };

      recognition.onend = () => {
        legacyRecognitionRef.current = null;
        setIsListening(false);
        setStatusLabel('VOICE CHAT');
        const transcript = transcriptRef.current.trim();
        transcriptRef.current = '';
        if (transcript) {
          setIsMuted(true);
          setRealtimeMicEnabled(false);
          void sendAssistantMessage(transcript, 'voice');
        }
      };

      legacyRecognitionRef.current = recognition;
      recognition.start();
    });
  }

  function stopListening(): void {
    if (!legacyRecognitionRef.current) return;
    try {
      legacyRecognitionRef.current.abort?.();
    } catch {
      // ignore
    }
    legacyRecognitionRef.current = null;
    transcriptRef.current = '';
    setIsListening(false);
    setStatusLabel('VOICE CHAT');
  }

  function toggleVoice(): void {
    if (isListening) {
      stopVoiceSession();
      return;
    }

    if (searchLocked) {
      hadUserGestureRef.current = true;
      if (isPlaying) {
        pauseCurrentPlayback();
        return;
      }
      if (resumeCurrentPlayback()) {
        return;
      }
      if (latestAudioSummary) {
        playLatestSummaryText(latestAudioSummary);
      }
      return;
    }

    if (isPlaying) {
      pauseCurrentPlayback();
      return;
    }

    startListening();
  }

  function handleAudioControl(): void {
    hadUserGestureRef.current = true;
    if (isPlaying) {
      pauseCurrentPlayback();
      return;
    }

    if (resumeCurrentPlayback()) {
      return;
    }

    if (latestAudioSummary) {
      playLatestSummaryText(latestAudioSummary);
    }
  }

  function handleMuteToggle(): void {
    if (searchLocked) return;
    setIsMuted((current) => {
      const next = !current;
      setRealtimeMicEnabled(!next);
      return next;
    });
  }

  function resetWidget(): void {
    stopListening();
    stopRealtimeBridge();
    stopBrowserNarration();
    browserNarrationActiveRef.current = false;
    browserNarrationPausedRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
    setIsPlaying(false);
    setAudioPaused(false);
    setAudioLoading(false);
    setAssistantLoading(false);
    setAssistantLoadingLabel(LOADING_MESSAGES[0]);
    setIsMuted(true);
    setSearchLocked(false);
    setDraftText('');
    setConversation([
      {
        role: 'assistant',
        content: INITIAL_GREETING
      }
    ]);
    setStatusLabel('VOICE CHAT');
    hadUserGestureRef.current = false;
    lastInputModeRef.current = 'typed';
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (searchLocked) return;
    const next = draftText.trim();
    if (!next) return;
    void sendAssistantMessage(next, 'typed');
  }

  function openIfClosed(): void {
    hadUserGestureRef.current = true;
    textInputRef.current?.focus();
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(16,18,19,0.96),_rgba(4,6,7,0.98)_58%,_rgba(0,0,0,1)_100%)] text-white">
      <div className="flex h-12 items-center justify-between border-b border-white/10 bg-[linear-gradient(180deg,rgba(26,31,34,0.98),rgba(11,14,16,0.98))] px-3.5 text-sm text-white">
        <button
          type="button"
          className="flex min-w-0 items-center gap-2 text-left"
          onClick={openIfClosed}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
          <span className="truncate font-semibold tracking-tight">618FOOD.COM</span>
          <span aria-hidden="true" className="text-sm text-white/80">💬</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMuteToggle}
            disabled={searchLocked}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
              searchLocked
                ? 'cursor-not-allowed border-white/10 bg-white/5 text-white/35'
                : isMuted
                ? 'border-rose-400/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15'
                : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-50 hover:bg-emerald-500/15'
            }`}
            aria-pressed={isMuted}
          >
            {searchLocked ? 'Mic locked' : isMuted ? 'Muted' : 'Voice on'}
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed((current) => !current)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/6 text-lg text-white transition hover:bg-white/12"
            aria-label={isCollapsed ? 'Expand widget' : 'Collapse widget'}
          >
            {isCollapsed ? '□' : '−'}
          </button>
        </div>
      </div>

      {isCollapsed ? (
        <div className="flex flex-1 items-center justify-center px-4 py-6">
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/12"
          >
            Open widget
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="relative mx-auto mt-4 flex h-[176px] w-[300px] max-w-[92%] shrink-0 items-center justify-center sm:mt-5">
            <style>
              {`
                @keyframes voiceCubeColorCycle {
                  0% { background: #0e7490; opacity: 0.55; transform: scale(0.82); box-shadow: 0 0 4px rgba(34, 211, 238, 0.22); }
                  28% { background: #22d3ee; opacity: 1; transform: scale(1.18); box-shadow: 0 0 14px rgba(34, 211, 238, 0.72); }
                  52% { background: #34d399; opacity: 0.9; transform: scale(0.98); box-shadow: 0 0 12px rgba(52, 211, 153, 0.62); }
                  76% { background: #c084fc; opacity: 0.95; transform: scale(1.1); box-shadow: 0 0 12px rgba(192, 132, 252, 0.56); }
                  100% { background: #0e7490; opacity: 0.55; transform: scale(0.82); box-shadow: 0 0 4px rgba(34, 211, 238, 0.22); }
                }

                @keyframes voiceCubeThinkWave {
                  0%, 100% { background: #164e63; opacity: 0.45; transform: scale(0.88); }
                  50% { background: #22d3ee; opacity: 0.95; transform: scale(1.12); box-shadow: 0 0 12px rgba(34, 211, 238, 0.5); }
                }

                @keyframes voiceCubeMouthPulse {
                  0%, 100% { transform: scaleY(0.45) scaleX(0.86); background: #fb7185; opacity: 0.7; }
                  35% { transform: scaleY(1.28) scaleX(1.08); background: #facc15; opacity: 1; box-shadow: 0 0 16px rgba(250, 204, 21, 0.75); }
                  68% { transform: scaleY(0.72) scaleX(1.18); background: #c084fc; opacity: 0.9; }
                }

                @keyframes voiceCubeEyeBlink {
                  0%, 82%, 100% { transform: scaleY(1); opacity: 1; }
                  88%, 92% { transform: scaleY(0.28); opacity: 0.55; }
                }

                @keyframes voiceCubeSignalBounce {
                  0%, 100% { transform: translateY(0) scale(0.82); opacity: 0.58; }
                  44% { transform: translateY(-2px) scale(1.16); opacity: 1; }
                  72% { transform: translateY(1px) scale(0.94); opacity: 0.78; }
                }

                @keyframes voiceCubeCheekGlow {
                  0%, 100% { opacity: 0.4; transform: scale(0.85); }
                  50% { opacity: 1; transform: scale(1.18); }
                }

                .voice-cube-cell-speaking {
                  animation: voiceCubeColorCycle 1.1s ease-in-out infinite;
                }

                .voice-cube-cell-thinking {
                  animation: voiceCubeThinkWave 1.7s ease-in-out infinite;
                }

                .voice-cube-mouth {
                  animation: voiceCubeMouthPulse 0.48s ease-in-out infinite;
                }

                .voice-cube-eye {
                  animation: voiceCubeEyeBlink 3.2s ease-in-out infinite;
                }

                .voice-cube-signal {
                  animation: voiceCubeSignalBounce 0.72s ease-in-out infinite;
                }

                .voice-cube-cheek {
                  animation: voiceCubeCheekGlow 1.4s ease-in-out infinite;
                }
              `}
            </style>
            <div className="pointer-events-none absolute left-1/2 top-7 h-[8.5rem] w-[8.5rem] -translate-x-1/2 rounded-[1.8rem] bg-cyan-400/10 blur-3xl" />
            <button
              type="button"
              onClick={toggleVoice}
              className={`absolute left-1/2 top-2 flex h-[138px] w-[138px] -translate-x-1/2 flex-col items-center rounded-[1.45rem] border border-cyan-200/10 bg-[linear-gradient(145deg,rgba(7,13,18,0.92),rgba(1,5,8,0.98))] px-3 py-4 shadow-[0_24px_52px_rgba(0,0,0,0.5),0_0_34px_rgba(34,211,238,0.08),inset_0_0_24px_rgba(255,255,255,0.04)] transition hover:scale-[1.01] focus:outline-none focus:ring-4 focus:ring-emerald-400/10 ${
                isListening || isPlaying ? 'border-cyan-200/30 shadow-[0_24px_52px_rgba(0,0,0,0.5),0_0_36px_rgba(34,211,238,0.2),inset_0_0_24px_rgba(255,255,255,0.05)]' : ''
              }`}
              aria-label={isListening ? 'Stop listening' : isPlaying ? 'Pause playback' : 'Press to talk'}
            >
              <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.34em] text-cyan-50/55">
                {statusLabel}
              </span>
              <div
                className={`relative mt-3 h-[5.9rem] w-[5.9rem] rounded-[1rem] border bg-[linear-gradient(145deg,rgba(4,10,18,0.98),rgba(8,18,27,0.98)_55%,rgba(2,6,12,0.98))] p-1.5 shadow-[0_18px_36px_rgba(0,0,0,0.45),inset_0_0_24px_rgba(255,255,255,0.05)] transition ${
                  voiceActive
                    ? 'border-cyan-200/45 shadow-[0_0_30px_rgba(34,211,238,0.24),0_18px_36px_rgba(0,0,0,0.45),inset_0_0_24px_rgba(255,255,255,0.05)]'
                    : 'border-white/10'
                }`}
                aria-hidden="true"
              >
                <div className="grid h-full w-full grid-cols-10 gap-[2px]">
                  {VOICE_CUBE_CELLS.map((cellIndex) => (
                    <span
                      key={cellIndex}
                      className={`aspect-square rounded-[2px] border transition-colors duration-300 ${getVoiceCubeCellClass(
                        cellIndex,
                        voiceCubeMode
                      )}`}
                      style={{
                        animationDelay:
                          voiceCubeMode === 'speaking'
                            ? `${(cellIndex % 5) * 42 + Math.floor(cellIndex / 10) * 24}ms`
                            : `${(cellIndex % 10) * 65 + Math.floor(cellIndex / 10) * 35}ms`
                      }}
                    />
                  ))}
                </div>
                <span className="pointer-events-none absolute inset-0 rounded-[1rem] bg-[linear-gradient(130deg,rgba(255,255,255,0.18),transparent_30%,transparent_68%,rgba(255,255,255,0.08))]" />
              </div>
            </button>

            <button
              type="button"
              onClick={handleMuteToggle}
              disabled={searchLocked}
              className={`absolute left-0 top-[72px] flex h-14 w-14 items-center justify-center rounded-full border text-xl shadow-[0_0_0_2px_rgba(32,185,96,0.2)] transition ${
                searchLocked
                  ? 'cursor-not-allowed border-white/10 bg-white/15 text-white/35 shadow-[0_0_0_2px_rgba(255,255,255,0.08)]'
                  : isMuted
                  ? 'border-rose-300 bg-rose-500 text-white shadow-[0_0_0_3px_rgba(244,63,94,0.18),0_0_16px_rgba(244,63,94,0.3)]'
                  : 'border-emerald-400/30 bg-emerald-500/90 text-white hover:bg-emerald-400'
              }`}
              aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              🎤
            </button>

            <button
              type="button"
              onClick={resetWidget}
              className="absolute right-0 top-[76px] rounded-[1.1rem] border border-white/15 bg-white/8 px-4 py-3 text-sm font-semibold text-white/90 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition hover:bg-white/12"
            >
              NEW CHAT
            </button>
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-hidden px-4 pb-3">
            <div
              ref={messageListRef}
              className="h-full overflow-y-auto rounded-[1.4rem] border border-white/10 bg-black/60 p-3"
            >
              {conversation.length ? (
                <div className="space-y-3">
                  {conversation.map((turn, index) => (
                    <div key={`${turn.role}-${index}-${turn.content.slice(0, 16)}`} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[92%] rounded-[1.2rem] px-4 py-3 text-sm leading-7 ${
                          turn.role === 'user'
                            ? 'bg-emerald-600 text-white shadow-[0_14px_30px_rgba(22,83,44,0.26)]'
                            : 'bg-white/8 text-white ring-1 ring-white/10'
                        }`}
                      >
                        {turn.role === 'assistant' && turn.featuredWriteup ? (
                          <div className="mb-3 rounded-[1rem] border border-emerald-400/15 bg-emerald-400/10 px-4 py-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                              Top spot writeup
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-white/85">
                              {turn.featuredWriteup}
                            </p>
                          </div>
                        ) : null}

                        <p className={`${turn.featuredWriteup ? 'mt-3' : ''} whitespace-pre-wrap`}>{turn.content}</p>

                        {turn.role === 'assistant' && turn.restaurants?.length ? (
                          <div className="mt-4 space-y-2">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                              Top results
                            </div>
                            <div className="space-y-2">
                              {turn.restaurants.slice(0, 4).map((restaurant, restaurantIndex) => (
                                <RestaurantPreview
                                  key={`${restaurant.place_id}-${restaurantIndex}`}
                                  restaurant={restaurant}
                                  rank={restaurantIndex + 1}
                                />
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {turn.role === 'assistant' && turn.sources?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {turn.sources.slice(0, 3).map((source) => (
                              <a
                                key={`${source.title}-${source.url}`}
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full border border-emerald-400/20 bg-white/8 px-3 py-1 text-xs font-semibold text-emerald-50 transition hover:border-emerald-300/40 hover:bg-white/12"
                              >
                                {source.title}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.1rem] border border-dashed border-white/10 bg-white/4 px-4 py-4 text-sm text-white/55">
                  Ask for a town and food type, and 618FOOD.COM will find the top restaurants.
                </div>
              )}

              {assistantLoading ? (
                <div className="mt-3 flex justify-start">
                  <div className="rounded-[1.2rem] bg-white/8 px-4 py-3 text-sm leading-7 text-white/60 ring-1 ring-white/10">
                    {assistantLoadingLabel}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {searchLocked ? (
            <div className="border-t border-white/10 bg-[linear-gradient(180deg,rgba(10,12,13,0.96),rgba(6,8,9,0.98))] px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                New Chat Required
              </div>
              <div className="mt-2 rounded-full border border-white/10 bg-black/55 px-4 py-3 text-sm text-white/72">
                Tap New Chat to start a new town and food search.
              </div>
              <CasaRayaMiniAd />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="shrink-0 border-t border-white/10 bg-[linear-gradient(180deg,rgba(10,12,13,0.96),rgba(6,8,9,0.98))] px-4 pb-6 pt-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Chat with 618FOOD.COM
              </div>
              <input
                ref={textInputRef}
                value={draftText}
                onChange={(event) => setDraftText(event.target.value)}
                placeholder="Type a message..."
                onPointerDown={() => {
                  hadUserGestureRef.current = true;
                }}
                className="mt-2 h-12 w-full rounded-full border border-white/10 bg-black/55 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/30 focus:ring-4 focus:ring-emerald-400/10"
              />
              <CasaRayaMiniAd />
            </form>
          )}
        </div>
      )}

      {!isCollapsed && (hasAudioSummary || isPlaying || audioLoading || audioPaused) ? (
        <button
          type="button"
          onClick={handleAudioControl}
          disabled={audioLoading && !isPlaying && !audioPaused}
          className={`absolute right-4 z-30 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] shadow-[0_12px_30px_rgba(0,0,0,0.28)] transition ${
            searchLocked ? 'bottom-[10.75rem]' : 'bottom-[8.75rem]'
          } ${
            audioLoading && !isPlaying && !audioPaused
              ? 'cursor-wait border-white/10 bg-white/10 text-white/45'
              : 'border-cyan-200/20 bg-cyan-300/12 text-cyan-50 hover:bg-cyan-300/18'
          }`}
          aria-label={isPlaying ? 'Pause audio' : audioPaused ? 'Resume audio' : 'Play latest audio'}
        >
          {isPlaying ? 'Pause audio' : audioPaused ? 'Resume audio' : audioLoading ? 'Audio...' : 'Play audio'}
        </button>
      ) : null}
    </div>
  );
}
