// Fetch every page before filtering or sorting; Supabase caps an individual response.
export async function queryAll(buildQuery) {
  const rows = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await buildQuery().range(offset, offset + 999)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < 1000) return rows
  }
}
