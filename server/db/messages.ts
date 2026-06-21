import { randomUUID } from 'node:crypto';
import { db } from './open.js';

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export function addMessage(
  sessionId: string,
  role: MessageRole,
  content: string
): Message {
  const message: Message = {
    id: randomUUID(),
    session_id: sessionId,
    role,
    content,
    created_at: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO messages (id, session_id, role, content, created_at)
     VALUES (@id, @session_id, @role, @content, @created_at)`
  ).run(message);
  return message;
}

export function listMessages(sessionId: string): Message[] {
  return db
    .prepare(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC'
    )
    .all(sessionId) as Message[];
}
