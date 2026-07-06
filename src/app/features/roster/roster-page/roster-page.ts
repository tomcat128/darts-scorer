import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Player } from '../../../core/models/player.model';
import { PlayerRosterService } from '../../../core/services/player-roster.service';

@Component({
  selector: 'app-roster-page',
  imports: [MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './roster-page.html',
  styleUrl: './roster-page.scss',
})
export class RosterPage {
  private readonly router = inject(Router);
  protected readonly roster = inject(PlayerRosterService);

  protected readonly editingPlayerId = signal<string | null>(null);
  protected readonly editingName = signal('');

  addPlayer(input: HTMLInputElement): void {
    this.roster.addPlayer(input.value);
    input.value = '';
  }

  deletePlayer(id: string): void {
    if (this.editingPlayerId() === id) {
      this.editingPlayerId.set(null);
    }
    this.roster.deletePlayer(id);
  }

  startRename(player: Player): void {
    this.editingPlayerId.set(player.id);
    this.editingName.set(player.name);
  }

  confirmRename(id: string): void {
    this.roster.renamePlayer(id, this.editingName());
    this.editingPlayerId.set(null);
  }

  cancelRename(): void {
    this.editingPlayerId.set(null);
  }

  goToNewMatch(): void {
    this.router.navigate(['/new-match']);
  }
}
