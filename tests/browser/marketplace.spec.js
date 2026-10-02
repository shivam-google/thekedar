import { test, expect } from '@playwright/test'

const userId = '11111111-1111-4111-8111-111111111111'
const user = { id: userId, email: 'contractor@example.test', aud: 'authenticated', role: 'authenticated', user_metadata: {}, app_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
const session = { access_token: 'test-only-access-token', refresh_token: 'test-only-refresh-token', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user }
const profile = { ...user, full_name: 'Test Contractor', role: 'contractor', city: 'Delhi', state: 'Delhi' }
const fixtures = () => ({
  profiles: [profile],
  machines: [{ id: 'machine-1', owner_id: userId, title: 'Own excavator', machine_type: 'Excavator', price: 100, price_unit: 'per day', city: 'Delhi', state: 'Delhi', availability_status: 'AVAILABLE', status: 'ACTIVE', created_at: '2026-01-01', machine_images: [], description: 'Existing details', latitude: 28.61, longitude: 77.21 }, { id: 'machine-2', owner_id: 'other', title: 'Distant excavator', machine_type: 'Excavator', price: 200, price_unit: 'per day', city: 'Mumbai', state: 'Maharashtra', availability_status: 'AVAILABLE', status: 'ACTIVE', created_at: '2026-02-01', machine_images: [], latitude: 19.08, longitude: 72.88 }],
  worker_profiles: [{ id: 'worker-1', provider_id: userId, user_id: null, display_name: 'Managed Driver', skill: 'Driver', daily_wage: 800, experience_years: 7, description: 'Preserve experience and description', availability_status: 'available', city: 'Delhi', state: 'Delhi', latitude: 28.61, longitude: 77.21, created_at: '2026-01-01' }],
  tankers: [{ id: 'tanker-1', owner_id: userId, title: 'Own tanker', capacity: 10000, price: 100, price_unit: 'per day', city: 'Delhi', state: 'Delhi', description: null, location: null, contact_phone: null, availability_status: 'AVAILABLE', status: 'ACTIVE', latitude: 28.61, longitude: 77.21, created_at: '2026-01-01' }],
  materials: [{ id: 'material-1', supplier_id: userId, name: 'Cement stock', category: 'Cement', price: 400, unit: 'per bag', quantity_available: 30, city: 'Delhi', state: 'Delhi', description: null, image_url: null, availability_status: 'AVAILABLE', latitude: 28.61, longitude: 77.21, created_at: '2026-01-01' }],
  favorites: [], project_carts: [], notifications: [], bookings: [],
})

async function setup(page, { loggedIn = true, role = 'contractor' } = {}) {
  const rows = fixtures()
  rows.profiles[0] = { ...profile, role }
  const writes = []
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  if (loggedIn) await page.addInitScript((data) => localStorage.setItem('sb-test-project-auth-token', JSON.stringify(data)), session)
  await page.route('**/auth/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/user')) return route.fulfill({ json: user })
    if (path.endsWith('/token')) return route.fulfill({ json: session })
    return route.fulfill({ json: {} })
  })
  await page.route('**/rest/v1/**', async (route) => {
    const request = route.request(), url = new URL(request.url()), table = url.pathname.split('/').at(-1)
    const isSingle = request.headers().accept?.includes('vnd.pgrst.object')
    let data = [...(rows[table] || [])]
    for (const [column, value] of url.searchParams) {
      if (value.startsWith('eq.')) data = data.filter((row) => String(row[column]) === value.slice(3))
      if (value.startsWith('neq.')) data = data.filter((row) => String(row[column]) !== value.slice(4))
    }
    if (['POST', 'PATCH', 'DELETE'].includes(request.method())) {
      const payload = request.postDataJSON()
      writes.push({ table, method: request.method(), payload })
      if (request.method() === 'POST') {
        const inserted = { id: `${table}-new`, ...payload }
        rows[table] = [...(rows[table] || []), inserted]
        data = [inserted]
      } else if (request.method() === 'PATCH') {
        const ids = new Set(data.map((row) => row.id))
        rows[table] = rows[table].map((row) => ids.has(row.id) ? { ...row, ...payload } : row)
        data = data.map((row) => ({ ...row, ...payload }))
      } else { rows[table] = rows[table].filter((row) => !data.some((deleted) => row.id === deleted.id)) }
    }
    return route.fulfill({ json: isSingle ? data[0] || null : data, headers: { 'content-range': `0-${Math.max(0, data.length - 1)}/${data.length}` } })
  })
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/workers') return route.fulfill({ json: { workers: rows.worker_profiles } })
    if (path.startsWith('/api/workers/')) return route.fulfill({ json: { worker: rows.worker_profiles[0] } })
    return route.fulfill({ json: { reviews: [], success: true, notifications: [] } })
  })
  return { rows, writes, errors }
}

test('contractor dashboard shows all assets; worker editing preserves saved fields', async ({ page }) => {
  const { writes, errors } = await setup(page)
  await page.goto('/services')
  await expect(page.getByText('Own excavator', { exact: true })).toBeVisible()
  await expect(page.getByText('Managed Driver', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.getByLabel('Experience years')).toHaveValue('7')
  await expect(page.getByRole('textbox', { name: 'Description', exact: true })).toHaveValue('Preserve experience and description')
  await page.getByLabel('Worker name').fill('Updated Driver')
  await page.getByRole('button', { name: 'Save worker', exact: true }).click()
  await expect(page.getByText('Updated Driver', { exact: true })).toBeVisible()
  expect(writes.find((write) => write.table === 'worker_profiles').payload.experience_years).toBe(7)
  expect(errors).toEqual([])
})

test('contractor edits a machine through the owner-scoped form', async ({ page }) => {
  const { writes, errors } = await setup(page)
  await page.goto('/machines/machine-1/edit')
  await expect(page.getByLabel('Machine name')).toHaveValue('Own excavator')
  await page.getByLabel('Machine name').fill('Edited excavator')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Machine listed successfully.')).toBeVisible()
  expect(writes.find((write) => write.table === 'machines').method).toBe('PATCH')
  expect(writes.find((write) => write.table === 'machines').payload.latitude).toBe(28.61)
  expect(errors).toEqual([])
})

for (const [path, name, success] of [['tankers', 'tanker', 'Tanker profile saved.'], ['materials', 'material', 'Material listing saved.']]) {
  test(`${name}: nullable fields can be edited and repeated saves update the new listing`, async ({ page }) => {
    const { writes, errors } = await setup(page)
    await page.goto(`/${path}/profile?id=${name}-1`)
    await page.getByRole('button', { name: `Save ${name}`, exact: true }).click()
    await expect(page.getByText(success)).toBeVisible()
    expect(writes.find((write) => write.table === path).method).toBe('PATCH')
    expect(errors).toEqual([])
  })
}

test('creating a tanker twice on one form inserts only once', async ({ page }) => {
  const { writes } = await setup(page)
  await page.goto('/tankers/profile?new=1')
  await page.getByLabel('Tanker name').fill('New tanker')
  await page.getByLabel('Capacity').fill('5000')
  await page.getByLabel('Rental price').fill('100')
  await page.getByRole('textbox', { name: 'City *', exact: true }).fill('Delhi')
  await page.getByRole('textbox', { name: 'State *', exact: true }).fill('Delhi')
  await page.getByRole('button', { name: 'Save tanker', exact: true }).click()
  await expect(page.getByText('Tanker profile saved.')).toBeVisible()
  await page.getByRole('button', { name: 'Save tanker', exact: true }).click()
  await expect.poll(() => writes.filter((write) => write.table === 'tankers').length).toBe(2)
  expect(writes.filter((write) => write.table === 'tankers').map((write) => write.method)).toEqual(['POST', 'PATCH'])
})

test('self-employed worker profile renders without an undefined-variable crash', async ({ page }) => {
  const { errors } = await setup(page, { role: 'worker' })
  await page.goto('/workers/profile')
  await expect(page.getByRole('button', { name: 'Save profile', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

for (const [path, sort] of [['machines', 'Sort machines'], ['workers', 'Sort workers'], ['tankers', 'Sort tankers'], ['materials', 'Sort materials']]) {
  test(`${path}: Nearby uses device distance and city/state filters keep choices stable`, async ({ page, context }) => {
    const { errors } = await setup(page)
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation({ latitude: 28.61, longitude: 77.21 })
    await page.goto(`/${path}`)
    await page.getByLabel(sort).selectOption('nearby')
    await page.getByRole('button', { name: 'Use my location' }).click()
    await expect(page.getByText('< 1 km away').first()).toBeVisible()
    await page.getByLabel('State', { exact: true }).selectOption('Delhi')
    await page.getByLabel('City', { exact: true }).selectOption('Delhi')
    await expect(page.getByLabel('State', { exact: true })).toHaveValue('Delhi')
    if (path === 'machines') {
      await expect(page.locator('.machine-card').first()).toContainText('Own excavator')
      await page.getByLabel('State', { exact: true }).selectOption('Maharashtra')
      await expect(page.getByLabel('City', { exact: true })).toHaveValue('all')
      await expect(page.locator('.machine-card')).toHaveCount(1)
    }
    expect(errors).toEqual([])
  })
}

test('forgot password sends recovery request with the correct redirect', async ({ page }) => {
  await setup(page, { loggedIn: false })
  let recovery
  await page.route('**/auth/v1/recover**', async (route) => { recovery = route.request(); await route.fulfill({ json: {} }) })
  await page.goto('/forgot-password')
  await page.getByLabel('Email', { exact: true }).fill('customer@example.test')
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByText('Check your inbox for the password reset link.')).toBeVisible()
  expect(new URL(recovery.url()).searchParams.get('redirect_to')).toBe(`${new URL(page.url()).origin}/reset-password`)
})

test('reset password ends recovery session and allows login with the new password', async ({ page }) => {
  const { errors } = await setup(page)
  let updated, login
  await page.route('**/auth/v1/user', async (route) => {
    if (route.request().method() === 'PUT') updated = route.request().postDataJSON().password
    await route.fulfill({ json: user })
  })
  await page.route('**/auth/v1/token**', async (route) => { login = route.request().postDataJSON(); await route.fulfill({ json: session }) })
  await page.goto('/reset-password')
  await page.getByLabel('New password', { exact: true }).fill('new-password-123')
  await page.getByLabel('Confirm new password').fill('new-password-123')
  await page.getByRole('button', { name: 'Update password' }).click()
  await expect(page.getByText('Password updated. Log in with your new password.')).toBeVisible()
  expect(updated).toBe('new-password-123')
  await page.getByRole('link', { name: 'Log in', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible()
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('new-password-123')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page).toHaveURL(/dashboard/)
  expect(login.password).toBe(updated)
  expect(errors).toEqual([])
})

test('expired reset link reports an error and hides the update form', async ({ page }) => {
  await setup(page, { loggedIn: false })
  await page.goto('/reset-password#error=access_denied&error_description=Link+expired')
  await expect(page.getByText('This reset link is invalid or expired. Request a new one.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Update password' })).toHaveCount(0)
})

test('provider dashboard works at mobile width', async ({ page }) => {
  const { errors } = await setup(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/services')
  await expect(page.getByText('Managed Driver', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/provider-mobile.png', fullPage: true })
  expect(errors).toEqual([])
})

test('guest marketplaces load workers and machine images without a login token', async ({ page }) => {
  const { errors } = await setup(page, { loggedIn: false })
  await page.goto('/workers')
  await expect(page.getByText('Managed Driver', { exact: true })).toBeVisible()
  let imageRequest
  await page.route('**/rest/v1/machines**', async (route) => route.fulfill({ json: [{ ...fixtures().machines[0], machine_images: [{ id: 'photo-1' }] }] }))
  await page.route('**/api/machines/**', async (route) => {
    imageRequest = route.request()
    await route.fulfill({ json: { image: { signedUrl: 'https://images.example.test/photo.svg' } } })
  })
  await page.route('https://images.example.test/photo.svg', async (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect width="200" height="120" fill="orange"/></svg>' }))
  await page.goto('/machines')
  const image = page.getByRole('img', { name: 'Own excavator' })
  await expect(image).toBeVisible()
  await expect.poll(() => image.evaluate((element) => element.naturalWidth)).toBe(200)
  expect(imageRequest.headers().authorization).toBeUndefined()
  expect(errors).toEqual([])
})

test('machine upload rejects more than five images before creating a listing', async ({ page }) => {
  const { writes } = await setup(page)
  await page.goto('/machines/new')
  await page.locator('input[type="file"]').setInputFiles(Array.from({ length: 6 }, (_, index) => ({ name: `photo-${index}.png`, mimeType: 'image/png', buffer: Buffer.from('test-image') })))
  await expect(page.getByText('A machine can have up to five images.')).toBeVisible()
  expect(writes).toHaveLength(0)
})

test('materials uses styled responsive controls and cards', async ({ page }) => {
  const { errors } = await setup(page, { loggedIn: false })
  await page.goto('/materials')
  await expect(page.getByRole('heading', { name: 'Cement stock' })).toBeVisible()
  expect(await page.locator('.material-heading h1').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThan(40)
  expect(await page.locator('.material-grid').evaluate((el) => getComputedStyle(el).display)).toBe('grid')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByLabel('Sort materials')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.locator('.material-card').getByRole('link', { name: 'View details' }).click()
  await expect(page.getByRole('button', { name: 'Request material' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(errors).toEqual([])
})
