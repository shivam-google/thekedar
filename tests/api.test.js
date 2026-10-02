import test from 'node:test'
import assert from 'node:assert/strict'
import app from '../backend/src/app.js'
import { normalizeWorker } from '../backend/src/services/workerMarketplace.js'

test('worker projection exposes listing data and excludes private identity and wages', () => {
  const result = normalizeWorker({ id: 'listing', user_id: 'private-id', provider_id: 'private-provider', daily_wage: 100, display_name: 'Driver', profiles: { full_name: 'Private account name' }, latitude: 1, longitude: 2 })
  assert.equal(result.display_name, 'Driver')
  assert.equal(result.latitude, 1)
  for (const key of ['user_id', 'provider_id', 'daily_wage', 'profiles']) assert.equal(key in result, false)
})

test('API health, query validation, auth boundaries and CORS', async () => {
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    const health = await fetch(`${base}/api/health`)
    assert.equal(health.status, 200)
    assert.equal((await health.json()).success, true)
    assert.equal(health.headers.get('x-powered-by'), null)
    assert.equal((await fetch(`${base}/api/workers?sort=bad`)).status, 400)
    assert.equal((await fetch(`${base}/api/workers?city[]=Delhi`)).status, 400)
    assert.equal((await fetch(`${base}/api/workers/not-a-uuid`)).status, 404)
    assert.equal((await fetch(`${base}/api/profiles/me/image-url`)).status, 401)
    assert.equal((await fetch(`${base}/api/missing`)).status, 404)
    const allowed = await fetch(`${base}/api/health`, { headers: { Origin: 'http://localhost:5173' } })
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173')
    const denied = await fetch(`${base}/api/health`, { headers: { Origin: 'https://untrusted.example' } })
    assert.equal(denied.headers.get('access-control-allow-origin'), null)
  } finally { await new Promise((resolve) => server.close(resolve)) }
})
