import { test, expect } from '@playwright/test'

const siteOrigin = 'https://thekedar-51s.pages.dev'

const publicPages = [
  ['/', 'TheKedar | Construction Equipment, Workers & Materials Marketplace'],
  ['/machines', 'Construction Equipment for Hire | TheKedar'],
  ['/workers', 'Construction Workers & Skilled Labour | TheKedar'],
  ['/tankers', 'Water Tankers for Construction | TheKedar'],
  ['/materials', 'Construction Materials Marketplace | TheKedar'],
  ['/about', 'About TheKedar | Construction, Connected'],
  ['/contact', 'Contact TheKedar'],
  ['/help', 'TheKedar Help & Support'],
  ['/terms', 'TheKedar Terms of Use'],
  ['/privacy', 'TheKedar Privacy Policy'],
]

test('public pages have unique metadata, canonical links, and structured data', async ({ page }) => {
  for (const [path, title] of publicPages) {
    await page.goto(path)
    await expect(page).toHaveTitle(title)
    await expect(page.locator('meta[name="description"]')).not.toHaveAttribute('content', '')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${siteOrigin}${path === '/' ? '/' : path}`,
    )
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', title)
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary')

    const graph = await page.locator('#thekedar-structured-data').evaluate((node) => JSON.parse(node.textContent))
    expect(graph['@graph'].map((entry) => entry['@type'])).toEqual(['Organization', 'WebSite', 'WebPage'])
    expect(graph['@graph'].some((entry) => 'address' in entry || 'aggregateRating' in entry || 'review' in entry)).toBe(false)
  }
})

test('account, private, listing-detail, and unknown routes are not indexable', async ({ page }) => {
  for (const path of [
    '/login', '/signup', '/forgot-password', '/reset-password',
    '/dashboard', '/services', '/admin', '/machines/new', '/machines/example/edit',
    '/workers/profile', '/workers/example', '/tankers/profile', '/materials/profile',
    '/projects', '/bookings', '/bookings/requests', '/bookings/example',
    '/favorites', '/notifications', '/profile', '/not-a-route',
  ]) {
    await page.goto(path)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
    await expect(page.locator('#thekedar-structured-data')).toHaveCount(0)
  }
})

test('robots and sitemap are available and the sitemap lists only public pages', async ({ page }) => {
  await page.goto('/')
  const [robots, sitemap] = await page.evaluate(async () => Promise.all([
    fetch('/robots.txt').then((response) => response.text()),
    fetch('/sitemap.xml').then((response) => response.text()),
  ]))

  expect(robots).toContain('Allow: /')
  expect(robots).toContain('Disallow: /bookings')
  expect(robots).toContain(`Sitemap: ${siteOrigin}/sitemap.xml`)

  const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])
  expect(sitemapUrls).toEqual(publicPages.map(([path]) => `${siteOrigin}${path === '/' ? '/' : path}`))
  expect(sitemap).not.toMatch(/\/(login|signup|dashboard|profile|bookings|admin)(\/|<)/)
  expect(sitemap).not.toContain('78f9c9f7.thekedar-51s.pages.dev')
})
