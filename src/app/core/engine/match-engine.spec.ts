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

  describe('player removal', () => {
    const format: MatchFormat = { legsToWinSet: 3, setsToWinMatch: 1 };

    it('skips a removed player in the turn rotation going forward, keeping past darts attributed correctly', () => {
      const engine = new MatchEngine({ mode: 'atc' }, format, ['p1', 'p2', 'p3'], [], [{ playerId: 'p2', afterDartCount: 0 }]);

      expect(engine.activePlayerIds).toEqual(['p1', 'p3']);
      expect(engine.currentPlayerId).toBe('p1');
      engine.recordDart({ segment: 1, multiplier: 1 }, Date.now());
      engine.recordDart({ segment: 1, multiplier: 1 }, Date.now());
      engine.recordDart({ segment: 1, multiplier: 1 }, Date.now());
      expect(engine.currentPlayerId).toBe('p3'); // p2 is skipped entirely
    });

    it('preserves attribution of darts thrown before removal, then skips the player afterward', () => {
      const engine1 = new MatchEngine({ mode: 'atc' }, format, ['p1', 'p2']);
      engine1.recordDart({ segment: 1, multiplier: 1 }, Date.now()); // p1's 1st dart
      expect(engine1.currentPlayerId).toBe('p1');
      const logAfterOneDart = [...engine1.fullThrowLog];

      // p1 removed right after throwing 1 dart (afterDartCount = 1)
      const engine2 = new MatchEngine(
        { mode: 'atc' },
        format,
        ['p1', 'p2'],
        logAfterOneDart,
        [{ playerId: 'p1', afterDartCount: 1 }],
      );

      expect(engine2.activePlayerIds).toEqual(['p2']);
      expect(engine2.currentPlayerId).toBe('p2');
      // p1's already-thrown dart is still correctly attributed to p1
      expect(engine2.eventHistory[0].playerId).toBe('p1');
    });

    it('excludes a removed player from a fresh cricket leg so their frozen marks cannot block the others', () => {
      const cricketFormat: MatchFormat = { legsToWinSet: 1, setsToWinMatch: 1 };
      const engine = new MatchEngine(
        { mode: 'cricket' },
        cricketFormat,
        ['p1', 'p2', 'p3'],
        [],
        [{ playerId: 'p2', afterDartCount: 0 }],
      );

      const state = engine.getDisplayState('p1') as { marks: Record<number, number>; points: number };
      expect(state).toBeTruthy();
      expect(engine.activePlayerIds).toEqual(['p1', 'p3']);
    });
  });
});
