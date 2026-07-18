import { getSignal } from '../src/get-signal';

describe('getSignal', () => {
  it('returns undefined for null loader data', () => {
    expect(getSignal(null)).toBeUndefined();
  });

  it('returns undefined for undefined loader data', () => {
    expect(getSignal(undefined)).toBeUndefined();
  });

  it('returns signal property when present', () => {
    const signal = { tao: { t: 'A', a: 'B', o: 'C' } };
    expect(getSignal({ signal })).toBe(signal);
  });

  it('returns undefined when signal property is missing', () => {
    expect(getSignal({})).toBeUndefined();
  });

  it('returns null when signal is explicitly null', () => {
    expect(getSignal({ signal: null })).toBeNull();
  });
});
