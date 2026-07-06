import { Injectable, computed, inject, signal } from '@angular/core';
import { Dart } from '../models/dart.model';
import { TurnEvent } from '../engine/match-engine';
import { CheckoutMode, GameModeConfig, MatchFormat } from '../models/match-config.model';
import { MatchSnapshot, RemovedPlayerRecord } from '../models/match-state.model';
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
    return new MatchEngine(
      snapshot.gameConfig,
      snapshot.format,
      snapshot.playerIds,
      snapshot.throwLog,
      snapshot.removedPlayers ?? [],
      snapshot.playerCheckoutModes ?? {},
    );
  });

  readonly currentPlayerId = computed(() => this.engine()?.currentPlayerId ?? null);
  readonly activePlayerIds = computed(() => this.engine()?.activePlayerIds ?? []);
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

  /** The x01 checkout mode in effect for this player: their own override if set, else the match's configured default. */
  playerCheckoutModeFor(playerId: string): CheckoutMode {
    const snapshot = this.activeMatch();
    if (!snapshot) {
      return 'normal';
    }
    const override = snapshot.playerCheckoutModes?.[playerId];
    if (override) {
      return override;
    }
    return snapshot.gameConfig.mode === 'x01' ? snapshot.gameConfig.checkoutMode : 'normal';
  }

  /** Overrides one player's checkout mode for the rest of this match; reset by starting a new match. */
  setPlayerCheckoutMode(playerId: string, mode: CheckoutMode): void {
    const snapshot = this.activeMatch();
    if (!snapshot) {
      return;
    }
    this.activeMatch.set({
      ...snapshot,
      playerCheckoutModes: { ...(snapshot.playerCheckoutModes ?? {}), [playerId]: mode },
    });
    this.persist();
  }

  getDisplayState(playerId: string): unknown {
    return this.engine()?.getDisplayState(playerId) ?? null;
  }

  /** Darts of the player's current (in-progress) or most recently completed turn, whichever is later. */
  lastTurnEventsFor(playerId: string): TurnEvent[] {
    // It's this player's turn again but they haven't thrown yet - clear their previous
    // turn's darts immediately instead of leaving them displayed until the first new dart.
    if (playerId === this.currentPlayerId() && this.currentTurnDarts().length === 0) {
      return [];
    }
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

  /** No-op if fewer than 2 players are currently active, or the player is already removed. */
  removePlayerFromMatch(playerId: string): void {
    const snapshot = this.activeMatch();
    if (!snapshot) {
      return;
    }
    const active = this.activePlayerIds();
    if (active.length < 2 || !active.includes(playerId)) {
      return;
    }
    const removal: RemovedPlayerRecord = { playerId, afterDartCount: snapshot.throwLog.length };
    this.activeMatch.set({
      ...snapshot,
      removedPlayers: [...(snapshot.removedPlayers ?? []), removal],
    });
    this.persist();
  }

  undoLastDart(): void {
    const snapshot = this.activeMatch();
    if (!snapshot || snapshot.throwLog.length === 0) {
      return;
    }
    const throwLog = snapshot.throwLog.slice(0, -1);
    // Drop any removal that undo has rewound past, so it doesn't silently reapply once
    // play crosses that same dart count again.
    const removedPlayers = (snapshot.removedPlayers ?? []).filter((r) => r.afterDartCount <= throwLog.length);
    this.activeMatch.set({ ...snapshot, throwLog, removedPlayers });
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
