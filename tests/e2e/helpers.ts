import { Page, expect } from '@playwright/test'

export const TEST_ADMIN = {
  email: 'admin@curimana.gob.pe',
  password: 'password',
}

export async function login(page: Page, email = TEST_ADMIN.email, password = TEST_ADMIN.password) {
  await page.goto('/login')
  await page.getByLabel('Email institucional').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click()
  await page.waitForURL(/\/(admin|cashier|reader)/, { timeout: 15000 })
}

export async function expectHeading(page: Page, text: string) {
  await expect(page.getByRole('heading', { name: text, exact: false }).first()).toBeVisible({ timeout: 10000 })
}

export async function navigateViaSidebar(page: Page, name: string) {
  await page.getByRole('link', { name, exact: true }).click()
}
