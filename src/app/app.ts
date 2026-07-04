import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { ThemeService } from './core/services/theme.service';
import { MatchStoreService } from './core/services/match-store.service';
import type { EndMatchDialogResult } from './features/match/end-match-dialog/end-match-dialog';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatSlideToggleModule, MatIconModule, MatButtonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly theme = inject(ThemeService);
  protected readonly matchStore = inject(MatchStoreService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  async confirmEndMatch(): Promise<void> {
    const { EndMatchDialog } = await import('./features/match/end-match-dialog/end-match-dialog');
    const ref = this.dialog.open<InstanceType<typeof EndMatchDialog>, unknown, EndMatchDialogResult>(
      EndMatchDialog,
    );
    ref.afterClosed().subscribe((result) => {
      if (result === 'confirm') {
        this.matchStore.endMatch();
        this.router.navigate(['/new-match']);
      }
    });
  }
}
