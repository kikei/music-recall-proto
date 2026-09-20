import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { findOrCreateUser } from './users.js';
import { db } from './open.js';
import {
  createProject,
  ensurePersonalProject,
  getProjectBySlug,
  updateProject,
} from './projects.js';
import { deleteProjectOrThrow } from '../projects/delete-project.js';
import { checkProjectSlug } from '../projects/validation.js';
import {
  createCard,
  deleteCard,
  getEditableCardById,
  getCardById,
  getPublicCard,
  listCards,
  type NewCard,
} from './cards.js';
import { addMessage } from './messages.js';
import { createSession } from './sessions.js';
import { cardToClient } from '../cards/to-client.js';

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
    title: 'Test record',
    artist: 'Test artist',
    hook: 'A private impression',
    recall_phrase: 'A test cue',
    background: 'Test background',
    metadata: null,
    embedding: null,
  };
}

describe('project card access', () => {
  it('validates project ids with the documented length and characters', () => {
    expect(checkProjectSlug(' Quiet-Signals ')).toBe('quiet-signals');
    for (const invalid of ['a', 'ab', '-abc', 'abc-', 'a_b', 'a'.repeat(41)]) {
      expect(() => checkProjectSlug(invalid)).toThrow(
        'プロジェクト ID は3〜40文字'
      );
    }
  });

  it('creates the first project with an explicit public card default', () => {
    const owner = findOrCreateUser(`test-new-owner-${randomUUID()}`);
    expect(ensurePersonalProject(owner.id)).toMatchObject({
      name: '音楽想起エンジン',
      default_card_visibility: 'public',
    });
  });

  it('keeps private cards creator-only and exposes public cards by short id', () => {
    const owner = findOrCreateUser(`test-owner-${randomUUID()}`);
    const visitor = findOrCreateUser(`test-visitor-${randomUUID()}`);
    const slug = `test-${randomUUID().slice(0, 12)}`;
    const project = createProject(owner.id, 'Test project', slug, 'public');
    const privateCard = createCard(cardInput(project.id, owner.id, 'private'));
    const publicCard = createCard(cardInput(project.id, owner.id, 'public'));

    expect(privateCard.public_id).toMatch(/^[23456789a-z]{10}$/);
    expect(getCardById(privateCard.id, owner.id)?.id).toBe(privateCard.id);
    expect(getCardById(privateCard.id, visitor.id)).toBeUndefined();
    expect(getPublicCard(project.slug, privateCard.public_id)).toBeUndefined();
    expect(getPublicCard(project.slug, publicCard.public_id)?.id).toBe(
      publicCard.id
    );
  });

  it('shows members cards only to project members', () => {
    const owner = findOrCreateUser(`test-owner-${randomUUID()}`);
    const member = findOrCreateUser(`test-member-${randomUUID()}`);
    const visitor = findOrCreateUser(`test-visitor-${randomUUID()}`);
    const project = createProject(
      owner.id,
      'Shared project',
      `test-${randomUUID().slice(0, 12)}`,
      'public'
    );
    db.prepare(
      `INSERT INTO project_members (project_id, user_id, role, joined_at)
       VALUES (?, ?, 'member', ?)`
    ).run(project.id, member.id, new Date().toISOString());

    const privateCard = createCard(cardInput(project.id, owner.id, 'private'));
    const membersCard = createCard({
      ...cardInput(project.id, owner.id, 'members'),
      metadata: 'Creator-only reference notes',
    });
    const publicCard = createCard(cardInput(project.id, owner.id, 'public'));

    expect(listCards(project.id, owner.id).map(card => card.id)).toEqual(
      expect.arrayContaining([privateCard.id, membersCard.id, publicCard.id])
    );
    expect(listCards(project.id, owner.id)).toHaveLength(3);
    expect(listCards(project.id, member.id).map(card => card.id)).toEqual(
      expect.arrayContaining([membersCard.id, publicCard.id])
    );
    expect(listCards(project.id, member.id)).toHaveLength(2);
    expect(listCards(project.id, visitor.id).map(card => card.id)).toEqual([
      publicCard.id,
    ]);
    expect(getCardById(privateCard.id, member.id)).toBeUndefined();
    expect(getCardById(membersCard.id, member.id)?.id).toBe(membersCard.id);
    expect(getEditableCardById(membersCard.id, member.id)).toBeUndefined();
    expect(getEditableCardById(publicCard.id, member.id)).toBeUndefined();
    expect(deleteCard(membersCard.id, member.id)).toBe(false);
    expect(cardToClient(membersCard, project.slug, member.id)).toMatchObject({
      canEdit: false,
      hasTranscript: false,
      metadata: null,
    });
    expect(cardToClient(membersCard, project.slug, owner.id).metadata).toBe(
      'Creator-only reference notes'
    );
    expect(getCardById(membersCard.id, owner.id)?.id).toBe(membersCard.id);
    expect(
      updateProject(project.id, member.id, { slug: 'member-cannot-rename' })
    ).toBeUndefined();
  });

  it('lets an owner rename a project repeatedly', () => {
    const owner = findOrCreateUser(`test-owner-${randomUUID()}`);
    const project = createProject(
      owner.id,
      'Migrated project',
      `music-${randomUUID().slice(0, 12)}`,
      'public'
    );
    const card = createCard(cardInput(project.id, owner.id, 'public'));
    const chosenSlug = `chosen-${randomUUID().slice(0, 12)}`;
    const changedAgain = `changed-${randomUUID().slice(0, 12)}`;

    expect(project.default_card_visibility).toBe('public');
    const renamed = updateProject(project.id, owner.id, { slug: chosenSlug });
    expect(renamed?.slug).toBe(chosenSlug);
    expect(
      updateProject(project.id, owner.id, { slug: changedAgain })?.slug
    ).toBe(changedAgain);
    expect(getProjectBySlug(chosenSlug)).toBeUndefined();
    expect(getProjectBySlug(changedAgain)?.id).toBe(project.id);
    expect(getPublicCard(chosenSlug, card.public_id)).toBeUndefined();
    expect(getPublicCard(changedAgain, card.public_id)?.id).toBe(card.id);
  });

  it('lets only the owner delete a project and all of its data', () => {
    const owner = findOrCreateUser(`test-owner-${randomUUID()}`);
    const member = findOrCreateUser(`test-member-${randomUUID()}`);
    const project = createProject(
      owner.id,
      'Temporary project',
      `test-${randomUUID().slice(0, 12)}`,
      'public'
    );
    const remainingProject = createProject(
      owner.id,
      'Remaining project',
      `test-${randomUUID().slice(0, 12)}`,
      'public'
    );
    db.prepare(
      `INSERT INTO project_members (project_id, user_id, role, joined_at)
       VALUES (?, ?, 'member', ?)`
    ).run(project.id, member.id, new Date().toISOString());
    const session = createSession(
      owner.id,
      project.id,
      'Test record',
      'Test artist',
      '',
      null,
      null
    );
    const message = addMessage(session.id, 'user', 'A private impression');
    const card = createCard({
      ...cardInput(project.id, owner.id, 'public'),
      session_id: session.id,
    });

    expect(deleteProjectOrThrow(project.id, member.id)).toBe(false);
    expect(getProjectBySlug(project.slug)?.id).toBe(project.id);
    expect(deleteProjectOrThrow(project.id, owner.id)).toBe(true);
    expect(getProjectBySlug(project.slug)).toBeUndefined();
    expect(db.prepare('SELECT 1 FROM cards WHERE id = ?').get(card.id)).toBe(
      undefined
    );
    expect(
      db.prepare('SELECT 1 FROM sessions WHERE id = ?').get(session.id)
    ).toBe(undefined);
    expect(
      db.prepare('SELECT 1 FROM messages WHERE id = ?').get(message.id)
    ).toBe(undefined);
    expect(
      db
        .prepare('SELECT 1 FROM project_members WHERE project_id = ?')
        .get(project.id)
    ).toBe(undefined);
    expect(() => deleteProjectOrThrow(remainingProject.id, owner.id)).toThrow(
      '最後のプロジェクトは削除できません。'
    );
  });

  it('has no implicit private visibility defaults in the database', () => {
    const cardVisibility = (
      db.prepare('PRAGMA table_info(cards)').all() as {
        name: string;
        dflt_value: string | null;
      }[]
    ).find(column => column.name === 'visibility');
    const projectVisibility = (
      db.prepare('PRAGMA table_info(projects)').all() as {
        name: string;
        dflt_value: string | null;
      }[]
    ).find(column => column.name === 'default_card_visibility');

    expect(cardVisibility?.dflt_value).toBeNull();
    expect(projectVisibility?.dflt_value).toBeNull();
  });
});
