import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chartTicks, niceMax } from '../src/chart-presentation.ts';
test('date ticks are sparse, evenly spaced, UTC-safe and keep endpoints', () => {
  const labels = Array.from({length: 12}, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);
  assert.deepEqual(chartTicks(labels, true, 192), [
    {index: 0, text: 'Sep 1'}, {index: 6, text: 'Sep 7'}, {index: 11, text: 'Sep 12'}
  ]);
  assert.equal(chartTicks(['2026-02-30'], true, 192)[0].text, '2026-02-30');
  assert.equal(chartTicks(['2026-09-01'], false, 192)[0].text, '2026-09-01');
  assert.deepEqual(chartTicks([], true, 192), []);
});
test('niceMax gives four round steps with headroom', () => {
  assert.equal(niceMax(1800), 2000);
  assert.equal(niceMax(3), 4);
  assert.equal(niceMax(79455), 100000);
  assert.ok(niceMax(0.37) >= 0.37);
  assert.equal(niceMax(1234), 2000);
});
