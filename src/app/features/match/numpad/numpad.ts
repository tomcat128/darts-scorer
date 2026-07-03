import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { Multiplier } from '../../../core/models/dart.model';
import { MatchStoreService } from '../../../core/services/match-store.service';

@Component({
  selector: 'app-numpad',
  imports: [MatButtonModule, MatButtonToggleModule, MatIconModule],
  templateUrl: './numpad.html',
  styleUrl: './numpad.scss',
})
export class Numpad {
  private readonly matchStore = inject(MatchStoreService);

  protected readonly multiplier = signal<Multiplier>(1);
  protected readonly numbers = Array.from({ length: 20 }, (_, i) => i + 1);

  setMultiplier(multiplier: Multiplier): void {
    this.multiplier.set(multiplier);
  }

  throwNumber(segment: number): void {
    this.matchStore.recordDart({ segment, multiplier: this.multiplier() });
    this.multiplier.set(1);
  }

  throwBull(): void {
    if (this.multiplier() === 3) {
      return;
    }
    this.matchStore.recordDart({ segment: 25, multiplier: this.multiplier() });
    this.multiplier.set(1);
  }

  throwMiss(): void {
    this.matchStore.recordDart({ segment: 0, multiplier: 1 });
    this.multiplier.set(1);
  }

  undo(): void {
    this.matchStore.undoLastDart();
  }
}
