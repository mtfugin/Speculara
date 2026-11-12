import { test, expect } from '@playwright/test';

test('phone chart labels, full values and comfortable wrapped controls', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  for (const link of await page.locator('a[download]').all()) {
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('button', { name: 'Try synthetic demo data' }).click();
  await expect(page.getByRole('region', { name: 'Dataset summary' })).toContainText('42 rows', { timeout: 30000 });
  const charts = page.getByRole('region', { name: 'Charts results' });
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const scale of width < 400 ? [1, 1.25] : [1]) {
      await page.evaluate(scale => document.documentElement.style.fontSize = `${16 * scale}px`, scale);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      // Bounding boxes include transforms, so wait for entrance animations to finish.
      await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.timeline === document.timeline && a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished)));
      for (const group of await page.getByRole('group', { name: 'Analysis options', exact: true }).all()) {
        expect(await group.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        for (const button of await group.getByRole('button').all()) {
          const rect = (await button.boundingBox())!;
          expect(rect.height).toBeGreaterThanOrEqual(44);
          expect(rect.width).toBeGreaterThanOrEqual(44);
        }
      }
      const chart = charts.getByRole('img');
      const ticks = chart.locator('[data-chart-tick]');
      await expect(ticks.first()).toBeVisible();
      expect(await ticks.count()).toBeLessThanOrEqual(width < 400 ? 4 : 12);
      await expect(ticks.first()).toHaveText('Sep 1');
      await expect(ticks.last()).toHaveText('Sep 12');
      const tickMetrics = await ticks.evaluateAll(elements => elements.map(el => ({
        size: parseFloat(getComputedStyle(el).fontSize), clipped: el.scrollWidth > el.clientWidth,
      })));
      for (const tick of tickMetrics) {
        expect(tick.size).toBeGreaterThanOrEqual(12);
        expect(tick.clipped).toBe(false);
      }
      await expect(chart).toHaveAccessibleName(/2026-09-01/);
      for (const text of await chart.locator('span').all()) {
        expect(await text.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(12);
      }
      if (width === 320 && scale === 1.25) {
        await page.screenshot({ path: '.superpowers/ui-fixes/3-chart-320-text125.png', fullPage: true });
        await chart.evaluate(el => el.scrollIntoView({ block: 'center' }));
        await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
        await page.screenshot({ path: '.superpowers/ui-fixes/3-chart-detail-320-text125.png' });
      }
      expect(await chart.locator('[data-chart-bar]').count()).toBe(12);
    }
  }
  await charts.getByText('View exact chart data', { exact: true }).click();
  const table = charts.locator('details').filter({ has: page.getByText('View exact chart data', { exact: true }) }).locator('table');
  for (const row of await table.locator('tbody tr').all()) {
    const label = await row.locator('th').innerText();
    const value = (await row.locator('td').innerText()).replaceAll(',', '');
    await expect(charts.locator(`[data-chart-bar][title="${label}: ${value}"]`)).toHaveCount(1);
  }
});


test('prediction dates remain exact and sparse without losing estimates', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Try synthetic demo data' }).click();
  await expect(page.getByRole('region', { name: 'Dataset summary' })).toContainText('42 rows', { timeout: 30000 });
  await page.getByRole('group', { name: 'Analysis options' }).filter({ has: page.getByRole('button', { name: 'Predict', exact: true }) }).getByRole('button', { name: 'Predict', exact: true }).click();
  const result = page.getByRole('region', { name: 'Predict results' });
  const chart = result.getByRole('img');
  await expect(chart.locator('[data-chart-bar]')).toHaveCount(7);
  await expect(chart.locator('[data-chart-tick]').first()).toHaveText('Oct 13');
  await expect(chart.locator('[data-chart-tick]').last()).toHaveText('Oct 19');
  await expect(chart).toHaveAccessibleName(/2026-10-13/);
  for (const bar of await chart.locator('[data-chart-bar]').all()) {
    expect(await bar.getAttribute('title')).toMatch(/^2026-10-\d{2}: \d/);
  }
});
