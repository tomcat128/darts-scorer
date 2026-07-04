import { Component, computed, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PlayerRosterService } from '../../../core/services/player-roster.service';
import { MatchStoreService } from '../../../core/services/match-store.service';
import { CRICKET_NUMBERS, CricketLegState } from '../../../core/engine/strategies/cricket-strategy';
import { Dart, dartLabel } from '../../../core/models/dart.model';
import { RemovePlayerDialog } from '../remove-player-dialog/remove-player-dialog';

const MARK_SYMBOLS = ['', '/', 'X', '⊗'];

@Component({
  selector: 'app-cricket-board',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './cricket-board.html',
  styleUrl: './cricket-board.scss',
})
export class CricketBoard {
  protected readonly matchStore = inject(MatchStoreService);
  private readonly roster = inject(PlayerRosterService);
  private readonly dialog = inject(MatDialog);

  protected readonly numbers = CRICKET_NUMBERS;
  protected readonly useSets = computed(() => (this.matchStore.activeMatch()?.format.setsToWinMatch ?? 1) > 1);

  protected readonly players = computed(() => {
    const snapshot = this.matchStore.activeMatch();
    if (!snapshot) {
      return [];
    }
    const byId = new Map(this.roster.players().map((p) => [p.id, p]));
    return this.matchStore.activePlayerIds().map((id) => byId.get(id) ?? { id, name: '?', createdAt: 0 });
  });

  protected readonly canRemovePlayers = computed(() => this.matchStore.activePlayerIds().length >= 2);

  numberLabel(n: number): string {
    return n === 25 ? 'Bull' : String(n);
  }

  displayFor(playerId: string): CricketLegState {
    return this.matchStore.getDisplayState(playerId) as CricketLegState;
  }

  marksSymbol(playerId: string, n: number): string {
    return MARK_SYMBOLS[this.displayFor(playerId).marks[n]];
  }

  lastTurnDartsFor(playerId: string): Dart[] {
    return this.matchStore.lastTurnEventsFor(playerId).map((e) => e.dart);
  }

  dartLabel(dart: Dart): string {
    return dartLabel(dart);
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
