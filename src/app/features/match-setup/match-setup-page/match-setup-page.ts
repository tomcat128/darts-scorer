import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { PlayerRosterService } from '../../../core/services/player-roster.service';
import { MatchStoreService } from '../../../core/services/match-store.service';
import { PersistenceService } from '../../../core/services/persistence.service';
import { GameModeConfig, MatchFormat, X01Config } from '../../../core/models/match-config.model';
import { X01Options } from '../x01-options/x01-options';
import { MatchFormatPicker, MatchFormatSelection } from '../match-format/match-format';

type Mode = 'x01' | 'cricket' | 'atc';

const SELECTED_PLAYER_IDS_KEY = 'darts.selectedPlayerIds.v1';
const MODE_KEY = 'darts.setupMode.v1';
const X01_CONFIG_KEY = 'darts.setupX01Config.v1';
const FORMAT_SELECTION_KEY = 'darts.setupFormatSelection.v2';
const RANDOMIZE_ORDER_KEY = 'darts.setupRandomizeOrder.v1';

@Component({
  selector: 'app-match-setup-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatListModule,
    MatSlideToggleModule,
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
  private readonly persistence = inject(PersistenceService);

  // All setup state below is persisted so it survives navigating away and back (e.g. once
  // a match ends or is aborted) instead of resetting to defaults every time this page is
  // re-created.
  protected readonly mode = signal<Mode>(this.persistence.get<Mode>(MODE_KEY, 'x01'));
  protected readonly x01Config = signal<X01Config>(
    this.persistence.get<X01Config>(X01_CONFIG_KEY, {
      mode: 'x01',
      startingScore: 501,
      checkoutMode: 'double',
      checkinMode: 'normal',
    }),
  );
  protected readonly formatSelection = signal<MatchFormatSelection>(
    this.persistence.get<MatchFormatSelection>(FORMAT_SELECTION_KEY, {
      legsMode: 'bestOf',
      legsCount: 3,
      useSets: false,
      setsMode: 'bestOf',
      setsCount: 3,
    }),
  );
  protected readonly selectedPlayerIds = signal<string[]>(this.persistence.get(SELECTED_PLAYER_IDS_KEY, []));
  protected readonly randomizeOrder = signal(this.persistence.get(RANDOMIZE_ORDER_KEY, false));

  constructor() {
    effect(() => {
      this.persistence.set(MODE_KEY, this.mode());
      this.persistence.set(X01_CONFIG_KEY, this.x01Config());
      this.persistence.set(FORMAT_SELECTION_KEY, this.formatSelection());
      this.persistence.set(SELECTED_PLAYER_IDS_KEY, this.selectedPlayerIds());
      this.persistence.set(RANDOMIZE_ORDER_KEY, this.randomizeOrder());
    });
  }

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

  protected readonly canStart = computed(() => this.selectedPlayers().length >= 1);

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
      legsToWinSet: sel.legsMode === 'firstTo' ? sel.legsCount : Math.floor(sel.legsCount / 2) + 1,
      setsToWinMatch: sel.useSets
        ? sel.setsMode === 'firstTo'
          ? sel.setsCount
          : Math.floor(sel.setsCount / 2) + 1
        : 1,
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

  setRandomizeOrder(randomize: boolean): void {
    this.randomizeOrder.set(randomize);
  }

  startMatch(): void {
    if (!this.canStart()) {
      return;
    }
    const existingIds = this.selectedPlayers().map((p) => p.id);
    const playerIds = this.randomizeOrder() ? this.shuffle(existingIds) : existingIds;
    this.matchStore.startNewMatch(this.gameConfig(), this.matchFormat(), playerIds);
    this.router.navigate(['/match']);
  }

  private shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
