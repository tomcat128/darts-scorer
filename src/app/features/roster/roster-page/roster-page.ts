import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PlayerRosterService } from '../../../core/services/player-roster.service';

@Component({
  selector: 'app-roster-page',
  imports: [MatListModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './roster-page.html',
  styleUrl: './roster-page.scss',
})
export class RosterPage {
  private readonly router = inject(Router);
  protected readonly roster = inject(PlayerRosterService);

  addPlayer(input: HTMLInputElement): void {
    this.roster.addPlayer(input.value);
    input.value = '';
  }

  deletePlayer(id: string): void {
    this.roster.deletePlayer(id);
  }

  goToNewMatch(): void {
    this.router.navigate(['/new-match']);
  }
}
