import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createListenItem, listListenItems } from '../db/listen-items.js';
import { createProject } from '../db/projects.js';
import { findOrCreateUser } from '../db/users.js';
import { parsePlayerUrl } from '../player/parse-url.js';
import { RequestValidationError } from '../request-validation.js';
import { addListenItem, MAX_LISTEN_TEXT_LENGTH } from './add.js';
import { resolvePastedMetadata } from '../cards/resolve-pasted-metadata.js';

// The lookup reaches the streaming services. Replace it so these tests pin
// what is stored without any network call.
vi.mock('../cards/resolve-pasted-metadata.js', () => ({
  resolvePastedMetadata: vi.fn(),
}));

const YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

function setup() {
  const user = findOrCreateUser(`add-${randomUUID()}`);
  const project = createProject(
    user.id,
    'Add project',
    `add-${randomUUID().slice(0, 12)}`,
    'public'
  );
  return { user, project };
}

describe('adding to the listen list', () => {
  beforeEach(() => {
    vi.mocked(resolvePastedMetadata).mockReset();
  });

  it('stores plain text as the title', async () => {
    const { user, project } = setup();

    const { item, duplicate } = await addListenItem(
      project.id,
      user.id,
      '  Kid A  '
    );

    expect(item).toMatchObject({ title: 'Kid A', artist: '', player: null });
    expect(duplicate).toBe(false);
    expect(resolvePastedMetadata).not.toHaveBeenCalled();
  });

  it('stores the resolved title and artist for a player URL', async () => {
    vi.mocked(resolvePastedMetadata).mockResolvedValue({
      title: 'Idioteque',
      artist: 'Radiohead',
      extras: {},
    });
    const { user, project } = setup();

    const { item, duplicate } = await addListenItem(
      project.id,
      user.id,
      YOUTUBE_URL
    );

    expect(item).toMatchObject({ title: 'Idioteque', artist: 'Radiohead' });
    expect(duplicate).toBe(false);
    expect(JSON.parse(item.player ?? '')).toEqual({
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
    });
  });

  it('still adds a URL that does not resolve', async () => {
    vi.mocked(resolvePastedMetadata).mockResolvedValue(null);
    const { user, project } = setup();

    const { item, duplicate } = await addListenItem(
      project.id,
      user.id,
      YOUTUBE_URL
    );

    expect(item).toMatchObject({ title: '', artist: '' });
    expect(duplicate).toBe(false);
    expect(item.player).not.toBeNull();
  });

  it('still adds a URL when the lookup fails', async () => {
    vi.mocked(resolvePastedMetadata).mockRejectedValue(new Error('offline'));
    const { user, project } = setup();

    const { item } = await addListenItem(project.id, user.id, YOUTUBE_URL);

    expect(item).toMatchObject({ title: '', artist: '' });
    expect(listListenItems(project.id, user.id)).toHaveLength(1);
  });

  it('returns the existing item for a URL that is already listed', async () => {
    vi.mocked(resolvePastedMetadata).mockResolvedValue(null);
    const { user, project } = setup();

    const first = await addListenItem(project.id, user.id, YOUTUBE_URL);
    const again = await addListenItem(
      project.id,
      user.id,
      'https://youtu.be/dQw4w9WgXcQ'
    );

    expect(again.item.id).toBe(first.item.id);
    expect(again.duplicate).toBe(true);
    expect(listListenItems(project.id, user.id)).toHaveLength(1);
  });

  it('returns the existing item for text that is already listed, trimmed', async () => {
    const { user, project } = setup();

    const first = await addListenItem(project.id, user.id, 'Kid A');
    const again = await addListenItem(project.id, user.id, '  Kid A  ');

    expect(again.item.id).toBe(first.item.id);
    expect(again.duplicate).toBe(true);
    expect(listListenItems(project.id, user.id)).toHaveLength(1);
  });

  it('does not match a URL entry whose resolved title equals the typed text', async () => {
    vi.mocked(resolvePastedMetadata).mockResolvedValue({
      title: 'Kid A',
      artist: 'Radiohead',
      extras: {},
    });
    const { user, project } = setup();

    await addListenItem(project.id, user.id, YOUTUBE_URL);
    const { item, duplicate } = await addListenItem(
      project.id,
      user.id,
      'Kid A'
    );

    expect(listListenItems(project.id, user.id)).toHaveLength(2);
    expect(duplicate).toBe(false);
    expect(item).toMatchObject({ title: 'Kid A', artist: '', player: null });
  });

  it('returns the item another request inserted while this one looked up metadata', async () => {
    const { user, project } = setup();
    const stored = JSON.stringify(parsePlayerUrl(YOUTUBE_URL));
    let concurrent: ReturnType<typeof createListenItem>;
    vi.mocked(resolvePastedMetadata).mockImplementation(async () => {
      // A second request for the same link finishes its own insert while
      // this one is still awaiting the lookup.
      concurrent = createListenItem(project.id, user.id, {
        title: 'Idioteque',
        artist: 'Radiohead',
        player: stored,
      });
      return null;
    });

    const { item, duplicate } = await addListenItem(
      project.id,
      user.id,
      YOUTUBE_URL
    );

    expect(item.id).toBe(concurrent!.id);
    expect(duplicate).toBe(true);
    expect(listListenItems(project.id, user.id)).toHaveLength(1);
  });

  it('rejects an empty entry', async () => {
    const { user, project } = setup();

    await expect(addListenItem(project.id, user.id, '   ')).rejects.toThrow(
      RequestValidationError
    );
  });

  it('rejects an entry that is too long', async () => {
    const { user, project } = setup();

    await expect(
      addListenItem(project.id, user.id, 'a'.repeat(MAX_LISTEN_TEXT_LENGTH + 1))
    ).rejects.toThrow(RequestValidationError);
  });

  it('rejects a URL for an unsupported service', async () => {
    const { user, project } = setup();

    await expect(
      addListenItem(project.id, user.id, 'https://example.com/song')
    ).rejects.toThrow('対応していない視聴 URL です。');
    expect(listListenItems(project.id, user.id)).toEqual([]);
  });
});
