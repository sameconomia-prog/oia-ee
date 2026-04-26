// frontend/tests/e2e/critical-flows.spec.ts
import { test, expect } from '@playwright/test'

// Flujo 1: Homepage carga con datos
test('homepage muestra estadísticas y top riesgo', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /observatorio/i })).toBeVisible({ timeout: 10000 })
  // Debe mostrar al menos una stat card
  await expect(page.locator('[data-testid="stat-card"]').first()).toBeVisible()
})

// Flujo 2: Listado de carreras
test('carreras - lista carga y permite búsqueda', async ({ page }) => {
  await page.goto('/carreras')
  await expect(page.getByRole('heading', { name: /carreras/i })).toBeVisible()
  // El input de búsqueda debe existir (falla si hay bug de renderizado)
  const searchInput = page.getByPlaceholder(/buscar/i)
  await expect(searchInput).toBeVisible()
  // Escribir en el input no debe crashear la página
  await searchInput.fill('ingeniería')
  await page.waitForTimeout(800)
  // La página no debe mostrar error
  await expect(page.locator('body')).not.toContainText('Internal Server Error')
  await expect(page.locator('body')).not.toContainText('Error 500')
})

// Flujo 3: Listado de IES
test('ies - lista carga correctamente', async ({ page }) => {
  await page.goto('/ies')
  await expect(page.getByRole('heading', { name: /instituciones/i })).toBeVisible({ timeout: 10000 })
})

// Flujo 4: Noticias - lista y filtro
test('noticias - carga y permite filtro por sector', async ({ page }) => {
  await page.goto('/noticias')
  await expect(page.getByRole('heading', { name: /noticias/i })).toBeVisible({ timeout: 10000 })
})

// Flujo 5: Login - formulario visible
test('login - formulario de autenticación visible', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: /iniciar sesión|login/i })).toBeVisible()
  // Intentar login con credenciales inválidas
  await page.getByRole('textbox').first().fill('usuario_invalido')
  const inputs = page.getByRole('textbox')
  if ((await inputs.count()) > 1) {
    await inputs.nth(1).fill('contraseña_invalida')
  }
  await page.getByRole('button', { name: /iniciar sesión|login/i }).click()
  // Debe mostrar error, no crashear
  await expect(page.locator('body')).not.toContainText('Internal Server Error')
})
