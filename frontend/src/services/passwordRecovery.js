export function validateNewPassword(password, confirmation) {
  if (password.length < 8) throw new Error('Password must be at least 8 characters.')
  if (password !== confirmation) throw new Error('Passwords do not match.')
}

export async function finishPasswordRecovery(auth, password) {
  const { error } = await auth.updateUser({ password })
  if (error) {
    if (error.code === 'same_password') throw new Error('Choose a password different from your old password.')
    if (error.code === 'weak_password') throw new Error('Choose a stronger password that meets the account requirements.')
    if (['session_not_found', 'refresh_token_not_found', 'refresh_token_already_used'].includes(error.code) || error.status === 401 || error.status === 403) throw new Error('This reset link is invalid or expired. Request a new one.')
    throw new Error('Unable to update your password. Check your connection and try again.')
  }
  const { error: signOutError } = await auth.signOut({ scope: 'local' })
  if (signOutError) throw new Error('Password updated, but sign out failed. Please sign out and log in with your new password.')
}
