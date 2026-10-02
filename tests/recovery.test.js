import test from 'node:test'
import assert from 'node:assert/strict'
import { finishPasswordRecovery, validateNewPassword } from '../frontend/src/services/passwordRecovery.js'

test('rejects short passwords and confirmation mismatch', () => {
  assert.throws(() => validateNewPassword('short', 'short'), /8 characters/)
  assert.throws(() => validateNewPassword('long-enough', 'different'), /match/)
  assert.doesNotThrow(() => validateNewPassword('long-enough', 'long-enough'))
})

test('successful recovery updates the password before ending the local session', async () => {
  const calls = []
  await finishPasswordRecovery({ updateUser: async (value) => { calls.push(value); return {} }, signOut: async (value) => { calls.push(value); return {} } }, 'new-password')
  assert.deepEqual(calls, [{ password: 'new-password' }, { scope: 'local' }])
})

test('expired recovery cannot clear a session or report success', async () => {
  let signedOut = false
  await assert.rejects(finishPasswordRecovery({ updateUser: async () => ({ error: { status: 401 } }), signOut: async () => { signedOut = true } }, 'new-password'), /expired/)
  assert.equal(signedOut, false)
})

test('network failure is distinguished from an expired link', async () => {
  await assert.rejects(finishPasswordRecovery({ updateUser: async () => ({ error: { status: 503 } }) }, 'new-password'), /connection/)
})

test('sign-out failure reports that the password was changed', async () => {
  await assert.rejects(finishPasswordRecovery({ updateUser: async () => ({}), signOut: async () => ({ error: new Error() }) }, 'new-password'), /Password updated, but sign out failed/)
})
