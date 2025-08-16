import { test, expect } from '@playwright/test';

// This e2e test covers the core learning flow:
// - Open app
// - Start a session selecting the "基本操作" folder
// - Choose question order "未学習から優先" (deterministic order)
// - Solve the first problem by entering the expected code and verify success feedback

test.describe('Playwright learning app - basic flow', () => {
  test('start session and solve first problem', async ({ page }) => {
    await page.goto('/');

    // Wait for client-side to hydrate and network to be idle so buttons are clickable
    await page.waitForLoadState('networkidle');

    // Header is visible
    await expect(page.getByRole('heading', { name: 'Playwright学習アプリ' })).toBeVisible();

    // Prefer clicking the main CTA on dashboard to avoid nav hydration timing
    await page.getByRole('button', { name: '新しいセッションを開始' }).click();

    // Folder selection modal appears - title rendered as simple div, so use text locator
    await expect(page.getByText('学習するフォルダを選択')).toBeVisible();

    // Click the label text to toggle the checkbox (Radix checkbox with label htmlFor)
    await page.getByText('基本操作', { exact: false }).click();

    // Confirm selection
    await page.getByRole('button', { name: /選択完了/ }).click();

    // Question order modal - choose "未学習から優先" (title is div as well)
    await expect(page.getByText('出題方法を選択')).toBeVisible();
    await page.getByRole('button', { name: '未学習から優先' }).click();

    // Learning view appears with first problem from the "基本操作" folder
    await expect(page.getByText('問題 1 /', { exact: false })).toBeVisible();
    await expect(page.getByRole('heading', { name: '基本的な要素選択' })).toBeVisible();
    await expect(page.getByText('ページ内のボタン要素を選択してください。')).toBeVisible();

    // Enter the expected code into the editor
    const editor = page.getByPlaceholder('ここにPlaywrightコードを入力してください...');
    await editor.fill("await page.locator('button').click();");

    // Run the code
    await page.getByRole('button', { name: '実行' }).click();

    // Verify success feedback is shown
    await expect(page.getByText('正解です！素晴らしい！')).toBeVisible();
  });
});
