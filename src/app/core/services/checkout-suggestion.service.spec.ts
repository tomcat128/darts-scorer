import { CheckoutSuggestionService } from './checkout-suggestion.service';
import { dartLabel } from '../models/dart.model';

function labels(service: CheckoutSuggestionService, remaining: number, dartsLeft: number, mode: 'normal' | 'double' | 'master') {
  const combo = service.suggest(remaining, dartsLeft, mode);
  return combo ? combo.map((o) => dartLabel(o.dart)).join(' ') : null;
}

describe('CheckoutSuggestionService', () => {
  const service = new CheckoutSuggestionService();

  it('finds known double-out checkout combos', () => {
    expect(labels(service, 170, 3, 'double')).toBe('T20 T20 Bull');
    expect(labels(service, 40, 1, 'double')).toBe('D20');
    expect(labels(service, 32, 1, 'double')).toBe('D16');
    expect(labels(service, 100, 3, 'double')).not.toBeNull();
  });

  it('returns null for classic double-out bogey numbers with 3 darts', () => {
    for (const bogey of [169, 168, 166, 165, 163, 162, 159]) {
      expect(service.suggest(bogey, 3, 'double')).toBeNull();
    }
  });

  it('accepts triple finishes under master-out that double-out rejects', () => {
    // 60 with 1 dart: T20 is valid under master (double-or-triple), invalid under double-out.
    expect(service.suggest(60, 1, 'master')).not.toBeNull();
    expect(service.suggest(60, 1, 'double')).toBeNull();
  });

  it('never suggests landing on exactly 1 remaining for non-normal checkout modes', () => {
    expect(service.suggest(1, 1, 'double')).toBeNull();
    expect(service.suggest(1, 1, 'master')).toBeNull();
  });

  it('allows any single-dart finish under normal-out', () => {
    expect(service.suggest(1, 1, 'normal')).not.toBeNull();
    expect(service.suggest(20, 1, 'normal')).not.toBeNull();
  });
});
