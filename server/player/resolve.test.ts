import { describe, expect, it } from 'vitest';
import { artistMatches, looselyMatches } from './resolve.js';

describe('looselyMatches', () => {
  it('matches identical strings', () => {
    expect(looselyMatches('Song Title', 'Song Title')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(looselyMatches('song title', 'SONG TITLE')).toBe(true);
  });

  it('ignores symbols and whitespace differences', () => {
    expect(looselyMatches('Song, Title!', 'song title')).toBe(true);
  });

  it('matches when the candidate contains the wanted string', () => {
    expect(looselyMatches('Song Title (Remastered)', 'Song Title')).toBe(true);
  });

  it('matches when the wanted string contains the candidate', () => {
    expect(looselyMatches('Song Title', 'Song Title (Remastered)')).toBe(true);
  });

  it('does not match unrelated strings', () => {
    expect(looselyMatches('Song Title', 'Completely Different')).toBe(false);
  });

  it('does not match when either side is empty after normalizing', () => {
    expect(looselyMatches('!!!', 'Song Title')).toBe(false);
    expect(looselyMatches('Song Title', '')).toBe(false);
  });

  // Pinning current behavior, not a spec: normalized containment is
  // deliberately loose, because a search result's title routinely carries
  // extra text a strict match would reject (e.g. "Song Title
  // (Remastered 2011)"). The cost is that short names contained in an
  // unrelated candidate also count as a match. This is not hypothetical --
  // all four pairs below are short strings that occur in the wild. When one
  // slips through during player resolution (resolvePlayer, no URL pasted),
  // the wrong track gets embedded in the card with no indication anything
  // went wrong. Fixing the false positives is out of scope here; this suite
  // only documents that the looseness is known, not incidental.
  it('accepts known false positives as a documented tradeoff', () => {
    expect(looselyMatches('Rain', 'Ai')).toBe(true);
    expect(looselyMatches('Sia', 'Asia')).toBe(true);
    expect(looselyMatches('Yes', 'Eyes')).toBe(true);
    expect(looselyMatches('Bring Me The Horizon', 'Me')).toBe(true);
  });
});

describe('artistMatches', () => {
  it('matches if any candidate matches the artist', () => {
    expect(
      artistMatches(['Other Artist', 'The Right Artist'], 'Right Artist')
    ).toBe(true);
  });

  it('returns false if no candidate matches', () => {
    expect(artistMatches(['Other Artist'], 'Right Artist')).toBe(false);
  });

  it('returns false for an empty candidate list', () => {
    expect(artistMatches([], 'Right Artist')).toBe(false);
  });
});
