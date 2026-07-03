import { Dart } from '../../models/dart.model';
import { DartApplyResult, GameModeStrategy, TurnContext } from '../../models/game-mode-strategy.model';

export const ATC_PROGRESSION = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25,
] as const;

export interface AtcLegState {
  index: number;
}

export class AroundTheClockStrategy implements GameModeStrategy<AtcLegState> {
  initLegState(playerIds: string[]): Record<string, AtcLegState> {
    const initialState: Record<string, AtcLegState> = {};
    for (const playerId of playerIds) {
      initialState[playerId] = { index: 0 };
    }
    return initialState;
  }

  applyDart(
    legState: Record<string, AtcLegState>,
    _ctx: TurnContext<AtcLegState>,
    playerId: string,
    dart: Dart,
  ): DartApplyResult<AtcLegState> {
    const state = legState[playerId];
    const target = ATC_PROGRESSION[state.index];
    const hit = dart.segment === target;

    if (!hit) {
      return { updatedPlayerState: state, scoreEffectDescription: '-', isBust: false, legWon: false };
    }

    const newIndex = state.index + 1;
    return {
      updatedPlayerState: { index: newIndex },
      scoreEffectDescription: target === 25 ? 'Bull' : String(target),
      isBust: false,
      legWon: newIndex === ATC_PROGRESSION.length,
    };
  }

  getDisplayState(legState: Record<string, AtcLegState>, playerId: string): AtcLegState {
    return legState[playerId];
  }
}
