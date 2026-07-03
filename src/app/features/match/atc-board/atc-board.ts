import { Component, computed, inject } from '@angular/core';
import { PlayerRosterService } from '../../../core/services/player-roster.service';
import { MatchStoreService } from '../../../core/services/match-store.service';
import { ATC_PROGRESSION, AtcLegState } from '../../../core/engine/strategies/around-the-clock-strategy';
import { Dart, dartLabel } from '../../../core/models/dart.model';

@Component({
  selector: 'app-atc-board',
  imports: [],
  templateUrl: './atc-board.html',
  styleUrl: './atc-board.scss',
})
export class AtcBoard {
  protected readonly matchStore = inject(MatchStoreService);
  private readonly roster = inject(PlayerRosterService);
  protected readonly progression = ATC_PROGRESSION;
  protected readonly useSets = computed(() => (this.matchStore.activeMatch()?.format.setsToWinMatch ?? 1) > 1);

  protected readonly players = computed(() => {
    const snapshot = this.matchStore.activeMatch();
    if (!snapshot) {
      return [];
    }
    const byId = new Map(this.roster.players().map((p) => [p.id, p]));
    return snapshot.playerIds.map((id) => byId.get(id) ?? { id, name: '?', createdAt: 0 });
  });

  displayFor(playerId: string): AtcLegState {
    return this.matchStore.getDisplayState(playerId) as AtcLegState;
  }

  targetLabel(playerId: string): string {
    const idx = this.displayFor(playerId).index;
    if (idx >= this.progression.length) {
      return 'Fertig!';
    }
    const target = this.progression[idx];
    return target === 25 ? 'Bull' : String(target);
  }

  isDone(playerId: string, stepIndex: number): boolean {
    return stepIndex < this.displayFor(playerId).index;
  }

  lastTurnDartsFor(playerId: string): Dart[] {
    return this.matchStore.lastTurnEventsFor(playerId).map((e) => e.dart);
  }

  dartLabel(dart: Dart): string {
    return dartLabel(dart);
  }
}
