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
