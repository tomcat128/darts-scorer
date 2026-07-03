import { Injectable } from '@angular/core';

/** Descending "wah-wah-wah" notes, synthesized so no audio asset is needed (works offline in the PWA). */
const ZONK_NOTES_HZ = [392, 349, 294];
const NOTE_DURATION_S = 0.18;

@Injectable({ providedIn: 'root' })
export class SoundService {
  private context: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (this.context) {
      return this.context;
    }
    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      return null;
    }
    this.context = new AudioContextCtor();
    return this.context;
  }

  playBust(): void {
    const ctx = this.getContext();
    if (!ctx) {
      return;
    }
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    ZONK_NOTES_HZ.forEach((freq, i) => {
      const start = now + i * NOTE_DURATION_S;
      const end = start + NOTE_DURATION_S;

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.85, end - 0.02);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    });
  }
}
