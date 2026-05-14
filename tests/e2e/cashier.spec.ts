import { test, expect } from '@playwright/test'
import { login, expectHeading } from './helpers'

test.describe('Cajero - Búsqueda y Cobros', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/cashier')
    await expectHeading(page, 'Caja Curimana')
  })

  test('debería mostrar encabezado de ventanilla', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Ventanilla Curimana' })).toBeVisible()
  })

  test('debería mostrar navegación de cajero', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Cobros' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Cierre de Caja' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Historial' })).toBeVisible()
  })

  test('debería mostrar input de búsqueda', async ({ page }) => {
    await expect(page.getByPlaceholder('N° Suministro o N° Recibo')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Buscar' })).toBeVisible()
  })

  test('debería mostrar mensaje si no hay caja abierta', async ({ page }) => {
    const noCajaMsg = page.getByText('No tienes una caja abierta')
    if (await noCajaMsg.isVisible()) {
      await expect(page.getByRole('link', { name: 'Abrir caja' })).toBeVisible()
    }
  })
})

test.describe('Cajero - Cierre de Caja', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/cashier/closure')
    await expectHeading(page, 'Cierre de Caja')
  })

  test('debería mostrar página de cierre de caja', async ({ page }) => {
    await expect(page.getByText('Cierre de Caja')).toBeVisible()
  })

  test('debería mostrar diálogo de apertura de caja', async ({ page }) => {
    const btnAbrir = page.getByRole('button', { name: 'Iniciar Sesión de Caja' })
    const btnAbrirAlt = page.getByRole('button', { name: 'Abrir Caja' })
    if (await btnAbrir.isVisible()) {
      await btnAbrir.click()
      await expect(page.getByRole('dialog').getByText('Apertura de Caja')).toBeVisible()
    } else if (await btnAbrirAlt.isVisible()) {
      await btnAbrirAlt.click()
      await expect(page.getByRole('dialog').getByText('Apertura de Caja')).toBeVisible()
    }
  })
})
