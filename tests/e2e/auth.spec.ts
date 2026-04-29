import { test, expect } from '@playwright/test';

test.describe('Autenticación y Roles', () => {
  test('debería permitir login como admin y redirigir a dashboard', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'admin@curimana.gob.pe');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('h2')).toContainText('Panel Administrativo');
  });

  test('debería denegar acceso a /admin para un lecturista', async ({ page }) => {
    // Simular sesión de lector
    await page.goto('/login');
    await page.fill('input[type="email"]', 'reader@curimana.gob.pe');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('/admin');
    await expect(page).not.toHaveURL(/\/admin/);
    await expect(page).toHaveURL(/\/reader/);
  });
});
