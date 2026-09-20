import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createCard, type NewCard } from '../db/cards.js';
import { createProject } from '../db/projects.js';
import { findOrCreateUser } from '../db/users.js';
import { publicCards } from './public-cards.js';

function cardInput(
  projectId: string,
  userId: string,
  visibility: NewCard['visibility']
): NewCard {
  return {
    project_id: projectId,
    created_by_user_id: userId,
    visibility,
    session_id: null,
    title: 'Public test record',
    artist: 'Public test artist',
    hook: 'Visible hook',
    recall_phrase: 'Visible cue',
    background: 'Visible background',
    metadata: 'Private reference notes',
    embedding: null,
  };
}

describe('public card route', () => {
  it('returns a deliberately small public representation', async () => {
    const owner = findOrCreateUser(`public-route-${randomUUID()}`);
    const project = createProject(
      owner.id,
      'Public route project',
      `public-${randomUUID().slice(0, 12)}`,
      'public'
    );
    const card = createCard(cardInput(project.id, owner.id, 'public'));

    const response = await publicCards.request(
      `/${project.slug}/cards/${card.public_id}`
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: card.public_id,
      projectSlug: project.slug,
      title: card.title,
      artist: card.artist,
    });
    expect(body).not.toHaveProperty('metadata');
    expect(body).not.toHaveProperty('session_id');
    expect(body).not.toHaveProperty('created_by_user_id');
    expect(body).not.toHaveProperty('project_id');
  });

  it('does not reveal a private card', async () => {
    const owner = findOrCreateUser(`private-route-${randomUUID()}`);
    const project = createProject(
      owner.id,
      'Private route project',
      `private-${randomUUID().slice(0, 12)}`,
      'public'
    );
    const card = createCard(cardInput(project.id, owner.id, 'private'));

    const response = await publicCards.request(
      `/${project.slug}/cards/${card.public_id}`
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'not found' });
  });
});
