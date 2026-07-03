import { Dart } from './dart.model';
import { GameModeConfig, MatchFormat } from './match-config.model';

export interface ThrowEvent {
  dart: Dart;
  timestamp: number;
}

/**
 * throwLog is the single source of truth for the whole match: whose turn it is,
 * remaining scores/marks, legs/sets won, and the winner are all a pure function of
 * (gameConfig, format, playerIds, throwLog). This is what makes undo, persistence,
 * and refresh-survival trivial - see MatchEngine.
 */
export interface MatchSnapshot {
  id: string;
  gameConfig: GameModeConfig;
  format: MatchFormat;
  playerIds: string[];
  throwLog: ThrowEvent[];
  createdAt: number;
  completedAt?: number;
}
