import { Component, computed, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Dart, dartLabel, dartValue } from '../../../core/models/dart.model';
import { CheckoutMode } from '../../../core/models/match-config.model';
import { PlayerRosterService } from '../../../core/services/player-roster.service';
import { MatchStoreService } from '../../../core/services/match-store.service';
import { CheckoutSuggestionService } from '../../../core/services/checkout-suggestion.service';
import { SoundService } from '../../../core/services/sound.service';
import { X01LegState } from '../../../core/engine/strategies/x01-strategy';
import { RemovePlayerDialog } from '../remove-player-dialog/remove-player-dialog';

const BUST_FLASH_DURATION_MS = 700;

@Component({
  selector: 'app-x01-board',
  imports: [DecimalPipe, MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './x01-board.html',
  styleUrl: './x01-board.scss',
})
export class X01Board {
  protected readonly matchStore = inject(MatchStoreService);
  private readonly roster = inject(PlayerRosterService);
  private readonly checkoutService = inject(CheckoutSuggestionService);
  private readonly sound = inject(SoundService);
  private readonly dialog = inject(MatDialog);

  protected readonly players = computed(() => {
    const snapshot = this.matchStore.activeMatch();
    if (!snapshot) {
      return [];
    }
    const byId = new Map(this.roster.players().map((p) => [p.id, p]));
    return this.matchStore.activePlayerIds().map((id) => byId.get(id) ?? { id, name: '?', createdAt: 0 });
  });

  protected readonly canRemovePlayers = computed(() => this.matchStore.activePlayerIds().length >= 2);

  protected readonly useSets = computed(() => (this.matchStore.activeMatch()?.format.setsToWinMatch ?? 1) > 1);

  protected readonly flashingPlayerId = signal<string | null>(null);
  private lastSeenEventCount = 0;

  constructor() {
    effect(() => {
      const events = this.matchStore.eventHistory();
      if (events.length > this.lastSeenEventCount) {
        const lastEvent = events[events.length - 1];
        if (lastEvent.description === 'BUST') {
          this.flashingPlayerId.set(lastEvent.playerId);
          this.sound.playBust();
          setTimeout(() => {
            if (this.flashingPlayerId() === lastEvent.playerId) {
              this.flashingPlayerId.set(null);
            }
          }, BUST_FLASH_DURATION_MS);
        } else if (this.matchStore.currentTurnDarts().length === 0) {
          // Turn just ended (3rd dart, or an early checkout) - announce what was scored.
          const finishedTurnEvents = events.filter(
            (e) => e.playerId === lastEvent.playerId && e.turnIndex === lastEvent.turnIndex,
          );
          const total = finishedTurnEvents.reduce((sum, e) => {
            const scored = Number(e.description);
            return sum + (Number.isFinite(scored) ? scored : 0);
          }, 0);
          this.sound.announceScore(total);
        }
      }
      this.lastSeenEventCount = events.length;
    });
  }

  displayFor(playerId: string): X01LegState {
    return this.matchStore.getDisplayState(playerId) as X01LegState;
  }

  lastTurnDartsFor(playerId: string): Dart[] {
    return this.matchStore.lastTurnEventsFor(playerId).map((e) => e.dart);
  }

  /** Total darts thrown by this player so far in the current leg (not reset per turn). */
  dartsThrownInLegFor(playerId: string): number {
    const currentLeg = this.matchStore.currentLegIndex();
    return this.matchStore.eventHistory().filter((e) => e.playerId === playerId && e.legIndex === currentLeg).length;
  }

  /** Always 3 slots, padded with null so the layout doesn't jump as darts are thrown. */
  dartSlotsFor(playerId: string): (Dart | null)[] {
    const darts = this.lastTurnDartsFor(playerId);
    return [0, 1, 2].map((i) => darts[i] ?? null);
  }

  dartLabel(dart: Dart): string {
    return dartLabel(dart);
  }

  turnTotalFor(playerId: string): number {
    return this.lastTurnDartsFor(playerId).reduce((sum, dart) => sum + dartValue(dart), 0);
  }

  averageFor(playerId: string): number {
    const own = this.matchStore.eventHistory().filter((e) => e.playerId === playerId);
    if (own.length === 0) {
      return 0;
    }
    // A bust (or a dart thrown before checking in) scores 0, not the dart's face value -
    // `description` holds the actual scored amount ('BUST' / not-checked-in aren't numeric).
    const total = own.reduce((sum, e) => {
      const scored = Number(e.description);
      return sum + (Number.isFinite(scored) ? scored : 0);
    }, 0);
    return (total / own.length) * 3;
  }

  checkoutLabelFor(playerId: string): string | null {
    if (playerId !== this.matchStore.currentPlayerId()) {
      return null;
    }
    const state = this.displayFor(playerId);
    if (!state.checkedIn) {
      return null;
    }
    const dartsLeft = this.matchStore.dartsRemainingInTurn();
    if (dartsLeft <= 0) {
      return null;
    }
    const mode = this.matchStore.playerCheckoutModeFor(playerId);
    const combo = this.checkoutService.suggest(state.remaining, dartsLeft, mode);
    return combo ? combo.map((o) => dartLabel(o.dart)).join(' → ') : null;
  }

  /** Short label for the checkout-mode button: 1x = straight out, 2x = double out, M = master out. */
  checkoutModeIcon(playerId: string): string {
    switch (this.matchStore.playerCheckoutModeFor(playerId)) {
      case 'double':
        return '2x';
      case 'master':
        return 'M';
      default:
        return '1x';
    }
  }

  setCheckoutMode(playerId: string, mode: CheckoutMode): void {
    this.matchStore.setPlayerCheckoutMode(playerId, mode);
  }

  confirmRemovePlayer(playerId: string, playerName: string): void {
    const ref = this.dialog.open(RemovePlayerDialog, { data: { playerName } });
    ref.afterClosed().subscribe((result) => {
      if (result === 'confirm') {
        this.matchStore.removePlayerFromMatch(playerId);
      }
    });
  }
}
