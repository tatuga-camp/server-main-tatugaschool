import { normalizeTags } from './normalize-tags';

describe('normalizeTags', () => {
  it('returns empty array for non-array input', () => {
    expect(normalizeTags(undefined)).toEqual([]);
    expect(normalizeTags(null)).toEqual([]);
    expect(normalizeTags('Homework')).toEqual([]);
  });

  it('trims and collapses internal whitespace', () => {
    expect(normalizeTags(['  Home  work  '])).toEqual(['Home work']);
  });

  it('drops empty and whitespace-only strings', () => {
    expect(normalizeTags(['', '   ', 'Homework'])).toEqual(['Homework']);
  });

  it('dedupes case-insensitively, preserving first occurrence casing', () => {
    expect(normalizeTags(['Homework', 'homework', 'HOMEWORK'])).toEqual([
      'Homework',
    ]);
  });

  it('drops non-string entries', () => {
    expect(normalizeTags(['Homework', 42 as any, null as any, 'Test'])).toEqual(
      ['Homework', 'Test'],
    );
  });

  it('preserves insertion order across distinct tags', () => {
    expect(normalizeTags(['Test', 'Homework', 'Group Work'])).toEqual([
      'Test',
      'Homework',
      'Group Work',
    ]);
  });
});
