import { test, expect } from '@playwright/test'
import { login, expectHeading } from './helpers'

test.describe('Lecturador - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/reader')
  })

  test('debería mostrar encabezado del lector', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Lector Curimana' })).toBeVisible()
  })

  test('debería mostrar navegación inferior', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Lectura' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Pendientes' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sincronizar' })).toBeVisible()
  })

  test('debería mostrar botones de acción', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Nueva Lectura' })).toBeVisible()
  })
})

test.describe('Lecturador - Nueva Lectura', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/reader/new')
    await expectHeading(page, 'Nueva Lectura')
  })

  test('debería mostrar campo de búsqueda de suministro', async ({ page }) => {
    await expect(page.getByPlaceholder('N° Suministro')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Buscar suministro' })).toBeVisible()
  })

  test('debería mostrar campo de lectura actual', async ({ page }) => {
    await expect(page.getByLabel('Lectura Actual')).toBeVisible()
  })

  test('debería mostrar botón guardar lectura', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Guardar Lectura' })).toBeVisible()
  })
})

test.describe('Lecturador - Pendientes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/reader/pending')
    await expectHeading(page, 'Lecturas Pendientes')
  })

  test('debería mostrar página de pendientes', async ({ page }) => {
    await expect(page.getByPlaceholder('Buscar por nombre o suministro...')).toBeVisible()
  })
})

test.describe('Lecturador - Sincronización', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/reader/sync')
    await expectHeading(page, 'Sincronización')
  })

  test('debería mostrar página de sincronización', async ({ page }) => {
    await expect(page.getByText('Pendientes')).toBeVisible()
  })

  test('debería mostrar botón de sincronización', async ({ page }) => {
    const syncBtn = page.getByRole('button', { name: /Sincronizar|Sin datos pendientes/ })
    await expect(syncBtn).toBeVisible()
  })
})
