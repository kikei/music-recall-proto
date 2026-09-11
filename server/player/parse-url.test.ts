import { describe, expect, it } from 'vitest';
import { parsePlayerUrl } from './parse-url.js';

describe('parsePlayerUrl', () => {
  it('returns null for a non-URL string', () => {
    expect(parsePlayerUrl('not a url')).toBeNull();
  });

  it('returns null for an unrelated URL', () => {
    expect(parsePlayerUrl('https://example.com/foo')).toBeNull();
  });

  it('returns null for undefined/null input', () => {
    expect(parsePlayerUrl(undefined)).toBeNull();
    expect(parsePlayerUrl(null)).toBeNull();
  });

  describe('spotify', () => {
    it('parses a track URL', () => {
      expect(parsePlayerUrl('https://open.spotify.com/track/abc123')).toEqual({
        provider: 'spotify',
        kind: 'track',
        id: 'abc123',
      });
    });

    it('parses an album URL with a locale prefix', () => {
      expect(
        parsePlayerUrl('https://open.spotify.com/intl-ja/album/abc123')
      ).toEqual({ provider: 'spotify', kind: 'album', id: 'abc123' });
    });

    it('returns null for a URL missing the id', () => {
      expect(parsePlayerUrl('https://open.spotify.com/track/')).toBeNull();
    });
  });

  describe('youtube', () => {
    it('parses a youtu.be short URL', () => {
      expect(parsePlayerUrl('https://youtu.be/abc123')).toEqual({
        provider: 'youtube',
        id: 'abc123',
      });
    });

    it('parses a youtube.com watch URL', () => {
      expect(parsePlayerUrl('https://www.youtube.com/watch?v=abc123')).toEqual({
        provider: 'youtube',
        id: 'abc123',
      });
    });

    it('parses a music.youtube.com URL', () => {
      expect(
        parsePlayerUrl('https://music.youtube.com/watch?v=abc123')
      ).toEqual({ provider: 'youtube', id: 'abc123' });
    });
  });

  describe('niconico', () => {
    it('parses a nicovideo.jp watch URL', () => {
      expect(parsePlayerUrl('https://www.nicovideo.jp/watch/sm12345')).toEqual({
        provider: 'niconico',
        id: 'sm12345',
      });
    });

    it('parses a nico.ms short URL', () => {
      expect(parsePlayerUrl('https://nico.ms/sm12345')).toEqual({
        provider: 'niconico',
        id: 'sm12345',
      });
    });
  });

  describe('apple music', () => {
    it('parses an album URL', () => {
      expect(
        parsePlayerUrl('https://music.apple.com/jp/album/some-title/1234567890')
      ).toEqual({
        provider: 'apple',
        storefront: 'jp',
        kind: 'album',
        id: '1234567890',
      });
    });

    it('parses a track inside an album page via the "i" query param', () => {
      expect(
        parsePlayerUrl(
          'https://music.apple.com/jp/album/some-title/1234567890?i=999'
        )
      ).toEqual({
        provider: 'apple',
        storefront: 'jp',
        kind: 'album',
        id: '1234567890',
        track: '999',
      });
    });

    it('parses a song URL', () => {
      expect(
        parsePlayerUrl('https://music.apple.com/us/song/some-title/555')
      ).toEqual({
        provider: 'apple',
        storefront: 'us',
        kind: 'song',
        id: '555',
      });
    });

    it('returns null when the id is missing', () => {
      expect(parsePlayerUrl('https://music.apple.com/jp/album')).toBeNull();
    });
  });
});
