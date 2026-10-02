import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, AuthShell, Field } from './Login'
import { updatePassword } from '../services/authService'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirmPassword) return setError('Passwords do not match.')
    setBusy(true)
    const { error: updateError } = await updatePassword(password)
    setBusy(false)
    if (updateError) return setError('This reset link is invalid or expired. Request a new one.')
    setDone(true)
    setTimeout(() => navigate('/login', { replace: true }), 1200)
  }

  return <AuthShell eyebrow="New password" title="Make it memorable" subtitle="Choose a new password with at least 8 characters."><form onSubmit={submit} className="space-y-5"><Field label="New password" type="password" value={password} onChange={setPassword} placeholder="8+ characters" /><Field label="Confirm new password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat password" />{error && <Alert>{error}</Alert>}{done && <Alert success>Password updated. Redirecting to login...</Alert>}<button disabled={busy || done} className="w-full rounded-xl bg-orange-600 px-5 py-3.5 font-bold text-white transition hover:bg-orange-700 disabled:opacity-60">{busy ? 'Updating...' : 'Update password'}</button>{!done && <p className="text-center text-sm text-slate-500"><Link to="/login" className="font-bold text-orange-700 hover:underline">Back to login</Link></p>}</form></AuthShell>
}
