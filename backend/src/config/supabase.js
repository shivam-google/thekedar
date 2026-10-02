import { createClient } from '@supabase/supabase-js'

function getRequiredEnv(name) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function validateSupabaseConfig({ requireServiceRole = false } = {}) {
  const config = {
    url: getRequiredEnv('SUPABASE_URL'),
    anonKey: getRequiredEnv('SUPABASE_ANON_KEY'),
  }

  if (requireServiceRole) {
    config.serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
  }

  return config
}

export function getSupabaseClient() {
  const { url, anonKey } = validateSupabaseConfig()

  return createClient(
    url,
    anonKey,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  )
}

export function getSupabaseAdminClient() {
  const { url, serviceRoleKey } = validateSupabaseConfig({ requireServiceRole: true })

  return createClient(
    url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  )
}