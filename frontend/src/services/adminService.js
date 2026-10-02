import { supabase } from './supabaseClient'

const rowLimit = 200

async function requireAdmin() {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) throw new Error('Authentication required.')
  const { data: profile, error } = await supabase.from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle()
  if (error) throw new Error('Unable to verify administrator access.')
  if (profile?.role !== 'admin') throw new Error('Administrator access required.')
}

async function countRows(table, filter) {
  let query = supabase.from(table).select('id', { count: 'exact', head: true })
  if (filter) query = filter(query)
  const { count, error } = await query
  if (error) throw error
  return count || 0
}

async function loadRows(table, fields, orderBy = 'created_at') {
  const { data, error } = await supabase.from(table)
    .select(fields)
    .order(orderBy, { ascending: false })
    .limit(rowLimit)
  if (error) throw error
  return data || []
}

export async function getAdminDashboardData() {
  await requireAdmin()

  const [counts, users, workers, machines, tankers, materials, bookings, reviews] = await Promise.all([
    Promise.all([
      countRows('profiles'),
      countRows('worker_profiles'),
      countRows('machines'),
      countRows('tankers'),
      countRows('materials'),
      countRows('bookings'),
      countRows('bookings', (query) => query.eq('status', 'COMPLETED')),
      countRows('bookings', (query) => query.eq('status', 'REQUESTED')),
      countRows('reviews'),
    ]),
    loadRows('profiles', 'id, full_name, email, role, is_verified, created_at'),
    loadRows('worker_profiles', 'id, skill, experience_years, daily_wage, availability_status, city, state, created_at'),
    loadRows('machines', 'id, title, machine_type, price, price_unit, availability_status, status, city, state, created_at'),
    loadRows('tankers', 'id, title, capacity, price, price_unit, availability_status, status, city, state, created_at'),
    loadRows('materials', 'id, name, category, price, unit, quantity_available, availability_status, city, state, created_at'),
    loadRows('bookings', 'id, item_type, status, start_date, end_date, total_price, created_at'),
    loadRows('reviews', 'id, rating, comment, created_at'),
  ])

  return {
    counts: {
      users: counts[0], workers: counts[1], machines: counts[2], tankers: counts[3], materials: counts[4],
      bookings: counts[5], completedBookings: counts[6], requestedBookings: counts[7], reviews: counts[8],
    },
    users, workers, machines, tankers, materials, bookings, reviews,
  }
}