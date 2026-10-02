export const normalizeLocation = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-IN')

export function coordinates(value) {
  if (value?.latitude == null || value?.longitude == null || value.latitude === '' || value.longitude === '') return null
  const latitude = Number(value.latitude)
  const longitude = Number(value.longitude)
  return Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude) && Math.abs(longitude) <= 180 ? { latitude, longitude } : null
}

export function coordinatePayload(value) {
  const point = coordinates(value)
  if (!point && (String(value?.latitude ?? '').trim() || String(value?.longitude ?? '').trim())) throw new Error('Enter both a valid latitude (-90 to 90) and longitude (-180 to 180).')
  return point || { latitude: null, longitude: null }
}

export function distanceKm(origin, destination) {
  const a = coordinates(origin), b = coordinates(destination)
  if (!a || !b) return null
  const radians = (degrees) => degrees * Math.PI / 180
  const deltaLatitude = radians(b.latitude - a.latitude)
  const deltaLongitude = radians(b.longitude - a.longitude)
  const haversine = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(deltaLongitude / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, haversine)))
}

export function locationMatches(item, filters) {
  const city = filters.city || (filters.location === 'all' ? '' : filters.location)
  const state = filters.state === 'all' ? '' : filters.state
  return (!city || normalizeLocation(item.city) === normalizeLocation(city)) && (!state || normalizeLocation(item.state) === normalizeLocation(state))
}

export function locationOptions(items, field, state = '') {
  const values = new Map()
  for (const item of items) {
    if (field === 'city' && state && state !== 'all' && normalizeLocation(item.state) !== normalizeLocation(state)) continue
    const value = String(item[field] || '').trim().replace(/\s+/g, ' ')
    if (value) values.set(normalizeLocation(value), value)
  }
  return [...values.values()].sort((a, b) => a.localeCompare(b))
}

export function sortNearby(items, origin) {
  const point = coordinates(origin)
  const relevance = (item) => normalizeLocation(origin?.city) && normalizeLocation(item.city) === normalizeLocation(origin.city) && (!origin?.state || normalizeLocation(item.state) === normalizeLocation(origin.state)) ? 0 : normalizeLocation(origin?.state) && normalizeLocation(item.state) === normalizeLocation(origin.state) ? 1 : 2
  return items.map((item) => ({ ...item, distance_km: point ? distanceKm(point, item) : null })).sort((a, b) => {
    if (point) {
      const distance = (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity)
      if (!Number.isNaN(distance) && distance !== 0) return distance
    }
    return relevance(a) - relevance(b) || new Date(b.created_at) - new Date(a.created_at)
  })
}

export function filterMarketplace(items, filters, origin = {}) {
  const search = normalizeLocation(filters.search)
  const filtered = items.filter((item) => {
    const text = [item.title, item.name, item.display_name, item.machine_type, item.skill, item.category, item.description, item.brand, item.model, item.city, item.state, item.capacity].filter(Boolean).join(' ')
    const category = item.machine_type || item.skill || item.category
    const selectedCategory = filters.type === 'all' ? '' : filters.type || filters.category || filters.skill
    const price = Number(item.price ?? item.daily_wage)
    return (!search || normalizeLocation(text).includes(search)) && locationMatches(item, filters) && (!selectedCategory || normalizeLocation(category) === normalizeLocation(selectedCategory)) && (!filters.availability || filters.availability === 'all' || normalizeLocation(item.availability_status) === normalizeLocation(filters.availability)) && (filters.minPrice === '' || filters.minPrice == null || price >= Number(filters.minPrice)) && (filters.maxPrice === '' || filters.maxPrice == null || price <= Number(filters.maxPrice))
  })
  if (filters.sort === 'nearby') return sortNearby(filtered, origin)
  return filtered.sort((a, b) => filters.sort === 'experience' ? Number(b.experience_years) - Number(a.experience_years) : ['price', 'price-low'].includes(filters.sort) ? Number(a.price ?? a.daily_wage) - Number(b.price ?? b.daily_wage) : filters.sort === 'price-high' ? Number(b.price ?? b.daily_wage) - Number(a.price ?? a.daily_wage) : new Date(b.created_at) - new Date(a.created_at))
}
