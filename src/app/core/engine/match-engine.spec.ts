import { MatchEngine } from './match-engine';
import { ATC_PROGRESSION, AtcLegState } from './strategies/around-the-clock-strategy';
import { MatchFormat, X01Config } from '../models/match-config.model';

function completeOneLeg(engine: MatchEngine, winnerId: string): void {
  const startLeg = engine.currentLegIndex;
  while (engine.currentLegIndex === startLeg && !engine.isMatchComplete) {
    if (engine.currentPlayerId !== winnerId) {
      for (let i = 0; i < 3; i++) {
        engine.recordDart({ segment: 0, multiplier: 1 }, Date.now());
      }
    } else {
      for (let i = 0; i < 3; i++) {
        if (engine.currentLegIndex !== startLeg || engine.isMatchComplete) {
          break;
        }
        const state = engine.getDisplayState(winnerId) as AtcLegState;
        const target = ATC_PROGRESSION[state.index];
        engine.recordDart({ segment: target, multiplier: 1 }, Date.now());
      }
    }
  }
}

describe('MatchEngine', () => {
  it('alternates the leading throw order every leg regardless of winner, without resetting at set boundaries', () => {
    const format: MatchFormat = { legsToWinSet: 3, setsToWinMatch: 1 };
    const engine = new MatchEngine({ mode: 'atc' }, format, ['p1', 'p2']);

    expect(engine.currentPlayerId).toBe('p1');

    completeOneLeg(engine, 'p1');
    expect(engine.currentLegIndex).toBe(1);
    expect(engine.currentPlayerId).toBe('p2'); // leg 1: rotated by 1

    completeOneLeg(engine, 'p2');
    expect(engine.currentLegIndex).toBe(2);
    expect(engine.currentPlayerId).toBe('p1'); // leg 2: rotated by 2 -> back to p1
  });

  it('completes the match once a player reaches the sets threshold', () => {
    const format: MatchFormat = { legsToWinSet: 1, setsToWinMatch: 2 };
    const engine = new MatchEngine({ mode: 'atc' }, format, ['p1', 'p2']);

    completeOneLeg(engine, 'p1');
    expect(engine.isMatchComplete).toBe(false);
    expect(engine.setsWonByPlayer['p1']).toBe(1);
    expect(engine.legsWonByPlayer['p1']).toBe(0); // reset after the set win

    completeOneLeg(engine, 'p1');
    expect(engine.isMatchComplete).toBe(true);
    expect(engine.matchWinnerId).toBe('p1');
  });

  it('undoes via full replay, correctly un-completing a match-winning dart', () => {
    const format: MatchFormat = { legsToWinSet: 1, setsToWinMatch: 1 };
    const config: X01Config = { mode: 'x01', startingScore: 40, checkoutMode: 'double', checkinMode: 'normal' };
    const engine1 = new MatchEngine(config, format, ['p1', 'p2']);

    engine1.recordDart({ segment: 20, multiplier: 2 }, Date.now()); // D20 = 40, finishes the leg/set/match
    expect(engine1.isMatchComplete).toBe(true);

    const truncatedLog = [...engine1.fullThrowLog.slice(0, -1)];
    const engine2 = new MatchEngine(config, format, ['p1', 'p2'], truncatedLog);

    expect(engine2.isMatchComplete).toBe(false);
    expect(engine2.getDisplayState('p1')).toEqual({ remaining: 40, checkedIn: true });
  });
});
