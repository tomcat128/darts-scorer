import { Injectable } from '@angular/core';

// CC0 "Incorrect Buzzer" by Producing_RayLite, freesound.org/s/700641
const BUST_SOUND_URL = '/sounds/bust.mp3';

@Injectable({ providedIn: 'root' })
export class SoundService {
  private bustAudio: HTMLAudioElement | null = null;

  private getBustAudio(): HTMLAudioElement {
    if (!this.bustAudio) {
      this.bustAudio = new Audio(BUST_SOUND_URL);
    }
    return this.bustAudio;
  }

  playBust(): void {
    const audio = this.getBustAudio();
    audio.currentTime = 0;
    void audio.play();
  }

  announceScore(total: number): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(String(total));
    utterance.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
}
