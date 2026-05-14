import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Mobile - Responsive Reader', () => {
  test('lecturador: navegación inferior visible en móvil', async ({ page }) => {
    await login(page)
    await page.goto('/reader')

    await expect(page.getByRole('heading', { name: 'Lector Curimana' })).toBeVisible({ timeout: 10000 })

    const bottomNav = page.locator('nav').filter({ has: page.getByRole('link', { name: 'Lectura' }) })
    await expect(bottomNav).toBeVisible()
    await expect(page.getByRole('link', { name: 'Pendientes' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sincronizar' })).toBeVisible()
  })

  test('lecturador: nueva lectura en móvil', async ({ page }) => {
    await login(page)
    await page.goto('/reader/new')

    await expect(page.getByRole('heading', { name: 'Nueva Lectura' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByPlaceholder('N° Suministro')).toBeVisible()
    await expect(page.getByLabel('Lectura Actual')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Guardar Lectura' })).toBeVisible()
  })
})

test.describe('Mobile - Responsive Cashier', () => {
  test('cajero: encabezado visible en móvil', async ({ page }) => {
    await login(page)
    await page.goto('/cashier')

    await expect(page.getByRole('heading', { name: 'Ventanilla Curimana' })).toBeVisible({ timeout: 10000 })
  })
})
