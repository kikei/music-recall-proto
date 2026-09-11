import { describe, expect, it } from 'vitest';
import { stripTracking } from './strip-tracking.js';

describe('stripTracking', () => {
  it('leaves a URL with no tracking parameter untouched', () => {
    const url = 'https://example.com/article';
    expect(stripTracking(url)).toBe(url);
  });

  it('strips utm_source as the only query parameter', () => {
    expect(stripTracking('https://example.com/article?utm_source=chat')).toBe(
      'https://example.com/article'
    );
  });

  it('strips utm_source when it is the first of several parameters', () => {
    expect(
      stripTracking('https://example.com/article?utm_source=chat&id=5')
    ).toBe('https://example.com/article?id=5');
  });

  it('strips utm_source when it is not the first parameter', () => {
    expect(
      stripTracking('https://example.com/article?id=5&utm_source=chat')
    ).toBe('https://example.com/article?id=5');
  });

  it('stops at a closing paren or whitespace (markdown link citation)', () => {
    expect(
      stripTracking(
        'See [source](https://example.com/a?utm_source=chat) for more'
      )
    ).toBe('See [source](https://example.com/a) for more');
  });

  it('strips multiple occurrences in the same text', () => {
    const text =
      'https://a.com/x?utm_source=chat and https://b.com/y?utm_source=chat';
    expect(stripTracking(text)).toBe('https://a.com/x and https://b.com/y');
  });
});
