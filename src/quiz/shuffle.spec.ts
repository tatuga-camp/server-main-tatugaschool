import { hashString, newShuffleSeed, seededShuffle } from './shuffle';

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('seededShuffle', () => {
  it('is stable for the same seed', () => {
    expect(seededShuffle(range(10), 42)).toEqual(seededShuffle(range(10), 42));
  });
  it('differs for different seeds', () => {
    expect(seededShuffle(range(10), 1)).not.toEqual(
      seededShuffle(range(10), 2),
    );
  });
  it('returns a permutation and does not mutate the input', () => {
    const input = range(10);
    const out = seededShuffle(input, 7);
    expect([...out].sort((a, b) => a - b)).toEqual(range(10));
    expect(input).toEqual(range(10));
  });
});

describe('hashString / newShuffleSeed', () => {
  it('hashes deterministically to a uint32', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
    expect(hashString('abc')).toBeGreaterThanOrEqual(0);
  });
  it('makes a positive int31 seed', () => {
    const seed = newShuffleSeed();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 31);
  });
});
