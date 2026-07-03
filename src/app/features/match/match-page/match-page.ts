import { Component, computed, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatchStoreService } from '../../../core/services/match-store.service';
import { PlayerRosterService } from '../../../core/services/player-roster.service';
import { X01Board } from '../x01-board/x01-board';
import { CricketBoard } from '../cricket-board/cricket-board';
import { AtcBoard } from '../atc-board/atc-board';
import { Numpad } from '../numpad/numpad';
import { MatchWonDialog, MatchWonDialogResult } from '../match-won-dialog/match-won-dialog';

@Component({
  selector: 'app-match-page',
  imports: [X01Board, CricketBoard, AtcBoard, Numpad],
  templateUrl: './match-page.html',
  styleUrl: './match-page.scss',
})
export class MatchPage {
  protected readonly matchStore = inject(MatchStoreService);
  private readonly roster = inject(PlayerRosterService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  protected readonly useSets = computed(() => (this.matchStore.activeMatch()?.format.setsToWinMatch ?? 1) > 1);
  protected readonly currentSetIndex = computed(
    () => 1 + Object.values(this.matchStore.setsWonByPlayer()).reduce((sum, n) => sum + n, 0),
  );

  private dialogOpened = false;

  constructor() {
    effect(() => {
      const complete = this.matchStore.isMatchComplete();
      if (!complete) {
        this.dialogOpened = false;
        return;
      }
      if (this.dialogOpened) {
        return;
      }
      this.dialogOpened = true;

      const winnerId = this.matchStore.winnerId();
      const winnerName = this.roster.players().find((p) => p.id === winnerId)?.name ?? '?';

      const ref = this.dialog.open<MatchWonDialog, unknown, MatchWonDialogResult>(MatchWonDialog, {
        data: { winnerName },
        disableClose: true,
      });
      ref.afterClosed().subscribe((result) => {
        this.matchStore.endMatch();
        this.router.navigate([result === 'new-match' ? '/new-match' : '/roster']);
      });
    });
  }
}
