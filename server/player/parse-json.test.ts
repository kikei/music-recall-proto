import { describe, expect, it } from 'vitest';
import { parsePlayerJson } from './parse-json.js';

describe('parsePlayerJson', () => {
  it('keeps a missing player as null', () => {
    expect(parsePlayerJson(null)).toBeNull();
  });

  it('surfaces malformed stored JSON', () => {
    expect(() => parsePlayerJson('{')).toThrow(SyntaxError);
  });

  it('surfaces stored JSON with an invalid player shape', () => {
    expect(() => parsePlayerJson('{"provider":"youtube"}')).toThrow(
      '保存されたプレイヤー情報の形式が正しくありません。'
    );
  });
});
