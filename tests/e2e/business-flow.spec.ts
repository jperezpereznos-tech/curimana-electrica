import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Flujo de Negocio Completo', () => {
  test('Admin: login → dashboard → navegación', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/\/admin/)
    await expect(page.getByRole('heading', { name: 'Panel Administrativo' })).toBeVisible({ timeout: 10000 })

    await page.getByRole('link', { name: 'Clientes', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Gestion de Clientes' })).toBeVisible({ timeout: 10000 })

    await page.getByRole('link', { name: 'Periodos', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Periodos de Facturacion' })).toBeVisible({ timeout: 10000 })
  })

  test('Admin: crear cliente vía diálogo', async ({ page }) => {
    await login(page)
    await page.goto('/admin/customers')
    await expect(page.getByRole('heading', { name: 'Gestion de Clientes' })).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: 'Nuevo Cliente' }).click()
    await expect(page.getByRole('dialog').getByText('Registrar Nuevo Cliente')).toBeVisible()

    await page.getByLabel('N° de Suministro').fill('999999999')
    await page.getByLabel('Nombre Completo').fill('Test E2E Cliente')
    await page.getByLabel('DNI / RUC').fill('12345678')
    await page.getByLabel('Dirección').fill('Calle Test 123')

    await page.getByRole('button', { name: 'Registrar Suministro' }).click()
  })

  test('Cajero: búsqueda de suministro', async ({ page }) => {
    await login(page)
    await page.goto('/cashier')
    await expect(page.getByRole('heading', { name: 'Caja Curimana' })).toBeVisible({ timeout: 10000 })

    const searchInput = page.getByPlaceholder('N° Suministro o N° Recibo')
    if (await searchInput.isVisible()) {
      await searchInput.fill('100000001')
      await page.getByRole('button', { name: 'Buscar' }).click()
    }
  })
})
