import { test, expect } from '@playwright/test';

// This e2e test covers registering (adding) a new problem via the Problem Manager.
// Flow:
// - Open app
// - Navigate to 問題管理 (Problem Management)
// - Click 問題を追加 (Add Problem)
// - Fill required fields and submit
// - Accept confirm/alert dialogs
// - Verify the new problem appears in the problems table

test.describe('Problem registration', () => {
  test('register a new problem via Problem Manager', async ({ page }) => {
    const uniqueTitle = `E2E 登録テスト ${Date.now()}`;

    await page.goto('https://playwright-study-site.vercel.app/');
    await page.waitForLoadState('networkidle');

    // Header visible
    await expect(page.getByRole('heading', { name: 'Playwright学習アプリ' })).toBeVisible();

    // Go to Problem Management
    await page.getByRole('button', { name: '問題管理' }).click();

    // Click Add Problem
    await page.getByRole('button', { name: '問題を追加' }).click();

    // Form scope: locate the form by a required field to avoid ambiguous buttons
    const form = page.locator('form').filter({ has: page.getByLabel('タイトル') });

    // Fill the form (required fields)
    await form.getByLabel('タイトル').fill(uniqueTitle);
    await form.getByLabel('問題文').fill('自動テストで追加された問題です。任意の説明文。');
    await form
      .getByLabel('期待する回答コード（メイン）')
      .fill("await page.locator('button').click();");
    await form.getByLabel('カテゴリ').fill('E2E');

    // Accept all dialogs (confirm + alert)
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Submit (disambiguate by scoping to the form)
    await form.getByRole('button', { name: '追加', exact: true }).click();

    // After successful addition, view should be back to problems list.
    // Verify that the newly added problem title appears in the table.
    await expect(page.getByRole('cell', { name: uniqueTitle })).toBeVisible();
  });
});
