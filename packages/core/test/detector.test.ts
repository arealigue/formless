import { describe, expect, it } from 'vitest';
import { detectPlatform } from '../src/detector.js';

describe('detectPlatform', () => {
  it('detects Typeform URLs', () => {
    expect(detectPlatform('https://yourworkspace.typeform.com/to/abc123')).toBe('typeform');
  });

  it('detects Tally URLs', () => {
    expect(detectPlatform('https://tally.so/r/xyz987')).toBe('tally');
  });

  it('throws for unsupported URLs', () => {
    expect(() => detectPlatform('https://example.com/form')).toThrowError(/Unsupported form URL/);
  });
});