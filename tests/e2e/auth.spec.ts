import { test, expect } from '@playwright/test';

test.describe('Autenticación y Roles', () => {
  test('debería permitir login como admin y redirigir a dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="email"]', 'admin@curimana.gob.pe');
    await page.fill('input[name="password"]', 'password');
    await page.waitForTimeout(1000);
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Iniciar Sesión")');

    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('h1')).toContainText('Panel Administrativo');
  });

  // test.skip('debería denegar acceso a /admin para un lecturista', async ({ page }) => {
  //   // Omitido por límite de creación de cuentas (rate limit de email en Supabase)
  // });
});
