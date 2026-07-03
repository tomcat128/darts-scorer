import { Dart } from '../../models/dart.model';
import { DartApplyResult, GameModeStrategy, TurnContext } from '../../models/game-mode-strategy.model';

export const CRICKET_NUMBERS = [20, 19, 18, 17, 16, 15, 25] as const;

export interface CricketLegState {
  marks: Record<number, 0 | 1 | 2 | 3>;
  points: number;
}

function pointValue(n: number): number {
  return n === 25 ? 25 : n;
}

export class CricketStrategy implements GameModeStrategy<CricketLegState> {
  initLegState(playerIds: string[]): Record<string, CricketLegState> {
    const initialState: Record<string, CricketLegState> = {};
    for (const playerId of playerIds) {
      const marks: Record<number, 0 | 1 | 2 | 3> = {};
      for (const n of CRICKET_NUMBERS) {
        marks[n] = 0;
      }
      initialState[playerId] = { marks, points: 0 };
    }
    return initialState;
  }

  applyDart(
    legState: Record<string, CricketLegState>,
    _ctx: TurnContext<CricketLegState>,
    playerId: string,
    dart: Dart,
  ): DartApplyResult<CricketLegState> {
    const n = dart.segment;
    const state = legState[playerId];

    if (!(CRICKET_NUMBERS as readonly number[]).includes(n)) {
      return { updatedPlayerState: state, scoreEffectDescription: '-', isBust: false, legWon: false };
    }

    const marksHit = dart.multiplier;
    const priorMarks = state.marks[n];
    const newMarks = Math.min(priorMarks + marksHit, 3) as 0 | 1 | 2 | 3;
    const usedToOpen = newMarks - priorMarks;
    const overflow = marksHit - usedToOpen;

    const otherPlayerIds = Object.keys(legState).filter((id) => id !== playerId);
    const someOtherOpen = otherPlayerIds.some((id) => legState[id].marks[n] < 3);

    let pointsGained = 0;
    if (overflow > 0 && newMarks === 3 && someOtherOpen) {
      pointsGained = overflow * pointValue(n);
    }

    const updatedState: CricketLegState = {
      marks: { ...state.marks, [n]: newMarks },
      points: state.points + pointsGained,
    };

    const allClosed = CRICKET_NUMBERS.every((num) => updatedState.marks[num] === 3);
    const maxOtherPoints = otherPlayerIds.length
      ? Math.max(...otherPlayerIds.map((id) => legState[id].points))
      : -Infinity;
    const legWon = allClosed && updatedState.points >= maxOtherPoints;

    const parts: string[] = [];
    if (usedToOpen > 0) {
      parts.push(`${usedToOpen} mark${usedToOpen > 1 ? 's' : ''}`);
    }
    if (pointsGained > 0) {
      parts.push(`${pointsGained} pts`);
    }

    return {
      updatedPlayerState: updatedState,
      scoreEffectDescription: parts.length ? parts.join(' + ') : '0',
      isBust: false,
      legWon,
    };
  }

  getDisplayState(legState: Record<string, CricketLegState>, playerId: string): CricketLegState {
    return legState[playerId];
  }
}
