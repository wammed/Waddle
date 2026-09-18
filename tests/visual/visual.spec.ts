import { test, expect } from '@playwright/test';

test.describe('Waddle Visual Regression Testing', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message));

    // Navigate to visual harness page
    await page.goto('/tests/visual/index.html');
    await page.waitForSelector('body[data-harness-ready="true"]', { timeout: 15000 });
    // Wait for canvas elements to paint
    await page.waitForTimeout(600);
  });

  test('TC-VISUAL-01: Kitty Unicode Placeholder (U+10EEEE) suppresses tofu and renders image', async ({ page }) => {
    const termContainer = page.locator('#term-unicode');
    await expect(termContainer).toBeVisible();
    await expect(termContainer).toHaveScreenshot('unicode-placeholder-tofu-free.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('TC-VISUAL-02: TUI preview box borders and image alignment (Yazi / Ranger)', async ({ page }) => {
    const termContainer = page.locator('#term-tui');
    await expect(termContainer).toBeVisible();
    await expect(termContainer).toHaveScreenshot('tui-preview-alignment.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('TC-VISUAL-03: High-Voltage Neon theme rendering and color fidelity', async ({ page }) => {
    const termContainer = page.locator('#term-neon');
    await expect(termContainer).toBeVisible();
    await expect(termContainer).toHaveScreenshot('high-voltage-neon-theme.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('TC-VISUAL-04: Main Waddle Application UI Layout & Shell', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root', { timeout: 10000 });
    await page.waitForTimeout(600);
    const root = page.locator('#root');
    await expect(root).toBeVisible();
    await expect(root).toHaveScreenshot('waddle-main-app-ui.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});
