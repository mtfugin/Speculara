import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plainChat } from '../src/analysis.ts';

test('chat replies lose markdown marks and label openers', () => {
  const raw = '**Changed:** Latest week is 131 sales.\n**Matters:** 678 sales.\n- Try this\n## Heading\n\n\n\nEnd';
  const out = plainChat(raw);
  assert.doesNotMatch(out, /\*|#|^-/m);
  assert.doesNotMatch(out, /^(Changed|Matters)\s*:/m);
  assert.match(out, /Latest week is 131 sales\./);
  assert.doesNotMatch(out, /\n{3,}/);
});

test('ordinary colons inside a sentence are kept', () => {
  assert.equal(plainChat('Pearson r = 0.9, see this: it is strong'), 'Pearson r = 0.9, see this: it is strong');
});

import { answer } from '../src/analysis.ts';
test('open questions like "what does my data tell me" get a plain overview', async () => {
  const a: any = {
    schema_version: 2, rows: 42, metrics: ['views', 'sales'], totals: { views: 79455, sales: 678 },
    periods: { sales: { available: true, reason: null, current_total: 131, previous_total: 141, absolute_change: -10 } },
    correlation: [{ a: 'views', b: 'sales', r: 0.8, p: 0.01, n: 42, spearman_r: 0.8, spearman_p: 0.01, small_sample: false }],
    predict: { available: true, reason: null, metric: 'sales', points: [{ label: 'x', value: 12 }] },
    recommend: [{ title: 't', evidence: 'e', action: 'Review the offer and checkout link.' }],
    sentiment: { available: false }, demand: { available: false }, ratios: {}, rankings: { categories: {}, posts: {} }, warnings: [],
  };
  for (const q of ['What is our current data tells us?', 'What does my data tell me?', 'Give me an overview']) {
    const out = answer(q, a);
    assert.match(out, /79,455 views and 678 sales across 42 entries/);
    assert.match(out, /131 sales/);
    assert.match(out, /A good next step is to review the offer/);
    assert.doesNotMatch(out, /I cannot fetch|did not quite get/);
  }
  assert.match(answer('purple elephants', a), /did not quite get that/);
});
