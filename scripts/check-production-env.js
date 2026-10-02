import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
const jwt = (value) => {
  try { return JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString()) } catch { return null }
}
function httpsUrl(value, name) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error()
    return url
  } catch { throw new Error(`${name} must be a public HTTPS URL without embedded credentials, query parameters, or fragments.`) }
}
export function validateProductionEnvironment(env) {
  const missing = required.filter((key) => !env[key]?.trim())
  if (missing.length) throw new Error(`Add these Vercel environment variables before deploying: ${missing.join(', ')}. See docs/DEPLOYMENT.md.`)
  const frontend = httpsUrl(env.VITE_SUPABASE_URL.trim(), 'VITE_SUPABASE_URL')
  const backend = httpsUrl(env.SUPABASE_URL.trim(), 'SUPABASE_URL')
  if (frontend.href.replace(/\/$/, '') !== backend.href.replace(/\/$/, '')) throw new Error('VITE_SUPABASE_URL and SUPABASE_URL must point to the same Supabase project.')
  for (const name of ['VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY']) {
    const value = env[name].trim(), payload = jwt(value)
    if (value.startsWith('sb_secret_') || payload?.role === 'service_role') throw new Error(`${name} must contain a public anon/publishable key, never a service-role secret.`)
    if (!value.startsWith('sb_publishable_') && payload?.role !== 'anon') throw new Error(`${name} is not a Supabase anon/publishable key.`)
    if (payload?.ref && frontend.hostname.endsWith('.supabase.co') && payload.ref !== frontend.hostname.split('.')[0]) throw new Error(`${name} belongs to a different Supabase project.`)
  }
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY.trim(), servicePayload = jwt(serviceKey)
  if (!serviceKey.startsWith('sb_secret_') && servicePayload?.role !== 'service_role') throw new Error('SUPABASE_SERVICE_ROLE_KEY must be a backend service-role/secret key.')
  if (servicePayload?.ref && backend.hostname.endsWith('.supabase.co') && servicePayload.ref !== backend.hostname.split('.')[0]) throw new Error('SUPABASE_SERVICE_ROLE_KEY belongs to a different Supabase project.')
  if (env.VITE_API_URL?.trim()) httpsUrl(env.VITE_API_URL.trim(), 'VITE_API_URL')
}
export async function validateProductionDatabase(env, request = fetch) {
  const url = env.VITE_SUPABASE_URL.trim().replace(/\/$/, '')
  const fields = {
    machines: 'id,latitude,longitude,status',
    worker_profiles: 'id,provider_id,display_name,latitude,longitude',
    tankers: 'id,latitude,longitude,status',
    materials: 'id,latitude,longitude',
  }
  for (const [table, projection] of Object.entries(fields)) {
    let response
    try {
      response = await request(`${url}/rest/v1/${table}?select=${encodeURIComponent(projection)}&limit=0`, {
        headers: { apikey: env.VITE_SUPABASE_ANON_KEY.trim() }, signal: AbortSignal.timeout(15000),
      })
    } catch { throw new Error(`Cannot connect to Supabase to verify ${table}. Check the production project URL and project availability.`) }
    if (!response.ok) throw new Error(`Supabase ${table} readiness check returned HTTP ${response.status}. Verify the public key and apply backend/supabase/multi_service_provider_migration.sql before deploying. See docs/DEPLOYMENT.md.`)
    await response.arrayBuffer()
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { validateProductionEnvironment(process.env); await validateProductionDatabase(process.env); console.log('Production environment and Supabase schema checked.') }
  catch (error) { console.error(error.message); process.exitCode = 1 }
}
