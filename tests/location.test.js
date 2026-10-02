import test from 'node:test'
import assert from 'node:assert/strict'
import { coordinates, coordinatePayload, distanceKm, sortNearby, filterMarketplace, locationOptions } from '../frontend/src/utils/location.js'

test('coordinate validation treats 0 as valid and blanks as unknown', () => {
  assert.deepEqual(coordinates({ latitude: 0, longitude: 0 }), { latitude: 0, longitude: 0 })
  assert.equal(coordinates({ latitude: null, longitude: 0 }), null)
  assert.equal(coordinates({ latitude: 91, longitude: 181 }), null)
  assert.throws(() => coordinatePayload({ latitude: 1, longitude: '' }), /both/)
  assert.deepEqual(coordinatePayload({ latitude: '', longitude: '' }), { latitude: null, longitude: null })
})

test('Haversine sorts by real distance, with unknown coordinates last', () => {
  assert.ok(Math.abs(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }) - 111.195) < 0.01)
  const items = [{ id: 'unknown', city: 'Mumbai', state: 'Maharashtra' }, { id: 'far', latitude: 1, longitude: 0 }, { id: 'near', latitude: 0.1, longitude: 0 }]
  assert.deepEqual(sortNearby(items, { latitude: 0, longitude: 0, city: 'Mumbai' }).map((item) => item.id), ['near', 'far', 'unknown'])
  assert.equal('distance_km' in items[0], false)
})

test('fallback never confuses identically named cities in different states', () => {
  const items = [{ id: 'wrong-state', city: 'Rampur', state: 'Himachal Pradesh' }, { id: 'same-state', city: 'Lucknow', state: 'Uttar Pradesh' }, { id: 'same-city', city: ' rampur ', state: 'Uttar Pradesh' }]
  assert.deepEqual(sortNearby(items, { city: 'Rampur', state: 'Uttar Pradesh' }).map((item) => item.id), ['same-city', 'same-state', 'wrong-state'])
})

for (const [type, title] of [['machine', { title: 'Excavator', machine_type: 'JCB' }], ['worker', { display_name: 'Driver', skill: 'Operator' }], ['tanker', { title: 'Water tanker' }], ['material', { name: 'Cement', category: 'Cement' }]]) {
  test(`${type}: city/state filters normalize casing and spaces; zero max price works`, () => {
    const items = [{ id: 1, ...title, city: ' New  Delhi ', state: ' DELHI ', price: 0, availability_status: 'AVAILABLE' }, { id: 2, ...title, city: 'New Delhi', state: 'Other', price: 20 }]
    assert.deepEqual(filterMarketplace(items, { city: 'new delhi', state: 'delhi', availability: 'available', maxPrice: '0' }).map((item) => item.id), [1])
    assert.deepEqual(locationOptions(items, 'city', 'delhi'), ['New Delhi'])
    assert.equal(filterMarketplace(items, { search: 'no match' }).length, 0)
  })
}
