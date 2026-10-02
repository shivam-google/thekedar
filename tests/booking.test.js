import test from 'node:test'
import assert from 'node:assert/strict'
import { inclusiveDays, estimateRental } from '../frontend/src/utils/booking.js'

test('daily estimates include both dates and match database totals', () => {
  assert.equal(inclusiveDays('2026-10-02', '2026-10-04'), 3)
  assert.equal(estimateRental(100, 2, ' Per Day ', '2026-10-02', '2026-10-04'), 600)
  assert.equal(estimateRental(100, 2, 'per trip', '2026-10-02', '2026-10-04'), 200)
  assert.equal(estimateRental(100, 2, 'per day', '2026-10-04', '2026-10-02'), 0)
  assert.equal(inclusiveDays('2026-03-07', '2026-03-09'), 3)
})
