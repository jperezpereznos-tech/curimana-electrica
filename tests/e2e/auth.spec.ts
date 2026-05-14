import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Autenticación', () => {
  test('debería mostrar formulario de login', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Curimana Eléctrica' })).toBeVisible()
    await expect(page.getByLabel('Email institucional')).toBeVisible()
    await expect(page.getByLabel('Contraseña')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Iniciar Sesión' })).toBeVisible()
  })

  test('debería mostrar error con credenciales inválidas', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email institucional').fill('wrong@curimana.gob.pe')
    await page.getByLabel('Contraseña').fill('wrongpass')
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click()
    await expect(page.getByText('Credenciales inválidas')).toBeVisible({ timeout: 10000 })
  })

  test('debería redirigir al dashboard admin tras login exitoso', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/\/admin/)
    await expect(page.getByRole('heading', { name: 'Panel Administrativo' })).toBeVisible({ timeout: 10000 })
  })

  test('debería validar campos vacíos', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click()
    await expect(page.getByText('Email inválido')).toBeVisible()
  })

  test('debería validar contraseña corta', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email institucional').fill('admin@curimana.gob.pe')
    await page.getByLabel('Contraseña').fill('12345')
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click()
    await expect(page.getByText('La contraseña debe tener al menos 6 caracteres')).toBeVisible()
  })
})
