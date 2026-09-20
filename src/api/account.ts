import { request } from './http.js';

// The account as this app knows it. The identity provider keeps the real
// profile; the only name here is the one the person chose, and it is a label
// rather than an identifier -- nothing resolves or routes by it.
export interface Account {
  displayName: string;
}

export function getAccount(): Promise<Account> {
  return request('/api/account');
}

export function setDisplayName(displayName: string): Promise<Account> {
  return request('/api/account', {
    method: 'PATCH',
    body: JSON.stringify({ displayName }),
  });
}

export function deleteAccount(): Promise<{ ok: true }> {
  return request('/api/account', { method: 'DELETE' });
}
