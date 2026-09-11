import { describe, expect, it } from 'vitest';
import type { Player } from '../player/provider.js';
import {
  composePastedMetadata,
  isTrackLevelPlayer,
} from './resolve-pasted-metadata.js';
import { BLANK_METADATA_TEMPLATE } from './metadata-template.js';

describe('isTrackLevelPlayer', () => {
  it('spotify: track is track-level', () => {
    const player: Player = { provider: 'spotify', kind: 'track', id: 'x' };
    expect(isTrackLevelPlayer(player)).toBe(true);
  });

  it('spotify: album is not track-level', () => {
    const player: Player = { provider: 'spotify', kind: 'album', id: 'x' };
    expect(isTrackLevelPlayer(player)).toBe(false);
  });

  it('spotify: playlist is neither (null)', () => {
    const player: Player = { provider: 'spotify', kind: 'playlist', id: 'x' };
    expect(isTrackLevelPlayer(player)).toBeNull();
  });

  it('apple: song is track-level', () => {
    const player: Player = {
      provider: 'apple',
      storefront: 'jp',
      kind: 'song',
      id: 'x',
    };
    expect(isTrackLevelPlayer(player)).toBe(true);
  });

  it('apple: album page with a track query param is track-level', () => {
    const player: Player = {
      provider: 'apple',
      storefront: 'jp',
      kind: 'album',
      id: 'x',
      track: '123',
    };
    expect(isTrackLevelPlayer(player)).toBe(true);
  });

  it('apple: album page without a track query param is not track-level', () => {
    const player: Player = {
      provider: 'apple',
      storefront: 'jp',
      kind: 'album',
      id: 'x',
    };
    expect(isTrackLevelPlayer(player)).toBe(false);
  });

  it('apple: playlist is neither (null)', () => {
    const player: Player = {
      provider: 'apple',
      storefront: 'jp',
      kind: 'playlist',
      id: 'x',
    };
    expect(isTrackLevelPlayer(player)).toBeNull();
  });

  it('youtube and niconico are always track-level (single video)', () => {
    expect(isTrackLevelPlayer({ provider: 'youtube', id: 'x' })).toBe(true);
    expect(isTrackLevelPlayer({ provider: 'niconico', id: 'x' })).toBe(true);
  });
});

describe('composePastedMetadata', () => {
  const work = { title: 'Some Title', artist: 'Some Artist' };

  it('leaves the seed untouched when there is no player', () => {
    const result = composePastedMetadata(BLANK_METADATA_TEMPLATE, null, work, {
      released: '2019',
    });
    expect(result).toBe(BLANK_METADATA_TEMPLATE);
  });

  it('leaves the seed untouched when the lookup produced no extras', () => {
    const player: Player = { provider: 'spotify', kind: 'track', id: 'x' };
    const result = composePastedMetadata(
      BLANK_METADATA_TEMPLATE,
      player,
      work,
      undefined
    );
    expect(result).toBe(BLANK_METADATA_TEMPLATE);
  });

  it('track-level: fills Track from work, Album from extras', () => {
    const player: Player = { provider: 'spotify', kind: 'track', id: 'x' };
    const result = composePastedMetadata(
      BLANK_METADATA_TEMPLATE,
      player,
      work,
      { album: 'Parent Album', released: '2019-03-15', label: 'A Label' }
    );
    expect(result).toContain('Track: Some Title');
    expect(result).toContain('Album: Parent Album');
    expect(result).toContain('Artist(s): Some Artist');
    expect(result).toContain('Released: 2019-03-15');
    expect(result).toContain('Label: A Label');
  });

  it('album-level: fills Album from work, Track becomes "-"', () => {
    const player: Player = { provider: 'spotify', kind: 'album', id: 'x' };
    const result = composePastedMetadata(
      BLANK_METADATA_TEMPLATE,
      player,
      work,
      { released: '2019', label: 'A Label' }
    );
    expect(result).toContain('Album: Some Title');
    expect(result).toContain('Track: -');
  });

  it('neither level (playlist): both Track and Album become "-"', () => {
    const player: Player = {
      provider: 'spotify',
      kind: 'playlist',
      id: 'x',
    };
    const result = composePastedMetadata(
      BLANK_METADATA_TEMPLATE,
      player,
      work,
      {}
    );
    expect(result).toContain('Track: -');
    expect(result).toContain('Album: -');
  });

  it('missing released/label become "-" rather than being left blank', () => {
    const player: Player = { provider: 'youtube', id: 'x' };
    const result = composePastedMetadata(
      BLANK_METADATA_TEMPLATE,
      player,
      work,
      {}
    );
    expect(result).toContain('Released: -');
    expect(result).toContain('Label: -');
  });

  it('never overwrites a hand-typed or already-resolved line', () => {
    const seed =
      'Album:\nTrack: Hand Typed\nArtist(s):\nReleased: -\nLabel:\nMemo: note';
    const player: Player = { provider: 'spotify', kind: 'track', id: 'x' };
    const result = composePastedMetadata(seed, player, work, {
      album: 'Parent Album',
      released: '2019-03-15',
      label: 'A Label',
    });
    expect(result).toContain('Track: Hand Typed');
    expect(result).toContain('Released: -');
    expect(result).toContain('Memo: note');
  });
});
