import { Injectable, effect, inject, signal } from '@angular/core';
import { PersistenceService } from './persistence.service';

const THEME_KEY = 'darts.darkMode.v1';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly persistence = inject(PersistenceService);

  readonly isDark = signal<boolean>(this.persistence.get(THEME_KEY, this.prefersDark()));

  constructor() {
    effect(() => {
      document.documentElement.style.colorScheme = this.isDark() ? 'dark' : 'light';
      this.persistence.set(THEME_KEY, this.isDark());
    });
  }

  toggle(): void {
    this.isDark.update((value) => !value);
  }

  private prefersDark(): boolean {
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
