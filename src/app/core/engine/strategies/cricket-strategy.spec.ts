import { CricketStrategy, CricketLegState, CRICKET_NUMBERS } from './cricket-strategy';
import { TurnContext } from '../../models/game-mode-strategy.model';

function emptyMarks(): Record<number, 0 | 1 | 2 | 3> {
  const marks: Record<number, 0 | 1 | 2 | 3> = {};
  for (const n of CRICKET_NUMBERS) {
    marks[n] = 0;
  }
  return marks;
}

function closedMarks(): Record<number, 0 | 1 | 2 | 3> {
  const marks: Record<number, 0 | 1 | 2 | 3> = {};
  for (const n of CRICKET_NUMBERS) {
    marks[n] = 3;
  }
  return marks;
}

const noopCtx: TurnContext<CricketLegState> = { turnStartState: {}, dartsThrownThisTurn: [] };

describe('CricketStrategy', () => {
  it('scores 0 points when opening a number to exactly 3 marks', () => {
    const strategy = new CricketStrategy();
    const legState = {
      p1: { marks: emptyMarks(), points: 0 },
      p2: { marks: emptyMarks(), points: 0 },
    };

    const result = strategy.applyDart(legState, noopCtx, 'p1', { segment: 20, multiplier: 3 }); // T20

    const updated = result.updatedPlayerState as CricketLegState;
    expect(updated.marks[20]).toBe(3);
    expect(updated.points).toBe(0);
  });

  it('scores overflow points once a number is open and an opponent has not closed it', () => {
    const strategy = new CricketStrategy();
    const legState = {
      p1: { marks: { ...emptyMarks(), 20: 3 as const }, points: 0 },
      p2: { marks: emptyMarks(), points: 0 }, // hasn't closed 20
    };

    const result = strategy.applyDart(legState, noopCtx, 'p1', { segment: 20, multiplier: 1 }); // single 20

    const updated = result.updatedPlayerState as CricketLegState;
    expect(updated.points).toBe(20);
  });

  it('blocks scoring once all opponents have closed the number', () => {
    const strategy = new CricketStrategy();
    const legState = {
      p1: { marks: { ...emptyMarks(), 20: 3 as const }, points: 0 },
      p2: { marks: { ...emptyMarks(), 20: 3 as const }, points: 0 }, // closed
    };

    const result = strategy.applyDart(legState, noopCtx, 'p1', { segment: 20, multiplier: 1 });

    const updated = result.updatedPlayerState as CricketLegState;
    expect(updated.points).toBe(0);
  });

  it('requires ALL opponents (not just one) to have closed a number before blocking, with 3 players', () => {
    const strategy = new CricketStrategy();
    const legState = {
      p1: { marks: { ...emptyMarks(), 20: 3 as const }, points: 0 },
      p2: { marks: { ...emptyMarks(), 20: 3 as const }, points: 0 }, // closed
      p3: { marks: emptyMarks(), points: 0 }, // NOT closed
    };

    const result = strategy.applyDart(legState, noopCtx, 'p1', { segment: 20, multiplier: 1 });

    const updated = result.updatedPlayerState as CricketLegState;
    expect(updated.points).toBe(20); // p3 still open -> scores
  });

  it('does not win the leg by closing everything while behind on points (highest-or-tied rule)', () => {
    const strategy = new CricketStrategy();
    // p1 has every number at 2 marks except 20, closes 20 on this dart (double = 2 marks -> exactly 3)
    const p1Marks = closedMarks();
    p1Marks[20] = 2;
    const legState = {
      p1: { marks: p1Marks, points: 0 },
      p2: { marks: { ...emptyMarks(), 20: 0 as const }, points: 50 }, // ahead on points, 20 still open
    };

    const result = strategy.applyDart(legState, noopCtx, 'p1', { segment: 20, multiplier: 2 }); // D20

    const updated = result.updatedPlayerState as CricketLegState;
    expect(updated.marks[20]).toBe(3);
    expect(updated.points).toBe(20); // 1 mark overflow * 20
    expect(result.legWon).toBe(false); // 20 < 50
  });

  it('wins the leg once all numbers are closed and points are highest-or-tied', () => {
    const strategy = new CricketStrategy();
    const p1Marks = closedMarks();
    p1Marks[20] = 2;
    const legState = {
      p1: { marks: p1Marks, points: 50 },
      p2: { marks: { ...emptyMarks(), 20: 0 as const }, points: 40 },
    };

    const result = strategy.applyDart(legState, noopCtx, 'p1', { segment: 20, multiplier: 2 }); // D20, closes + scores 20

    expect(result.legWon).toBe(true); // 70 >= 40 and all numbers closed
  });
});
