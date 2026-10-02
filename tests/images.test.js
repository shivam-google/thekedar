import test from 'node:test'
import assert from 'node:assert/strict'
import { createMachineImageSignedUrl } from '../backend/src/services/machineImages.js'

function clientFor({ status = 'ACTIVE', availability = 'AVAILABLE', path = 'machine/photo.webp', role = 'customer' } = {}) {
  const signedPaths = []
  return {
    signedPaths,
    from(table) {
      const result = { machines: { id: 'machine', owner_id: 'owner', status, availability_status: availability }, machine_images: { id: 'image', machine_id: 'machine', storage_path: path }, profiles: { role } }[table]
      return { select() { return this }, eq() { return this }, async maybeSingle() { return { data: result } } }
    },
    storage: { from() { return { async createSignedUrl(path, lifetime) { signedPaths.push({ path, lifetime }); return { data: { signedUrl: 'https://storage.example.test/signed-photo' } } } } } },
  }
}

test('guests can view images belonging to public listings', async () => {
  const client = clientFor()
  const result = await createMachineImageSignedUrl({ machineId: 'machine', imageId: 'image', client })
  assert.equal(result.kind, 'success')
  assert.deepEqual(client.signedPaths, [{ path: 'machine/photo.webp', lifetime: 300 }])
})

test('hidden listing images are denied to guests and unrelated users', async () => {
  for (const userId of [undefined, 'other']) {
    const client = clientFor({ status: 'PENDING' })
    assert.equal((await createMachineImageSignedUrl({ machineId: 'machine', imageId: 'image', userId, client })).kind, 'forbidden')
    assert.equal(client.signedPaths.length, 0)
  }
})

test('owners and administrators can view pending listing images', async () => {
  for (const [userId, role] of [['owner', 'customer'], ['administrator', 'admin']]) {
    const client = clientFor({ status: 'PENDING', role })
    assert.equal((await createMachineImageSignedUrl({ machineId: 'machine', imageId: 'image', userId, client })).kind, 'success')
  }
})

test('paused listing images and cross-listing storage paths are not public', async () => {
  for (const options of [{ availability: 'UNAVAILABLE' }, { path: 'other-machine/photo.webp' }, { path: null }]) {
    const client = clientFor(options)
    assert.equal((await createMachineImageSignedUrl({ machineId: 'machine', imageId: 'image', client })).kind, 'forbidden')
    assert.equal(client.signedPaths.length, 0)
  }
})
