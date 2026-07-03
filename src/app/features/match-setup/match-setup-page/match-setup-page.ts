import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { PlayerRosterService } from '../../../core/services/player-roster.service';
import { MatchStoreService } from '../../../core/services/match-store.service';
import { GameModeConfig, MatchFormat, X01Config } from '../../../core/models/match-config.model';
import { X01Options } from '../x01-options/x01-options';
import { MatchFormatPicker, MatchFormatSelection } from '../match-format/match-format';

type Mode = 'x01' | 'cricket' | 'atc';

@Component({
  selector: 'app-match-setup-page',
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatListModule,
    X01Options,
    MatchFormatPicker,
  ],
  templateUrl: './match-setup-page.html',
  styleUrl: './match-setup-page.scss',
})
export class MatchSetupPage {
  private readonly router = inject(Router);
  protected readonly roster = inject(PlayerRosterService);
  private readonly matchStore = inject(MatchStoreService);

  protected readonly mode = signal<Mode>('x01');
  protected readonly x01Config = signal<X01Config>({
    mode: 'x01',
    startingScore: 501,
    checkoutMode: 'double',
    checkinMode: 'normal',
  });
  protected readonly formatSelection = signal<MatchFormatSelection>({
    bestOfLegs: 3,
    useSets: false,
    bestOfSets: 1,
  });
  protected readonly selectedPlayerIds = signal<string[]>([]);

  protected readonly availablePlayers = computed(() => {
    const selected = new Set(this.selectedPlayerIds());
    return this.roster.players().filter((p) => !selected.has(p.id));
  });

  protected readonly selectedPlayers = computed(() => {
    const byId = new Map(this.roster.players().map((p) => [p.id, p]));
    return this.selectedPlayerIds()
      .map((id) => byId.get(id))
      .filter((p) => p !== undefined);
  });

  protected readonly canStart = computed(() => this.selectedPlayerIds().length >= 1);

  private readonly gameConfig = computed<GameModeConfig>(() => {
    switch (this.mode()) {
      case 'x01':
        return this.x01Config();
      case 'cricket':
        return { mode: 'cricket' };
      case 'atc':
        return { mode: 'atc' };
    }
  });

  private readonly matchFormat = computed<MatchFormat>(() => {
    const sel = this.formatSelection();
    return {
      legsToWinSet: Math.floor(sel.bestOfLegs / 2) + 1,
      setsToWinMatch: sel.useSets ? Math.floor(sel.bestOfSets / 2) + 1 : 1,
    };
  });

  setMode(mode: Mode): void {
    this.mode.set(mode);
  }

  addToMatch(playerId: string): void {
    this.selectedPlayerIds.update((ids) => [...ids, playerId]);
  }

  removeFromMatch(playerId: string): void {
    this.selectedPlayerIds.update((ids) => ids.filter((id) => id !== playerId));
  }

  moveUp(index: number): void {
    if (index === 0) {
      return;
    }
    this.selectedPlayerIds.update((ids) => {
      const copy = [...ids];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  }

  moveDown(index: number): void {
    this.selectedPlayerIds.update((ids) => {
      if (index >= ids.length - 1) {
        return ids;
      }
      const copy = [...ids];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
  }

  startMatch(): void {
    if (!this.canStart()) {
      return;
    }
    this.matchStore.startNewMatch(this.gameConfig(), this.matchFormat(), this.selectedPlayerIds());
    this.router.navigate(['/match']);
  }
}
