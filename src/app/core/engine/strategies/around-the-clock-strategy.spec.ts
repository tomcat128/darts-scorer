import { AroundTheClockStrategy, AtcLegState, ATC_PROGRESSION } from './around-the-clock-strategy';
import { TurnContext } from '../../models/game-mode-strategy.model';

const noopCtx: TurnContext<AtcLegState> = { turnStartState: {}, dartsThrownThisTurn: [] };

describe('AroundTheClockStrategy', () => {
  it('advances exactly one step regardless of multiplier', () => {
    const strategy = new AroundTheClockStrategy();
    const legState = { p1: { index: 0 } }; // target = 1

    const result = strategy.applyDart(legState, noopCtx, 'p1', { segment: 1, multiplier: 3 }); // T1

    const updated = result.updatedPlayerState as AtcLegState;
    expect(updated.index).toBe(1); // not skipped ahead
  });

  it('is a no-op when hitting the wrong number', () => {
    const strategy = new AroundTheClockStrategy();
    const legState = { p1: { index: 0 } }; // target = 1

    const result = strategy.applyDart(legState, noopCtx, 'p1', { segment: 5, multiplier: 1 });

    const updated = result.updatedPlayerState as AtcLegState;
    expect(updated.index).toBe(0);
    expect(result.legWon).toBe(false);
  });

  it('requires reaching Bull after 20 to win the leg', () => {
    const strategy = new AroundTheClockStrategy();
    const legState = { p1: { index: ATC_PROGRESSION.length - 1 } }; // target = 25 (Bull)

    const result = strategy.applyDart(legState, noopCtx, 'p1', { segment: 25, multiplier: 1 });

    expect(result.legWon).toBe(true);
  });
});
