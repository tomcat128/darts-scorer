import { Injectable, inject, signal } from '@angular/core';
import { Player } from '../models/player.model';
import { PersistenceService } from './persistence.service';

const ROSTER_KEY = 'darts.roster.v1';

@Injectable({ providedIn: 'root' })
export class PlayerRosterService {
  private readonly persistence = inject(PersistenceService);

  readonly players = signal<Player[]>(this.persistence.get(ROSTER_KEY, []));

  addPlayer(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    const player: Player = { id: crypto.randomUUID(), name: trimmed, createdAt: Date.now() };
    this.players.update((players) => [...players, player]);
    this.persist();
  }

  deletePlayer(id: string): void {
    this.players.update((players) => players.filter((p) => p.id !== id));
    this.persist();
  }

  private persist(): void {
    this.persistence.set(ROSTER_KEY, this.players());
  }
}
