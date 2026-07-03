export type Multiplier = 1 | 2 | 3;

/** segment: 0 = miss, 1-20 = number, 25 = bull. multiplier: SINGLE=1, DOUBLE=2, TRIPLE=3. */
export interface Dart {
  segment: number;
  multiplier: Multiplier;
}

/** Bull has no triple; callers (UI/engine) must never construct segment 25 with multiplier 3. */
export function dartValue(dart: Dart): number {
  if (dart.segment === 0) {
    return 0;
  }
  if (dart.segment === 25) {
    return dart.multiplier === 2 ? 50 : 25;
  }
  return dart.segment * dart.multiplier;
}

export function isDouble(dart: Dart): boolean {
  return dart.multiplier === 2;
}

export function isTriple(dart: Dart): boolean {
  return dart.multiplier === 3 && dart.segment !== 25;
}

export function isMiss(dart: Dart): boolean {
  return dart.segment === 0;
}

export function dartLabel(dart: Dart): string {
  if (dart.segment === 0) {
    return 'Miss';
  }
  if (dart.segment === 25) {
    return dart.multiplier === 2 ? 'Bull' : '25';
  }
  const prefix = dart.multiplier === 3 ? 'T' : dart.multiplier === 2 ? 'D' : '';
  return `${prefix}${dart.segment}`;
}
