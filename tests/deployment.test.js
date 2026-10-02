import test from 'node:test'
import assert from 'node:assert/strict'
import { validateProductionEnvironment, validateProductionDatabase } from '../scripts/check-production-env.js'
const token = (role, ref = 'production') => `test.${Buffer.from(JSON.stringify({ role, ref })).toString('base64url')}.test`
const configuration = () => ({ VITE_SUPABASE_URL: 'https://production.supabase.co', SUPABASE_URL: 'https://production.supabase.co', VITE_SUPABASE_ANON_KEY: token('anon'), SUPABASE_ANON_KEY: token('anon'), SUPABASE_SERVICE_ROLE_KEY: token('service_role') })
test('production configuration accepts anon JWT and newer publishable keys', () => {
  assert.doesNotThrow(() => validateProductionEnvironment(configuration()))
  const secretKey = ['sb', 'secret', 'test-only-key'].join('_')
  assert.doesNotThrow(() => validateProductionEnvironment({ ...configuration(), VITE_SUPABASE_ANON_KEY: 'sb_publishable_test-only-key', SUPABASE_ANON_KEY: 'sb_publishable_test-only-key', SUPABASE_SERVICE_ROLE_KEY: secretKey }))
})
test('deployment verifies all listing schemas without fetching records or exposing secrets', async () => {
  const queries = []
  await validateProductionDatabase(configuration(), async (url, options) => {
    queries.push(url)
    assert.equal(new URL(url).searchParams.get('limit'), '0')
    assert.equal(options.headers.apikey, configuration().VITE_SUPABASE_ANON_KEY)
    assert.equal(options.headers.Authorization, undefined)
    return new Response('[]', { status: 200 })
  })
  assert.equal(queries.length, 4)
  assert.match(queries[1], /worker_profiles/)
  assert.match(decodeURIComponent(queries[1]), /provider_id/)
})
test('deployment explains missing migrations and unreachable projects before publishing', async () => {
  await assert.rejects(validateProductionDatabase(configuration(), async () => new Response('', { status: 400 })), /migration.sql before deploying/)
  await assert.rejects(validateProductionDatabase(configuration(), async () => { throw new Error('network failure') }), /Cannot connect to Supabase/)
})
test('production catches missing settings, mismatched projects and exposed service secrets', () => {
  assert.throws(() => validateProductionEnvironment({}), /Vercel environment variables/)
  assert.throws(() => validateProductionEnvironment({ ...configuration(), SUPABASE_URL: 'https://other.supabase.co' }), /same Supabase project/)
  assert.throws(() => validateProductionEnvironment({ ...configuration(), VITE_SUPABASE_ANON_KEY: token('service_role') }), /never a service-role/)
  assert.throws(() => validateProductionEnvironment({ ...configuration(), VITE_SUPABASE_ANON_KEY: token('anon', 'other') }), /different Supabase project/)
  assert.throws(() => validateProductionEnvironment({ ...configuration(), SUPABASE_SERVICE_ROLE_KEY: token('anon') }), /backend service-role/)
  assert.throws(() => validateProductionEnvironment({ ...configuration(), VITE_API_URL: 'http://localhost:5000' }), /public HTTPS URL/)
})
