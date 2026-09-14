import { test, expect } from '@playwright/test';
import { mockYouTube, mockMultiplayer } from './youtube-mock.js';

test.beforeEach(async ({ page }) => {
  await mockYouTube(page);
  await mockMultiplayer(page);
});

test('music is opt-in, has three songs, and supports auto-advance and controls in Marathi', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.locator('#sound-toggle').click();
  await expect(page.locator('#music-count')).toHaveText('१ / ३');
  expect(await page.evaluate(() => Boolean(window.__musicPlayer))).toBe(false);
  await page.locator('#music-play').click();
  await expect(page.locator('#music-play')).toHaveText('थांबवा');
  await expect(page.locator('#music-title')).toHaveText('माझा बाप्पा आला');
  expect(await page.evaluate(() => window.__musicOptions.hl)).toBe('mr');
  await expect(page.locator('#youtube-frame iframe')).toHaveAttribute('title', 'यूट्यूबवरील गणपतीची गाणी');
  await page.locator('#music-next').click();
  await expect(page.locator('#music-title')).toHaveText('देवा श्री गणेशा');
  await page.locator('#music-previous').click();
  await expect(page.locator('#music-title')).toHaveText('माझा बाप्पा आला');
  await page.evaluate(() => window.__musicPlayer.finish());
  await expect(page.locator('#music-title')).toHaveText('देवा श्री गणेशा');
  await page.locator('#music-volume').fill('25');
  await expect(page.locator('#music-volume-value')).toHaveText('२५%');
  expect(await page.evaluate(() => window.__musicPlayer.volume)).toBe(25);
  await page.locator('#music-shuffle').click();
  await expect(page.locator('#music-shuffle')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#music-title')).toHaveText('देवा श्री गणेशा');
  await page.screenshot({ path: testInfo.outputPath('music-player.png') });
  await page.locator('#music-close').click();
  await expect(page.locator('#music-panel')).toBeHidden();
  expect(await page.evaluate(() => window.__musicCalls.at(-1)[0])).not.toBe('pause');
  await page.locator('#sound-toggle').click();
  await expect(page.locator('#music-play')).toHaveText('थांबवा');
});

test('validates additional songs, avoids duplicates, and loads playlists', async ({ page }) => {
  await page.goto('/');
  await page.locator('#sound-toggle').click();
  await page.locator('#music-library summary').click();
  await expect(page.locator('#music-queue li')).toHaveCount(3);
  await page.locator('#music-url').fill('https://youtu.be/_op9dPmACsE');
  await page.locator('#music-add-form button').click();
  await expect(page.locator('#music-add-status')).toContainText('आपल्या यादीत आधीच आहे');
  await page.locator('#music-url').fill('https://youtube.com.evil.test/watch?v=_op9dPmACsE');
  await page.locator('#music-add-form button').click();
  await expect(page.locator('#music-add-status')).toContainText('योग्य दुवा द्या');
  await page.locator('#music-url').fill('https://youtube.com/watch?v=M7lc1UVf-VE');
  await page.locator('#music-add-form button').click();
  await expect(page.locator('#music-queue li')).toHaveCount(4);
  await page.locator('#music-play').click();
  await expect(page.locator('#music-play')).toHaveText('थांबवा');
  await page.locator('#music-url').fill('https://www.youtube.com/playlist?list=PLabcdefghijklmno');
  await page.locator('#music-add-form button').click();
  await expect(page.locator('#music-queue li')).toHaveCount(2);
  await expect(page.locator('#music-title')).toHaveText('देवा श्री गणेशा');
  await page.locator('#music-reset').click();
  await expect(page.locator('#music-queue li')).toHaveCount(3);
  await expect(page.locator('#music-title')).toHaveText('माझा बाप्पा आला');
});

test('shows embedding and autoplay failures without claiming music is playing', async ({ page }) => {
  await page.goto('/');
  await page.locator('#sound-toggle').click();
  await page.locator('#music-play').click();
  await expect(page.locator('#music-play')).toHaveText('थांबवा');
  await page.evaluate(() => window.__musicPlayer.error(150));
  await expect(page.locator('#music-status')).toContainText('वाजवण्याची परवानगी नाही');
  await expect(page.locator('#music-play')).toHaveText('ऐका');
  await expect(page.locator('#sound-label')).toHaveText('गणपतीची गाणी');
  await page.locator('#music-next').click();
  await expect(page.locator('#music-play')).toHaveText('थांबवा');
  await page.evaluate(() => window.__musicPlayer.block());
  await expect(page.locator('#music-status')).toContainText('दृश्यातील सुरू करण्याचे बटण दाबा');
  await expect(page.locator('#music-play')).toHaveText('ऐका');
});

test('closing the panel keeps background audio playing after YouTube loads', async ({ page }) => {
  await page.addInitScript(() => { window.__musicReadyDelay = 700; });
  await page.goto('/');
  await page.locator('#sound-toggle').click();
  await page.locator('#music-play').click();
  await expect(page.locator('#music-play')).toHaveText('जोडत आहोत…');
  await page.locator('#music-close').click();
  await page.waitForFunction(() => window.__musicReady && window.__musicPlayer.cued);
  expect(await page.evaluate(() => window.__musicCalls.filter(call => call[0] === 'play').length)).toBeGreaterThanOrEqual(1);
});

test('the audio-only stage is shown and the video stays hidden without horizontal overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('#sound-toggle').click();
  await expect(page.locator('#music-stage')).toBeVisible();
  await page.locator('#music-play').click();
  await expect(page.locator('#music-play')).toHaveText('थांबवा');
  const frame = page.locator('#youtube-frame iframe');
  expect(await frame.count()).toBeGreaterThan(0);
  expect(await frame.isVisible()).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile-music.png') });
  await page.locator('#music-close').click();
  await expect(page.locator('#music-panel')).toBeHidden();
});

test('entering the mandap auto-plays background audio without showing video', async ({ page }) => {
  await page.goto('/');
  await page.locator('#visitor-name').fill('आरव');
  await page.locator('#enter-button').click();
  await expect(page.locator('#game-hud')).toBeVisible();
  await page.waitForFunction(() => window.__musicPlayer && window.__musicCalls.some(call => call[0] === 'play'), { timeout: 10000 });
  await page.locator('#sound-toggle').click();
  await expect(page.locator('#music-play')).toHaveText('थांबवा');
  expect(await page.locator('#youtube-frame iframe').isVisible()).toBe(false);
});
