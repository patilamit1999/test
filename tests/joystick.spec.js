import { test, expect } from '@playwright/test';
import { mockYouTube, mockMultiplayer } from './youtube-mock.js';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });

async function touches(page) {
  const client = await page.context().newCDPSession(page);
  const points = new Map();
  const send = type => client.send('Input.dispatchTouchEvent', { type, touchPoints: [...points.values()] });
  return {
    async start(id, x, y) { points.set(id, { id, x, y, radiusX: 8, radiusY: 8, force: 1 }); await send('touchStart'); },
    async move(id, x, y) { points.set(id, { id, x, y, radiusX: 8, radiusY: 8, force: 1 }); await send('touchMove'); },
    async end(id) {
      const point = points.get(id);
      points.delete(id);
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: points.size ? [point] : [] });
    },
    async cancel() { if (points.size) { points.clear(); await send('touchCancel'); } },
  };
}

async function center(page) {
  const bounds = await page.locator('#joystick').boundingBox();
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

async function offset(page) {
  return page.locator('#joystick').evaluate(element => ({
    x: parseFloat(element.style.getPropertyValue('--stick-x')) || 0,
    y: parseFloat(element.style.getPropertyValue('--stick-y')) || 0,
  }));
}

test.beforeEach(async ({ page }) => {
  await mockYouTube(page);
  await mockMultiplayer(page);
  await page.goto('/');
  await page.locator('#visitor-name').fill('अमित');
  await page.locator('#enter-button').tap();
  await expect(page.locator('#joystick')).toBeVisible();
});

test('real touch walks forward and release stops backward movement without scrolling', async ({ page }) => {
  const touch = await touches(page);
  const point = await center(page);
  await touch.start(1, point.x, point.y);
  await touch.move(1, point.x, point.y - 44);
  await expect(page.locator('#joystick')).toHaveClass(/is-active/);
  expect((await offset(page)).y).toBeLessThan(0);
  await expect(page.locator('#location-label')).toHaveText('बाप्पांच्या चरणी', { timeout: 15000 });
  await touch.end(1);
  await expect(page.locator('#joystick')).not.toHaveClass(/is-active/);
  expect(await offset(page)).toEqual({ x: 0, y: 0 });
  await page.locator('#leave-button').tap();
  await page.locator('#visitor-name').fill('अमित');
  await page.locator('#enter-button').tap();
  await expect(page.locator('#joystick')).toBeVisible();
  await touch.start(1, point.x, point.y);
  await touch.move(1, point.x, point.y + 44);
  await page.waitForTimeout(220);
  await touch.end(1);
  await page.waitForTimeout(1200);
  await expect(page.locator('#location-label')).not.toHaveText('बाप्पांच्या चरणी');
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test('diagonal dragging stays clamped and a second finger can look around', async ({ page }, testInfo) => {
  const touch = await touches(page);
  const point = await center(page);
  await touch.start(1, point.x, point.y);
  await touch.move(1, point.x + 90, point.y - 90);
  const diagonal = await offset(page);
  expect(diagonal.x).toBeGreaterThan(0);
  expect(diagonal.y).toBeLessThan(0);
  expect(Math.hypot(diagonal.x, diagonal.y)).toBeLessThanOrEqual(35);
  await touch.start(2, 300, 420);
  await touch.move(2, 335, 420);
  await touch.end(2);
  await expect(page.locator('#joystick')).toHaveClass(/is-active/);
  expect(await offset(page)).toEqual(diagonal);
  await page.screenshot({ path: testInfo.outputPath('mobile-joystick.png') });
  await touch.cancel();
  await expect(page.locator('#joystick')).not.toHaveClass(/is-active/);
  expect(await offset(page)).toEqual({ x: 0, y: 0 });
});

test('cancellation, capture loss, dialogs, and focus loss reset the joystick', async ({ page }) => {
  const touch = await touches(page);
  const point = await center(page);
  await page.locator('#joystick').evaluate(element => element.addEventListener('pointerdown', event => { window.__joystickPointer = event.pointerId; }));
  for (const reason of ['cancel', 'capture', 'dialog', 'blur']) {
    await touch.start(1, point.x, point.y);
    await touch.move(1, point.x, point.y + 34);
    await expect(page.locator('#joystick')).toHaveClass(/is-active/);
    if (reason === 'cancel') await touch.cancel();
    if (reason === 'capture') {
      await page.locator('#joystick').evaluate(element => element.releasePointerCapture(window.__joystickPointer));
      await touch.move(1, point.x, point.y + 36);
    }
    if (reason === 'dialog') await page.locator('#help-toggle').evaluate(element => element.click());
    if (reason === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(page.locator('#joystick')).not.toHaveClass(/is-active/);
    expect(await offset(page)).toEqual({ x: 0, y: 0 });
    await touch.cancel();
    if (reason === 'dialog') await page.locator('#close-dialog').tap();
  }
});

test('portrait and landscape controls fit the screen and rotation stops movement', async ({ page }, testInfo) => {
  await page.keyboard.down('w');
  await expect(page.locator('#location-label')).toHaveText('बाप्पांच्या चरणी', { timeout: 15000 });
  await page.keyboard.up('w');
  await expect(page.locator('#toast')).toBeHidden({ timeout: 6000 });
  const touch = await touches(page);
  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) {
    const point = await center(page);
    await touch.start(1, point.x, point.y);
    await touch.move(1, point.x + 34, point.y);
    await page.setViewportSize(viewport);
    await expect(page.locator('#joystick')).not.toHaveClass(/is-active/);
    await touch.cancel();
    const joystick = await page.locator('#joystick').boundingBox();
    expect(joystick.x).toBeGreaterThanOrEqual(0);
    expect(joystick.y).toBeGreaterThanOrEqual(0);
    expect(joystick.y + joystick.height).toBeLessThanOrEqual(viewport.height);
    const action = await page.locator('#interaction').boundingBox();
    if (action) expect(action.y + action.height <= joystick.y || action.x >= joystick.x + joystick.width).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath('landscape-joystick.png') });
});
