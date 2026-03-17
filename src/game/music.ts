const MUSIC_STORAGE_KEY = 'cozy-town-builder-music-enabled';
const DEFAULT_SOUNDTRACK_URL = '/audio/neon-dreams.mp3';
const DEFAULT_VOLUME = 0.28;
const FADE_SECONDS = 1.6;

export class CitySoundtrack {
  private audio: HTMLAudioElement | null = null;
  private enabled = false;
  private unlocked = false;
  private fadeFrame: number | null = null;

  constructor() {
    const stored = window.localStorage.getItem(MUSIC_STORAGE_KEY);
    this.enabled = stored === 'true';
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    window.localStorage.setItem(MUSIC_STORAGE_KEY, String(this.enabled));

    if (!this.enabled) {
      this.fadeTo(0, true);
      return this.enabled;
    }

    void this.unlock();
    return this.enabled;
  }

  async unlock(): Promise<void> {
    if (!this.enabled) return;

    const audio = this.ensureAudio();
    if (!audio) return;

    this.unlocked = true;
    audio.volume = 0;

    try {
      await audio.play();
      this.fadeTo(DEFAULT_VOLUME, false);
    } catch {
      // Browsers can still block playback until a user gesture.
    }
  }

  dispose(): void {
    if (this.fadeFrame !== null) {
      window.cancelAnimationFrame(this.fadeFrame);
      this.fadeFrame = null;
    }
    if (!this.audio) return;
    this.audio.pause();
    this.audio.src = '';
    this.audio.load();
    this.audio = null;
  }

  private ensureAudio(): HTMLAudioElement | null {
    if (this.audio) return this.audio;

    const audio = new Audio(DEFAULT_SOUNDTRACK_URL);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;

    audio.addEventListener('error', () => {
      if (!this.unlocked) return;
      console.warn(
        `Cozy Town Builder could not load soundtrack from ${DEFAULT_SOUNDTRACK_URL}. ` +
          'Add your MP3 there or update the path in src/game/music.ts.'
      );
    });

    this.audio = audio;
    return audio;
  }

  private fadeTo(target: number, pauseOnEnd: boolean): void {
    if (!this.audio) return;
    if (this.fadeFrame !== null) {
      window.cancelAnimationFrame(this.fadeFrame);
      this.fadeFrame = null;
    }

    const audio = this.audio;
    const startVolume = audio.volume;
    const startTime = performance.now();
    const durationMs = FADE_SECONDS * 1000;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      audio.volume = startVolume + (target - startVolume) * progress;

      if (progress < 1) {
        this.fadeFrame = window.requestAnimationFrame(tick);
        return;
      }

      audio.volume = target;
      this.fadeFrame = null;
      if (pauseOnEnd && target <= 0.001) {
        audio.pause();
      }
    };

    this.fadeFrame = window.requestAnimationFrame(tick);
  }
}
