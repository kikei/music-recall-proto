import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { readJsonObject } from './json-body.js';

function parse(body: string) {
  const app = new Hono();
  app.post('/', async c => {
    const value = await readJsonObject(c.req);
    return c.json({ value });
  });
  return app.request('/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
}

describe('readJsonObject', () => {
  it('reads an object body', async () => {
    const response = await parse('{"name":"music"}');
    expect(await response.json()).toEqual({ value: { name: 'music' } });
  });

  it.each(['{', 'null', '[]', '"text"'])('rejects %s', async body => {
    const response = await parse(body);
    expect(await response.json()).toEqual({ value: null });
  });
});
