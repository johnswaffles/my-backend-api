const MUSIC_STORAGE_KEY = 'cozy-town-builder-music-enabled';

type Chord = readonly [number, number, number];

const CHORDS: readonly Chord[] = [
  [57, 60, 64], // A minor
  [53, 57, 60], // F major
  [48, 52, 55], // C major
  [55, 59, 62] // G major
];

const LEAD_PATTERN: readonly (number | null)[] = [
  7, null, 10, null, 12, null, 10, null,
  7, null, 5, null, 7, null, 3, null,
  7, null, 10, null, 14, null, 10, null,
  12, null, 10, null, 7, null, 5, null
];

const COUNTER_PATTERN: readonly (number | null)[] = [
  null, 19, null, 17, null, 19, null, 21,
  null, 17, null, 16, null, 17, null, 14,
  null, 19, null, 17, null, 19, null, 22,
  null, 21, null, 17, null, 16, null, 14
];

function midiToFrequency(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export class CitySoundtrack {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private delaySend: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private scheduler: number | null = null;
  private readonly tempo = 104;
  private readonly stepSeconds = 60 / this.tempo / 4;
  private nextStepTime = 0;
  private currentStep = 0;
  private enabled = true;

  constructor() {
    const stored = window.localStorage.getItem(MUSIC_STORAGE_KEY);
    this.enabled = stored === null ? true : stored === 'true';
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    window.localStorage.setItem(MUSIC_STORAGE_KEY, String(this.enabled));

    if (!this.enabled) {
      this.fadeTo(0.0001, 0.12);
      return this.enabled;
    }

    void this.unlock();
    return this.enabled;
  }

  async unlock(): Promise<void> {
    this.ensureContext();
    if (!this.context) return;

    if (this.context.state !== 'running') {
      try {
        await this.context.resume();
      } catch {
        return;
      }
    }

    if (!this.enabled) return;

    if (this.nextStepTime <= this.context.currentTime) {
      this.nextStepTime = this.context.currentTime + 0.04;
    }

    this.fadeTo(0.18, 0.22);
    this.startScheduler();
  }

  dispose(): void {
    if (this.scheduler !== null) {
      window.clearInterval(this.scheduler);
      this.scheduler = null;
    }

    if (this.context) {
      void this.context.close();
      this.context = null;
    }

    this.master = null;
    this.musicBus = null;
    this.delaySend = null;
    this.noiseBuffer = null;
  }

  private ensureContext(): void {
    if (this.context) return;

    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;

    try {
      this.context = new Ctx();
    } catch {
      this.context = null;
      return;
    }

    const ctx = this.context;
    const master = ctx.createGain();
    const musicBus = ctx.createGain();
    const delaySend = ctx.createGain();
    const delay = ctx.createDelay();
    const feedback = ctx.createGain();
    const lowpass = ctx.createBiquadFilter();
    const compressor = ctx.createDynamicsCompressor();

    master.gain.value = 0.0001;
    musicBus.gain.value = 0.9;
    delaySend.gain.value = 0.18;
    delay.delayTime.value = this.stepSeconds * 3;
    feedback.gain.value = 0.26;
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 4200;
    compressor.threshold.value = -18;
    compressor.knee.value = 20;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.18;

    musicBus.connect(master);
    delaySend.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(master);
    master.connect(lowpass);
    lowpass.connect(compressor);
    compressor.connect(ctx.destination);

    this.master = master;
    this.musicBus = musicBus;
    this.delaySend = delaySend;
    this.noiseBuffer = this.createNoiseBuffer(ctx);
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private fadeTo(target: number, duration: number): void {
    if (!this.context || !this.master) return;
    const t = this.context.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), t);
    this.master.gain.exponentialRampToValueAtTime(clamp(target, 0.0001, 0.4), t + duration);
  }

  private startScheduler(): void {
    if (this.scheduler !== null) return;
    this.scheduler = window.setInterval(() => this.scheduleLoop(), 40);
  }

  private scheduleLoop(): void {
    if (!this.context || !this.enabled) return;
    if (this.context.state !== 'running') return;

    while (this.nextStepTime < this.context.currentTime + 0.18) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.nextStepTime += this.stepSeconds;
      this.currentStep = (this.currentStep + 1) % 32;
    }
  }

  private scheduleStep(step: number, time: number): void {
    const chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
    const root = chord[0];
    const arpNotes = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 24];

    if (step % 4 === 0) {
      this.playKick(time);
      this.playBass(root - 12 + (step % 8 === 4 ? 7 : 0), time, this.stepSeconds * 0.95);
      this.playPad(chord, time, this.stepSeconds * 4.1);
    }

    if (step % 8 === 4 || step % 16 === 12) {
      this.playSnare(time);
    }

    if (step % 2 === 1) {
      this.playHat(time, step % 4 === 3 ? 0.04 : 0.028);
    }

    const arpNote = arpNotes[step % arpNotes.length];
    this.playArp(arpNote, time, this.stepSeconds * 0.55, step);

    const leadOffset = LEAD_PATTERN[step];
    if (leadOffset !== null) {
      this.playLead(root + leadOffset, time, this.stepSeconds * 1.65, 0.052);
    }

    const counterOffset = COUNTER_PATTERN[step];
    if (counterOffset !== null && step % 2 === 1) {
      this.playLead(root + counterOffset, time + this.stepSeconds * 0.1, this.stepSeconds * 1.15, 0.028, 'triangle');
    }
  }

  private playKick(time: number): void {
    if (!this.context || !this.musicBus) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(142, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.2, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
    osc.connect(gain);
    gain.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + 0.16);
  }

  private playSnare(time: number): void {
    if (!this.context || !this.musicBus || !this.noiseBuffer) return;

    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1700, time);
    filter.Q.value = 0.65;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.075, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);
    source.start(time);
    source.stop(time + 0.14);
  }

  private playHat(time: number, duration: number): void {
    if (!this.context || !this.musicBus || !this.noiseBuffer) return;

    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6200, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.018, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);
    source.start(time);
    source.stop(time + duration + 0.01);
  }

  private playBass(note: number, time: number, duration: number): void {
    this.playVoice(note, time, duration, 0.068, 'square', 1200, false);
  }

  private playPad(chord: Chord, time: number, duration: number): void {
    chord.forEach((note, index) => {
      this.playVoice(note + 12, time + index * 0.01, duration, 0.024, 'triangle', 980, false);
    });
  }

  private playArp(note: number, time: number, duration: number, step: number): void {
    this.playVoice(note, time, duration, step % 4 === 0 ? 0.04 : 0.03, 'square', 2400, true, step % 4 === 1 ? -6 : 6);
  }

  private playLead(
    note: number,
    time: number,
    duration: number,
    volume: number,
    wave: OscillatorType = 'square'
  ): void {
    this.playVoice(note, time, duration, volume, wave, 3200, true, wave === 'triangle' ? -5 : 0);
  }

  private playVoice(
    note: number,
    time: number,
    duration: number,
    volume: number,
    wave: OscillatorType,
    cutoff: number,
    useDelay: boolean,
    detune = 0
  ): void {
    if (!this.context || !this.musicBus) return;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    osc.type = wave;
    osc.frequency.setValueAtTime(midiToFrequency(note), time);
    osc.detune.value = detune;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, time);
    filter.Q.value = 1.1;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);

    if (useDelay && this.delaySend) {
      gain.connect(this.delaySend);
    }

    osc.start(time);
    osc.stop(time + duration + 0.02);
  }
}
