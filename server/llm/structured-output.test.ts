import { describe, expect, it } from 'vitest';
import { parseCompressedCard } from './compress.js';
import { parseRankedRecall } from './rank.js';

describe('structured LLM output', () => {
  it('requires every card field instead of filling omitted fields', () => {
    expect(() =>
      parseCompressedCard(
        JSON.stringify({
          title: 'Title',
          artist: 'Artist',
          hook: 'Hook',
          recall_phrase: 'Cue',
        })
      )
    ).toThrow('カード生成結果の形式が正しくありません。');
  });

  it('requires a results array for recall ranking', () => {
    expect(() => parseRankedRecall('{}')).toThrow(
      '想起結果の形式が正しくありません。'
    );
  });

  it('rejects invalid ranking values', () => {
    expect(() =>
      parseRankedRecall(
        JSON.stringify({
          results: [{ id: 'card', relevance: 2, reason: 'Reason' }],
        })
      )
    ).toThrow('想起結果の形式が正しくありません。');
  });
});
