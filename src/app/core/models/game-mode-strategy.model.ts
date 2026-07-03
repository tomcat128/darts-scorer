import { Dart } from './dart.model';

export interface TurnContext<TLegState> {
  /** Snapshot of every player's leg state at the moment the CURRENT turn began (used to revert on bust). */
  turnStartState: Record<string, TLegState>;
  dartsThrownThisTurn: Dart[];
}

export interface DartApplyResult<TLegState> {
  updatedPlayerState: TLegState;
  /** For turn-history UI, e.g. "60", "BUST", "3 Marks (20)", "0 (not checked in)". */
  scoreEffectDescription: string;
  /** Triggers revert-to-turnStartState and immediate turn end. */
  isBust: boolean;
  /** Leg ends immediately, even mid-visit. */
  legWon: boolean;
}

export interface GameModeStrategy<TLegState> {
  initLegState(playerIds: string[]): Record<string, TLegState>;
  applyDart(
    legState: Record<string, TLegState>,
    ctx: TurnContext<TLegState>,
    playerId: string,
    dart: Dart,
  ): DartApplyResult<TLegState>;
  /** Mode-specific shape consumed by the corresponding board component. */
  getDisplayState(legState: Record<string, TLegState>, playerId: string): unknown;
}
