import { Dart } from './dart.model';
import { CheckoutMode, GameModeConfig, MatchFormat } from './match-config.model';

export interface ThrowEvent {
  dart: Dart;
  timestamp: number;
}

/**
 * Records that a player was taken out of the turn rotation once `afterDartCount` darts
 * had been thrown. Keyed by dart count (not a timestamp or turn index) so replay can tell
 * exactly which darts still belong to the removed player and which turns must skip them -
 * see MatchEngine's constructor.
 */
export interface RemovedPlayerRecord {
  playerId: string;
  afterDartCount: number;
}

/**
 * throwLog is the single source of truth for the whole match: whose turn it is,
 * remaining scores/marks, legs/sets won, and the winner are all a pure function of
 * (gameConfig, format, playerIds, throwLog, removedPlayers). This is what makes undo,
 * persistence, and refresh-survival trivial - see MatchEngine.
 */
export interface MatchSnapshot {
  id: string;
  gameConfig: GameModeConfig;
  format: MatchFormat;
  playerIds: string[];
  throwLog: ThrowEvent[];
  removedPlayers?: RemovedPlayerRecord[];
  /** Per-player override of the x01 checkout mode; falls back to gameConfig's mode when absent.
   *  Reset by starting a new match (a fresh snapshot simply omits this field). */
  playerCheckoutModes?: Record<string, CheckoutMode>;
  createdAt: number;
  completedAt?: number;
}
