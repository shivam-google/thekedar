export function localToday() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function inclusiveDays(startDate, endDate) {
  const start = Date.parse(`${startDate}T00:00:00Z`), end = Date.parse(`${endDate}T00:00:00Z`)
  return Number.isFinite(start) && Number.isFinite(end) && end >= start ? Math.floor((end - start) / 86400000) + 1 : 0
}

export function estimateRental(price, quantity, unit, startDate, endDate) {
  const days = inclusiveDays(startDate, endDate)
  if (!days) return 0
  const multiplier = ['per day', 'day', 'daily'].includes(String(unit || '').trim().toLowerCase()) ? days : 1
  return Math.round(Number(price) * Number(quantity) * multiplier * 100) / 100
}
