import { test, expect } from '@playwright/test';
import { mockYouTube, mockMultiplayer } from './youtube-mock.js';

test.use({ channel: 'chrome', viewport: { width: 1440, height: 1000 }, baseURL: 'http://localhost:5173' });

test.beforeEach(async ({ page }) => {
  await mockYouTube(page);
  await mockMultiplayer(page);
});

test('the entry greeting and all first-party welcome text are Marathi', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'mr');
  await expect(page.locator('#entry-greeting')).toContainText('गणेश चतुर्थीच्या हार्दिक शुभेच्छा!');
  await expect(page.locator('#entry-greeting')).toContainText('अंकित, अमित आणि पाटील परिवार');
  await expect(page.locator('#world')).toHaveAttribute('aria-describedby', 'entry-greeting');
  const untranslated = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const found = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.parentElement.closest('script, style, kbd') && /[A-Za-z]/.test(node.textContent)) found.push(node.textContent.trim());
    }
    for (const element of document.querySelectorAll('[aria-label], [placeholder], [title]')) {
      for (const attribute of ['aria-label', 'placeholder', 'title']) {
        const value = element.getAttribute(attribute);
        if (value && /[A-Za-z]/.test(value)) found.push(value);
      }
    }
    return found;
  });
  expect(untranslated).toEqual([]);
});

test('desktop visitor can enter, walk, offer flowers, and collect prasad', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#enter-button')).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('welcome.png'), fullPage: true });
  await page.locator('#visitor-name').fill('  आरव  ');
  await page.locator('#enter-button').click();
  await expect(page.locator('#visitor-greeting')).toHaveText('नमस्कार, आरव');
  await expect(page.locator('#interaction')).toBeHidden();
  await expect(page.locator('#toast')).toBeHidden({ timeout: 6000 });
  await page.screenshot({ path: testInfo.outputPath('entrance-banner.png') });
  await page.keyboard.down('w');
  await expect(page.locator('#location-label')).toHaveText('बाप्पांच्या चरणी', { timeout: 15000 });
  await page.keyboard.up('w');
  await page.screenshot({ path: testInfo.outputPath('darshan.png') });
  await page.evaluate(() => window.__world?.teleport({ x: 5.1, z: 1 }));
  await expect(page.locator('#location-label')).toHaveText('प्रसाद कक्ष', { timeout: 15000 });
  await page.locator('#sound-toggle').click();
  await expect(page.locator('#music-panel')).toBeVisible();
  await expect(page.locator('#sound-toggle')).toHaveAttribute('aria-expanded', 'true');
  await page.locator('#sound-toggle').click();
  await expect(page.locator('#music-panel')).toBeHidden();
  await expect(page.locator('#sound-toggle')).toHaveAttribute('aria-expanded', 'false');
  await page.locator('#leave-button').click();
  await expect(page.locator('#welcome')).toBeVisible();
  expect(errors).toEqual([]);
});

test('names render as text and whitespace-only names cannot enter', async ({ page }) => {
  await page.goto('/');
  await page.locator('#visitor-name').fill('   ');
  await page.locator('#enter-button').click();
  await expect(page.locator('#game-hud')).toBeHidden();
  expect(await page.locator('#visitor-name').evaluate(input => input.validationMessage)).toBe('दर्शन सुरू करण्यासाठी कृपया आपले नाव लिहा.');
  await page.locator('#visitor-name').fill('<b>Aarya</b>');
  await page.locator('.avatar-option').filter({ hasText: 'स्त्री' }).click();
  await page.locator('#enter-button').click();
  await expect(page.locator('#visitor-greeting')).toHaveText('नमस्कार, <b>Aarya</b>');
  await expect(page.locator('#visitor-greeting b')).toHaveCount(0);
});

test('mobile has no horizontal overflow and supports touch navigation', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await mockYouTube(page);
  await mockMultiplayer(page);
  await page.goto('http://localhost:5173');
  await expect(page.locator('#enter-button')).toBeEnabled();
  await expect(page.locator('#entry-greeting')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile-welcome.png'), fullPage: true });
  await page.locator('#visitor-name').fill('सई');
  await page.locator('.avatar-option').filter({ hasText: 'तटस्थ' }).click();
  await page.locator('#enter-button').tap();
  await expect(page.locator('.touch-controls')).toBeVisible();
  await page.keyboard.down('w');
  await expect(page.locator('#location-label')).toHaveText('बाप्पांच्या चरणी', { timeout: 15000 });
  await page.keyboard.up('w');
  await expect(page.locator('#toast')).toBeHidden({ timeout: 6000 });
  await page.screenshot({ path: testInfo.outputPath('mobile-darshan.png') });
  await page.locator('#help-toggle').tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#dialog-title')).toHaveText('चला, मंडपात फेरफटका मारूया');
  await page.locator('#close-dialog').tap();
  const joystick = page.locator('#joystick');
  await expect(joystick).toBeVisible();
  await expect(page.locator('[data-move]')).toHaveCount(0);
  const bounds = await joystick.boundingBox();
  const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 44);
  await expect(page.locator('#location-label')).toHaveText('मंडपात फेरफटका', { timeout: 8000 });
  await page.mouse.up();
  await expect(joystick).not.toHaveClass(/is-active/);
  await expect(page.locator('#interaction')).toBeHidden();
  await context.close();
});
