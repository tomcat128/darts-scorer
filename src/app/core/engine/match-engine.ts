import { Dart } from '../models/dart.model';
import { CheckoutMode, GameModeConfig, MatchFormat } from '../models/match-config.model';
import { RemovedPlayerRecord, ThrowEvent } from '../models/match-state.model';
import { GameModeStrategy, TurnContext } from '../models/game-mode-strategy.model';
import { X01Strategy } from './strategies/x01-strategy';
import { CricketStrategy } from './strategies/cricket-strategy';
import { AroundTheClockStrategy } from './strategies/around-the-clock-strategy';

export interface TurnEvent {
  playerId: string;
  dart: Dart;
  description: string;
  turnIndex: number;
  legIndex: number;
}

function createStrategy(
  gameConfig: GameModeConfig,
  playerCheckoutModes: Record<string, CheckoutMode>,
): GameModeStrategy<unknown> {
  switch (gameConfig.mode) {
    case 'x01':
      return new X01Strategy(gameConfig, playerCheckoutModes);
    case 'cricket':
      return new CricketStrategy();
    case 'atc':
      return new AroundTheClockStrategy();
  }
}

function rotate<T>(items: T[], shift: number): T[] {
  const n = items.length;
  const s = ((shift % n) + n) % n;
  return [...items.slice(s), ...items.slice(0, s)];
}

/**
 * Mode-agnostic turn/leg/set/match progression. Zero Angular dependencies, replay-friendly:
 * constructing with a throwLog replays every dart through recordDart() to deterministically
 * reconstruct whose turn each dart belonged to (turn order is a pure function of the rules,
 * so the log itself doesn't need to carry playerId). removedPlayers is replayed alongside it,
 * each removal taking effect at the exact dart count it was recorded at - see
 * applyDueRemovals().
 */
export class MatchEngine {
  private readonly strategy: GameModeStrategy<unknown>;
  private readonly playerIds: string[];
  private activeIds: string[];
  private readonly format: MatchFormat;

  private legIndexGlobal = 0;
  private turnIndex = 0;
  private throwOrderForLeg: string[];
  private currentPlayerIndex = 0;

  private legState: Record<string, unknown>;
  private turnCtx: TurnContext<unknown>;

  private legsWonInSet: Record<string, number> = {};
  private setsWon: Record<string, number> = {};
  private matchComplete = false;
  private winnerId: string | null = null;

  private readonly throwLog: ThrowEvent[] = [];
  private readonly events: TurnEvent[] = [];

  constructor(
    gameConfig: GameModeConfig,
    format: MatchFormat,
    playerIds: string[],
    throwLog: ThrowEvent[] = [],
    removedPlayers: RemovedPlayerRecord[] = [],
    playerCheckoutModes: Record<string, CheckoutMode> = {},
  ) {
    this.strategy = createStrategy(gameConfig, playerCheckoutModes);
    this.playerIds = playerIds;
    this.activeIds = [...playerIds];
    this.format = format;

    for (const id of playerIds) {
      this.legsWonInSet[id] = 0;
      this.setsWon[id] = 0;
    }
    this.throwOrderForLeg = rotate(this.activeIds, this.legIndexGlobal);
    this.legState = this.strategy.initLegState(this.activeIds);
    this.turnCtx = { turnStartState: this.cloneLegState(), dartsThrownThisTurn: [] };

    let dartCount = 0;
    for (const event of throwLog) {
      this.applyDueRemovals(removedPlayers, dartCount);
      this.recordDart(event.dart, event.timestamp);
      dartCount++;
    }
    this.applyDueRemovals(removedPlayers, dartCount);
  }

  /** Takes effect exactly at the dart count recorded when the removal happened, so darts the
   *  player already threw stay attributed to them while every turn after is skipped for them. */
  private applyDueRemovals(removedPlayers: RemovedPlayerRecord[], dartCount: number): void {
    for (const removal of removedPlayers) {
      if (removal.afterDartCount === dartCount && this.activeIds.includes(removal.playerId)) {
        this.removeFromRotation(removal.playerId);
      }
    }
  }

  private removeFromRotation(playerId: string): void {
    const wasCurrent = this.currentPlayerId === playerId;
    const fallbackNextId = this.throwOrderForLeg[(this.currentPlayerIndex + 1) % this.throwOrderForLeg.length];
    const pointerId = wasCurrent ? fallbackNextId : this.currentPlayerId;

    this.activeIds = this.activeIds.filter((id) => id !== playerId);
    this.throwOrderForLeg = this.throwOrderForLeg.filter((id) => id !== playerId);
    delete this.legState[playerId];

    this.currentPlayerIndex = Math.max(this.throwOrderForLeg.indexOf(pointerId), 0);
    if (wasCurrent) {
      this.turnCtx = { turnStartState: this.cloneLegState(), dartsThrownThisTurn: [] };
    }
  }

  private cloneLegState(): Record<string, unknown> {
    return structuredClone(this.legState);
  }

  get currentPlayerId(): string {
    return this.throwOrderForLeg[this.currentPlayerIndex];
  }

  get isMatchComplete(): boolean {
    return this.matchComplete;
  }

  get matchWinnerId(): string | null {
    return this.winnerId;
  }

  get currentLegIndex(): number {
    return this.legIndexGlobal;
  }

  get currentTurnDarts(): Dart[] {
    return [...this.turnCtx.dartsThrownThisTurn];
  }

  get legsWonByPlayer(): Record<string, number> {
    return { ...this.legsWonInSet };
  }

  get setsWonByPlayer(): Record<string, number> {
    return { ...this.setsWon };
  }

  get eventHistory(): readonly TurnEvent[] {
    return this.events;
  }

  get activePlayerIds(): string[] {
    return [...this.activeIds];
  }

  get fullThrowLog(): readonly ThrowEvent[] {
    return this.throwLog;
  }

  getDisplayState(playerId: string): unknown {
    return this.strategy.getDisplayState(this.legState, playerId);
  }

  recordDart(dart: Dart, timestamp: number): void {
    if (this.matchComplete) {
      return;
    }
    const playerId = this.currentPlayerId;
    const result = this.strategy.applyDart(this.legState, this.turnCtx, playerId, dart);

    this.throwLog.push({ dart, timestamp });
    this.events.push({
      playerId,
      dart,
      description: result.scoreEffectDescription,
      turnIndex: this.turnIndex,
      legIndex: this.legIndexGlobal,
    });

    if (result.isBust) {
      this.legState[playerId] = this.turnCtx.turnStartState[playerId];
      this.endTurn();
      return;
    }

    this.legState[playerId] = result.updatedPlayerState;
    this.turnCtx.dartsThrownThisTurn.push(dart);

    if (result.legWon) {
      this.finalizeLegWin(playerId);
      return;
    }
    if (this.turnCtx.dartsThrownThisTurn.length === 3) {
      this.endTurn();
    }
  }

  private endTurn(): void {
    this.turnIndex++;
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.throwOrderForLeg.length;
    this.turnCtx = { turnStartState: this.cloneLegState(), dartsThrownThisTurn: [] };
  }

  private finalizeLegWin(winnerId: string): void {
    this.turnIndex++;
    this.legsWonInSet[winnerId]++;

    if (this.legsWonInSet[winnerId] >= this.format.legsToWinSet) {
      this.setsWon[winnerId]++;
      for (const id of this.playerIds) {
        this.legsWonInSet[id] = 0;
      }
      if (this.setsWon[winnerId] >= this.format.setsToWinMatch) {
        this.matchComplete = true;
        this.winnerId = winnerId;
        return;
      }
    }

    this.legIndexGlobal++;
    this.throwOrderForLeg = rotate(this.activeIds, this.legIndexGlobal);
    this.currentPlayerIndex = 0;
    this.legState = this.strategy.initLegState(this.activeIds);
    this.turnCtx = { turnStartState: this.cloneLegState(), dartsThrownThisTurn: [] };
  }
}
