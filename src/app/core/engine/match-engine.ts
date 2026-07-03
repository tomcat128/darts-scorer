import { Dart } from '../models/dart.model';
import { GameModeConfig, MatchFormat } from '../models/match-config.model';
import { ThrowEvent } from '../models/match-state.model';
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

function createStrategy(gameConfig: GameModeConfig): GameModeStrategy<unknown> {
  switch (gameConfig.mode) {
    case 'x01':
      return new X01Strategy(gameConfig);
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
 * so the log itself doesn't need to carry playerId).
 */
export class MatchEngine {
  private readonly strategy: GameModeStrategy<unknown>;
  private readonly playerIds: string[];
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

  constructor(gameConfig: GameModeConfig, format: MatchFormat, playerIds: string[], throwLog: ThrowEvent[] = []) {
    this.strategy = createStrategy(gameConfig);
    this.playerIds = playerIds;
    this.format = format;

    for (const id of playerIds) {
      this.legsWonInSet[id] = 0;
      this.setsWon[id] = 0;
    }
    this.throwOrderForLeg = rotate(playerIds, this.legIndexGlobal);
    this.legState = this.strategy.initLegState(playerIds);
    this.turnCtx = { turnStartState: this.cloneLegState(), dartsThrownThisTurn: [] };

    for (const event of throwLog) {
      this.recordDart(event.dart, event.timestamp);
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
    this.throwOrderForLeg = rotate(this.playerIds, this.legIndexGlobal);
    this.currentPlayerIndex = 0;
    this.legState = this.strategy.initLegState(this.playerIds);
    this.turnCtx = { turnStartState: this.cloneLegState(), dartsThrownThisTurn: [] };
  }
}
