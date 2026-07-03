import { Dart, dartValue, isDouble, isTriple } from '../../models/dart.model';
import { CheckinMode, CheckoutMode, X01Config } from '../../models/match-config.model';
import { DartApplyResult, GameModeStrategy, TurnContext } from '../../models/game-mode-strategy.model';

export interface X01LegState {
  remaining: number;
  checkedIn: boolean;
}

function satisfiesGate(dart: Dart, gateMode: CheckinMode | CheckoutMode): boolean {
  if (gateMode === 'normal') {
    return true;
  }
  if (gateMode === 'double') {
    return isDouble(dart);
  }
  return isDouble(dart) || isTriple(dart);
}

export class X01Strategy implements GameModeStrategy<X01LegState> {
  constructor(private readonly config: X01Config) {}

  initLegState(playerIds: string[]): Record<string, X01LegState> {
    const initialState: Record<string, X01LegState> = {};
    for (const playerId of playerIds) {
      initialState[playerId] = {
        remaining: this.config.startingScore,
        checkedIn: this.config.checkinMode === 'normal',
      };
    }
    return initialState;
  }

  applyDart(
    legState: Record<string, X01LegState>,
    ctx: TurnContext<X01LegState>,
    playerId: string,
    dart: Dart,
  ): DartApplyResult<X01LegState> {
    const state = legState[playerId];
    const value = dartValue(dart);

    if (!state.checkedIn) {
      if (!satisfiesGate(dart, this.config.checkinMode)) {
        return {
          updatedPlayerState: state,
          scoreEffectDescription: '0 (not checked in)',
          isBust: false,
          legWon: false,
        };
      }
    }
    const checkedIn = true;

    const newRemaining = state.remaining - value;
    const bust =
      newRemaining < 0 ||
      (newRemaining === 1 && this.config.checkoutMode !== 'normal') ||
      (newRemaining === 0 && !satisfiesGate(dart, this.config.checkoutMode));

    if (bust) {
      return {
        updatedPlayerState: ctx.turnStartState[playerId],
        scoreEffectDescription: 'BUST',
        isBust: true,
        legWon: false,
      };
    }

    return {
      updatedPlayerState: { remaining: newRemaining, checkedIn },
      scoreEffectDescription: String(value),
      isBust: false,
      legWon: newRemaining === 0,
    };
  }

  getDisplayState(legState: Record<string, X01LegState>, playerId: string): X01LegState {
    return legState[playerId];
  }
}
