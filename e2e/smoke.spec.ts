import { test, expect } from '@playwright/test'

test('home page renders the hero, trust strip and footer', async ({ page }) => {
  await page.goto('./')
  await expect(page).toHaveTitle(/NineTees/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Britpop/i)
  await expect(page.getByText('Same-day despatch before 2pm')).toBeVisible()
  await expect(page.getByText('Fulfilment powered by')).toBeVisible()
})

test('desktop header shows the wordmark and nav, not the phone menu button', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('link', { name: 'NineTees home' }).getByRole('img')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Shop' }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden()
})

test('ticker is a styled marquee, not plain text', async ({ page }) => {
  await page.goto('./')
  const track = page.locator('.ticker__track')
  await expect(track).toHaveCSS('animation-name', 'ticker')
  await expect(page.locator('.ticker')).toHaveCSS('background-color', 'rgb(10, 10, 11)')
})

test('header wordmark is wide enough to read', async ({ page }) => {
  await page.goto('./')
  const box = await page.getByRole('link', { name: 'NineTees home' }).getByRole('img').boundingBox()
  expect(box?.width ?? 0).toBeGreaterThan(120)
})

test('skip link is the first thing the keyboard reaches', async ({ page }) => {
  await page.goto('./')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
})

test('product page: choose a size, add to bag, drawer opens and Escape closes it', async ({ page }) => {
  await page.goto('./products/camden-denim-jacket')
  await expect(page).toHaveTitle(/Camden Denim Jacket/)
  await expect(page.getByRole('button', { name: 'Select your size' })).toBeDisabled()
  await page.getByRole('button', { name: 'M', exact: true }).click()
  await page.getByRole('button', { name: /Add to bag/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Your bag' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Camden Denim Jacket')
  await expect(page.getByRole('button', { name: 'Close bag' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('.drawer')).not.toHaveClass(/open/)
  await expect(page.getByRole('button', { name: 'Open bag, 1 items' })).toBeVisible()
})

test('product page shows reviews and a despatch promise', async ({ page }) => {
  await page.goto('./products/camden-denim-jacket')
  await expect(page.getByRole('heading', { name: 'What people say' })).toBeVisible()
  await expect(page.getByText('Verified buyer').first()).toBeVisible()
  await expect(page.locator('.cutoff')).toContainText(/leaves our warehouse/)
})

test('collection filters live in the URL and survive a reload', async ({ page }) => {
  await page.goto('./collections/women')
  await page.getByLabel('Type').selectOption('Jeans')
  await expect(page).toHaveURL(/type=Jeans/)
  await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Type')).toHaveValue('Jeans')
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page).not.toHaveURL(/type=/)
})

test('help page anchors land on their section', async ({ page }) => {
  await page.goto('./help#sizing')
  await expect(page.locator('#sizing')).toBeInViewport()
})

test('unknown routes show the 404 page', async ({ page }) => {
  await page.goto('./this-never-existed')
  await expect(page.getByRole('heading', { name: 'Lost in the nineties' })).toBeVisible()
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('menu opens, navigates and closes', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Menu' }).click()
    const menu = page.locator('#site-menu')
    await expect(menu).toHaveClass(/open/)
    await menu.getByRole('link', { name: 'Women' }).click()
    await expect(page).toHaveURL(/collections\/women/)
    await expect(menu).not.toHaveClass(/open/)
  })
})
