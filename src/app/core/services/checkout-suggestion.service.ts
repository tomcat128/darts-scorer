import { Injectable } from '@angular/core';
import { Dart, dartValue, isDouble, isTriple } from '../models/dart.model';
import { CheckoutMode } from '../models/match-config.model';

export interface DartOption {
  dart: Dart;
  value: number;
}

function buildAllDartOptions(): DartOption[] {
  const options: DartOption[] = [];
  for (let segment = 1; segment <= 20; segment++) {
    for (const multiplier of [1, 2, 3] as const) {
      const dart: Dart = { segment, multiplier };
      options.push({ dart, value: dartValue(dart) });
    }
  }
  options.push({ dart: { segment: 25, multiplier: 1 }, value: 25 });
  options.push({ dart: { segment: 25, multiplier: 2 }, value: 50 });
  return options;
}

// Sorted descending so the search greedily tries the biggest scoring darts first,
// naturally reproducing conventional "big dart, clean double finish" checkout style.
const ALL_DART_OPTIONS = buildAllDartOptions().sort((a, b) => b.value - a.value);

function satisfiesCheckout(option: DartOption, mode: CheckoutMode): boolean {
  if (mode === 'normal') {
    return true;
  }
  if (mode === 'double') {
    return isDouble(option.dart);
  }
  return isDouble(option.dart) || isTriple(option.dart);
}

function solve(remaining: number, dartsLeft: number, mode: CheckoutMode): DartOption[] | null {
  if (remaining <= 0 || dartsLeft < 1) {
    return null;
  }
  if (remaining === 1 && mode !== 'normal') {
    return null;
  }

  const direct = ALL_DART_OPTIONS.find((o) => o.value === remaining && satisfiesCheckout(o, mode));
  if (direct) {
    return [direct];
  }
  if (dartsLeft === 1) {
    return null;
  }

  for (const option of ALL_DART_OPTIONS) {
    if (option.value >= remaining) {
      continue;
    }
    const rest = solve(remaining - option.value, dartsLeft - 1, mode);
    if (rest) {
      return [option, ...rest];
    }
  }
  return null;
}

@Injectable({ providedIn: 'root' })
export class CheckoutSuggestionService {
  private readonly cache = new Map<string, DartOption[] | null>();

  suggest(remaining: number, dartsLeft: number, mode: CheckoutMode): DartOption[] | null {
    const key = `${remaining}|${dartsLeft}|${mode}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, solve(remaining, dartsLeft, mode));
    }
    return this.cache.get(key) ?? null;
  }
}
