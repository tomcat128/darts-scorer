import { Injectable, computed, inject, signal } from '@angular/core';
import { Dart } from '../models/dart.model';
import { TurnEvent } from '../engine/match-engine';
import { GameModeConfig, MatchFormat } from '../models/match-config.model';
import { MatchSnapshot } from '../models/match-state.model';
import { MatchEngine } from '../engine/match-engine';
import { PersistenceService } from './persistence.service';

const ACTIVE_MATCH_KEY = 'darts.activeMatch.v1';

@Injectable({ providedIn: 'root' })
export class MatchStoreService {
  private readonly persistence = inject(PersistenceService);

  readonly activeMatch = signal<MatchSnapshot | null>(this.persistence.get(ACTIVE_MATCH_KEY, null));

  private readonly engine = computed<MatchEngine | null>(() => {
    const snapshot = this.activeMatch();
    if (!snapshot) {
      return null;
    }
    return new MatchEngine(snapshot.gameConfig, snapshot.format, snapshot.playerIds, snapshot.throwLog);
  });

  readonly currentPlayerId = computed(() => this.engine()?.currentPlayerId ?? null);
  readonly isMatchComplete = computed(() => this.engine()?.isMatchComplete ?? false);
  readonly winnerId = computed(() => this.engine()?.matchWinnerId ?? null);
  readonly currentTurnDarts = computed(() => this.engine()?.currentTurnDarts ?? []);
  readonly dartsRemainingInTurn = computed(() => 3 - this.currentTurnDarts().length);
  readonly legsWonByPlayer = computed(() => this.engine()?.legsWonByPlayer ?? {});
  readonly setsWonByPlayer = computed(() => this.engine()?.setsWonByPlayer ?? {});
  readonly currentLegIndex = computed(() => this.engine()?.currentLegIndex ?? 0);
  readonly eventHistory = computed(() => this.engine()?.eventHistory ?? []);

  hasActiveMatch(): boolean {
    return this.activeMatch() !== null;
  }

  getDisplayState(playerId: string): unknown {
    return this.engine()?.getDisplayState(playerId) ?? null;
  }

  /** Darts of the player's current (in-progress) or most recently completed turn, whichever is later. */
  lastTurnEventsFor(playerId: string): TurnEvent[] {
    const ownEvents = this.eventHistory().filter((e) => e.playerId === playerId);
    if (ownEvents.length === 0) {
      return [];
    }
    const lastTurnIndex = ownEvents[ownEvents.length - 1].turnIndex;
    return ownEvents.filter((e) => e.turnIndex === lastTurnIndex);
  }

  startNewMatch(gameConfig: GameModeConfig, format: MatchFormat, playerIds: string[]): void {
    const snapshot: MatchSnapshot = {
      id: crypto.randomUUID(),
      gameConfig,
      format,
      playerIds,
      throwLog: [],
      createdAt: Date.now(),
    };
    this.activeMatch.set(snapshot);
    this.persist();
  }

  recordDart(dart: Dart): void {
    const snapshot = this.activeMatch();
    if (!snapshot) {
      return;
    }
    this.activeMatch.set({
      ...snapshot,
      throwLog: [...snapshot.throwLog, { dart, timestamp: Date.now() }],
    });
    this.persist();
  }

  undoLastDart(): void {
    const snapshot = this.activeMatch();
    if (!snapshot || snapshot.throwLog.length === 0) {
      return;
    }
    this.activeMatch.set({ ...snapshot, throwLog: snapshot.throwLog.slice(0, -1) });
    this.persist();
  }

  endMatch(): void {
    this.activeMatch.set(null);
    this.persistence.remove(ACTIVE_MATCH_KEY);
  }

  private persist(): void {
    this.persistence.set(ACTIVE_MATCH_KEY, this.activeMatch());
  }
}
