import { X01Strategy, X01LegState } from './x01-strategy';
import { TurnContext } from '../../models/game-mode-strategy.model';
import { X01Config } from '../../models/match-config.model';

function makeConfig(overrides: Partial<X01Config> = {}): X01Config {
  return { mode: 'x01', startingScore: 501, checkoutMode: 'double', checkinMode: 'normal', ...overrides };
}

function makeCtx(legState: Record<string, X01LegState>): TurnContext<X01LegState> {
  return { turnStartState: structuredClone(legState), dartsThrownThisTurn: [] };
}

describe('X01Strategy', () => {
  it('busts on overshoot and reverts to the turn-start score', () => {
    const strategy = new X01Strategy(makeConfig({ checkoutMode: 'double' }));
    const legState = { p1: { remaining: 40, checkedIn: true } };
    const ctx = makeCtx(legState);

    const result = strategy.applyDart(legState, ctx, 'p1', { segment: 20, multiplier: 3 }); // T20 = 60

    expect(result.isBust).toBe(true);
    expect(result.updatedPlayerState).toEqual(ctx.turnStartState['p1']);
  });

  it('busts when exactly 1 remains under double-out', () => {
    const strategy = new X01Strategy(makeConfig({ checkoutMode: 'double' }));
    const legState = { p1: { remaining: 3, checkedIn: true } };
    const ctx = makeCtx(legState);

    const result = strategy.applyDart(legState, ctx, 'p1', { segment: 2, multiplier: 1 }); // -> remaining 1

    expect(result.isBust).toBe(true);
  });

  it('does not bust on exactly 1 remaining under normal-out', () => {
    const strategy = new X01Strategy(makeConfig({ checkoutMode: 'normal' }));
    const legState = { p1: { remaining: 3, checkedIn: true } };
    const ctx = makeCtx(legState);

    const result = strategy.applyDart(legState, ctx, 'p1', { segment: 2, multiplier: 1 });

    expect(result.isBust).toBe(false);
    expect((result.updatedPlayerState as X01LegState).remaining).toBe(1);
  });

  it('busts on a non-double finish under double-out', () => {
    const strategy = new X01Strategy(makeConfig({ checkoutMode: 'double' }));
    const legState = { p1: { remaining: 20, checkedIn: true } };
    const ctx = makeCtx(legState);

    const result = strategy.applyDart(legState, ctx, 'p1', { segment: 20, multiplier: 1 }); // single 20

    expect(result.isBust).toBe(true);
  });

  it('wins the leg on a valid double finish', () => {
    const strategy = new X01Strategy(makeConfig({ checkoutMode: 'double' }));
    const legState = { p1: { remaining: 40, checkedIn: true } };
    const ctx = makeCtx(legState);

    const result = strategy.applyDart(legState, ctx, 'p1', { segment: 20, multiplier: 2 }); // D20 = 40

    expect(result.isBust).toBe(false);
    expect(result.legWon).toBe(true);
  });

  it('accepts a triple finish under master-out', () => {
    const strategy = new X01Strategy(makeConfig({ checkoutMode: 'master' }));
    const legState = { p1: { remaining: 60, checkedIn: true } };
    const ctx = makeCtx(legState);

    const result = strategy.applyDart(legState, ctx, 'p1', { segment: 20, multiplier: 3 }); // T20 = 60

    expect(result.isBust).toBe(false);
    expect(result.legWon).toBe(true);
  });

  it('rejects a triple finish under double-out', () => {
    const strategy = new X01Strategy(makeConfig({ checkoutMode: 'double' }));
    const legState = { p1: { remaining: 60, checkedIn: true } };
    const ctx = makeCtx(legState);

    const result = strategy.applyDart(legState, ctx, 'p1', { segment: 20, multiplier: 3 });

    expect(result.isBust).toBe(true);
  });

  it('gates scoring behind check-in and scores 0 without busting until satisfied', () => {
    const strategy = new X01Strategy(makeConfig({ checkinMode: 'double' }));
    const legState = { p1: { remaining: 501, checkedIn: false } };
    const ctx = makeCtx(legState);

    const result = strategy.applyDart(legState, ctx, 'p1', { segment: 20, multiplier: 1 }); // single, doesn't check in

    expect(result.isBust).toBe(false);
    expect(result.scoreEffectDescription).toContain('not checked in');
    expect((result.updatedPlayerState as X01LegState).checkedIn).toBe(false);
    expect((result.updatedPlayerState as X01LegState).remaining).toBe(501);
  });

  it('checks in and scores on the same dart', () => {
    const strategy = new X01Strategy(makeConfig({ checkinMode: 'double' }));
    const legState = { p1: { remaining: 501, checkedIn: false } };
    const ctx = makeCtx(legState);

    const result = strategy.applyDart(legState, ctx, 'p1', { segment: 20, multiplier: 2 }); // D20 = 40

    const updated = result.updatedPlayerState as X01LegState;
    expect(updated.checkedIn).toBe(true);
    expect(updated.remaining).toBe(461);
    expect(result.isBust).toBe(false);
  });
});
