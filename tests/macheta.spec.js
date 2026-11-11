const { test, expect } = require('@playwright/test');

async function open(page) {
  const errors = [], bad = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
  page.on('requestfailed', r => bad.push('FAILED ' + r.url()));
  await page.goto('/', { waitUntil: 'load' });
  return { errors, bad };
}
async function scrollThrough(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 120)); }
    await Promise.all([...document.images].filter(i => i.getAttribute('src') && !i.complete).map(i => new Promise(r => { i.onload = i.onerror = r; })));
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForLoadState('networkidle');
}

test('fără erori JS, fără 404, toate pozele încărcate, captură full-page', async ({ page }, info) => {
  const { errors, bad } = await open(page);
  await scrollThrough(page);
  const imgs = await page.evaluate(() => [...document.images].filter(i => i.getAttribute('src')).map(i => ({ src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0 })));
  for (const n of [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11]) expect(imgs.some(i => i.src === `assets/p${n}.webp` && i.ok), `p${n} încărcată`).toBe(true);
  expect(imgs.filter(i => !i.ok)).toEqual([]);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `referinta/${info.project.name}.png`, fullPage: true });
  expect(bad).toEqual([]);
  expect(errors).toEqual([]);
});

test('fără scroll orizontal; #hb vizibil doar pe mobil', async ({ page }) => {
  await open(page);
  const w = page.viewportSize().width;
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
  if (w === 390) await expect(page.locator('#hb')).toBeVisible();
  else await expect(page.locator('#hb')).toBeHidden();
});

test('primul produs deschide #qvm, #qadd face #cn = 1', async ({ page }) => {
  await open(page);
  await expect(page.locator('#cn')).toHaveText('0');
  await page.locator('#gr .pc').first().click();
  await expect(page.locator('#qvm')).toBeVisible();
  await page.locator('#qadd').click();
  await expect(page.locator('#cn')).toHaveText('1');
});

test('butonul „1 an” setează un filtru pe #baf', async ({ page }) => {
  await open(page);
  await page.locator('#yrs').scrollIntoViewIfNeeded();
  await page.locator('#yrs button', { hasText: '1 an' }).click();
  await expect(page.locator('#yrs button', { hasText: '1 an' })).toHaveClass(/on/);
  await expect.poll(() => page.locator('#baf').evaluate(e => getComputedStyle(e).filter)).not.toBe('none');
  expect(await page.locator('#baf').evaluate(e => getComputedStyle(e).filter)).not.toBe('');
});

test('hotspot 1 afișează #tip cu „Bancul de lucru din 1978”', async ({ page }) => {
  await open(page);
  await page.locator('.hs[data-i="1"]').click();
  await expect(page.locator('#tip')).toBeVisible();
  await expect(page.locator('#tip')).toContainText('Bancul de lucru din 1978');
});
