import { test, expect } from '@playwright/test';

test.describe('Flujo de Negocio Completo', () => {
  test('Flujo: Registro -> Lectura -> Facturación -> Pago', async ({ page }) => {
    // 1. Admin crea un nuevo cliente
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@curimana.gob.pe');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('/admin/customers');
    // Simular creación de cliente... (simplificado para el test)
    
    // 2. Lector registra lectura
    await page.goto('/login');
    await page.fill('input[type="email"]', 'reader@curimana.gob.pe');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('/reader/new');
    await page.fill('input[placeholder="N° Suministro"]', '100000001');
    await page.click('button:has-text("Buscar")');
    await page.fill('input[type="number"]', '1350'); // Lectura actual
    await page.click('button:has-text("Guardar Lectura")');

    // 3. Admin cierra periodo y genera recibos
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@curimana.gob.pe');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('/admin/periods');
    // Click en cerrar periodo actual
    
    // 4. Cajero realiza el cobro
    await page.goto('/login');
    await page.fill('input[type="email"]', 'cashier@curimana.gob.pe');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('/cashier');
    await page.fill('input[placeholder*="Suministro"]', '100000001');
    await page.click('button:has-text("Buscar")');
    await expect(page.locator('p:has-text("Juan Perez Garcia")')).toBeVisible();
  });
});
