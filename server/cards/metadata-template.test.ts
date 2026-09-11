import { describe, expect, it } from 'vitest';
import {
  BLANK_METADATA_TEMPLATE,
  fillMetadataTemplate,
} from './metadata-template.js';

describe('fillMetadataTemplate', () => {
  it('fills a blank line with the given value', () => {
    const result = fillMetadataTemplate(BLANK_METADATA_TEMPLATE, {
      Track: 'Song Title',
    });
    expect(result).toContain('Track: Song Title');
  });

  it('leaves a hand-typed value untouched', () => {
    const seed = 'Track: My Own Title\nAlbum:';
    const result = fillMetadataTemplate(seed, {
      Track: 'Looked Up Title',
      Album: 'Looked Up Album',
    });
    expect(result).toBe('Track: My Own Title\nAlbum: Looked Up Album');
  });

  it('leaves a previous "-" untouched (checked, none stays none)', () => {
    const seed = 'Label: -';
    const result = fillMetadataTemplate(seed, { Label: 'Now Found Label' });
    expect(result).toBe('Label: -');
  });

  it('leaves a line the user removed from the template alone', () => {
    const seed = 'Track:\nArtist(s):';
    const result = fillMetadataTemplate(seed, {
      Album: 'Should Not Appear',
    });
    expect(result).toBe('Track:\nArtist(s):');
  });

  it('ignores lines that are not part of the template', () => {
    const seed = 'Memo: this is my own note';
    const result = fillMetadataTemplate(seed, {
      // @ts-expect-error Memo is not a lookup key, but a stray value keyed
      // that way must not clobber a free-text line.
      Memo: 'overwritten',
    });
    expect(result).toBe('Memo: this is my own note');
  });

  it('fills multiple blank lines from one call', () => {
    const result = fillMetadataTemplate(BLANK_METADATA_TEMPLATE, {
      Track: 'T',
      Album: 'A',
      'Artist(s)': 'Ar',
      Released: '2019-03-15',
      Label: '-',
    });
    expect(result).toBe(
      [
        'Album: A',
        'Track: T',
        'Artist(s): Ar',
        'Released: 2019-03-15',
        'Label: -',
        'Memo:',
      ].join('\n')
    );
  });
});
