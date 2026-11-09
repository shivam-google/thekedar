import { test, expect } from '@playwright/test'

test('PWA manifest and static icon assets are available with brand metadata', async ({ page }) => {
  await page.goto('/')

  const manifest = await page.evaluate(async () => {
    const response = await fetch('/manifest.webmanifest')
    return response.json()
  })
  expect(manifest.name).toBe('TheKedar')
  expect(manifest.short_name).toBe('TheKedar')
  expect(manifest.description).toBe('Find construction machines, workers, water tankers and materials near you.')
  expect(manifest.display).toBe('standalone')
  expect(manifest.orientation).toBe('portrait')
  expect(manifest.theme_color).toBe('#e86f32')
  expect(manifest.background_color).toBe('#f3f0e9')
  expect(manifest.shortcuts.map((shortcut) => shortcut.url)).toEqual(['/machines', '/workers', '/materials'])

  const iconSizes = await page.evaluate(async (icons) => Promise.all(icons.map(async ({ src, size }) => {
    const response = await fetch(src)
    const bytes = new Uint8Array(await response.arrayBuffer())
    return {
      status: response.status,
      width: (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19],
      height: (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23],
      expected: size,
    }
  })), [
    { src: '/icons/thekedar-192.png', size: 192 },
    { src: '/icons/thekedar-512.png', size: 512 },
    { src: '/icons/apple-touch-icon.png', size: 180 },
  ])
  for (const icon of iconSizes) {
    expect(icon.status).toBe(200)
    expect(icon.width).toBe(icon.expected)
    expect(icon.height).toBe(icon.expected)
  }
})

test('install control follows the browser prompt and hides after installation', async ({ page }) => {
  await page.goto('/')
  const installButton = page.getByRole('button', { name: 'Install TheKedar' })
  await expect(installButton).toHaveCount(0)

  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true })
    event.prompt = async () => {}
    event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' })
    window.dispatchEvent(event)
  })
  await expect(installButton).toBeVisible()
  await installButton.click()
  await expect(installButton).toHaveCount(0)
})

test('mobile navigation and marketplace pages do not overflow at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  for (const path of ['/', '/login', '/signup', '/machines', '/workers', '/tankers', '/materials']) {
    await page.goto(path)
    await page.locator('main').first().waitFor()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `${path} should fit within a 320px viewport`,
    ).toBe(true)
  }
})
