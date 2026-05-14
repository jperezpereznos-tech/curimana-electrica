import { test, expect } from '@playwright/test'
import { login, expectHeading, navigateViaSidebar } from './helpers'

test.describe('Admin - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('debería mostrar el panel administrativo con KPIs', async ({ page }) => {
    await expectHeading(page, 'Panel Administrativo')
    await expect(page.getByText('Recaudacion del Mes')).toBeVisible()
    await expect(page.getByText('Deuda Pendiente')).toBeVisible()
    await expect(page.getByText('Clientes Activos')).toBeVisible()
    await expect(page.getByText('Recibos Pendientes')).toBeVisible()
  })

  test('debería navegar por sidebar a Clientes', async ({ page }) => {
    await navigateViaSidebar(page, 'Clientes')
    await expectHeading(page, 'Gestion de Clientes')
  })

  test('debería navegar por sidebar a Periodos', async ({ page }) => {
    await navigateViaSidebar(page, 'Periodos')
    await expectHeading(page, 'Periodos de Facturacion')
  })

  test('debería navegar por sidebar a Recibos', async ({ page }) => {
    await navigateViaSidebar(page, 'Recibos')
    await expectHeading(page, 'Recibos Emitidos')
  })

  test('debería navegar por sidebar a Pagos', async ({ page }) => {
    await navigateViaSidebar(page, 'Pagos')
  })
})

test.describe('Admin - Clientes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/admin/customers')
    await expectHeading(page, 'Gestion de Clientes')
  })

  test('debería mostrar tabla de clientes', async ({ page }) => {
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByText('Suministro')).toBeVisible()
  })

  test('debería abrir diálogo de nuevo cliente', async ({ page }) => {
    await page.getByRole('button', { name: 'Nuevo Cliente' }).click()
    await expect(page.getByRole('dialog').getByText('Registrar Nuevo Cliente')).toBeVisible()
    await expect(page.getByLabel('N° de Suministro')).toBeVisible()
    await expect(page.getByLabel('Nombre Completo')).toBeVisible()
  })

  test('debería buscar clientes', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Buscar por nombre, suministro o DNI...')
    await searchInput.fill('100000001')
    await page.getByRole('button', { name: 'Buscar' }).click()
  })
})

test.describe('Admin - Periodos', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/admin/periods')
    await expectHeading(page, 'Periodos de Facturacion')
  })

  test('debería mostrar lista de periodos', async ({ page }) => {
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('debería mostrar botón para abrir próximo periodo', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Abrir Próximo Periodo' })).toBeVisible()
  })
})

test.describe('Admin - Recibos', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/admin/receipts')
    await expectHeading(page, 'Recibos Emitidos')
  })

  test('debería mostrar tabla de recibos con filtros', async ({ page }) => {
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByPlaceholder('Buscar...')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Filtrar' })).toBeVisible()
  })

  test('debería filtrar recibos por estado', async ({ page }) => {
    await page.getByRole('button', { name: 'Filtrar' }).click()
  })
})
