import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, AuthShell, Field } from './Login'
import { useAuth } from '../context/AuthContext'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await resetPassword(email.trim())
      setSent(true)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  return <AuthShell eyebrow="Account recovery" title="Reset your password" subtitle="We will send a secure reset link to your email address."><form onSubmit={submit} className="space-y-5"><Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />{error && <Alert>{error}</Alert>}{sent && <Alert success>Check your inbox for the password reset link.</Alert>}<button disabled={busy} className="w-full rounded-xl bg-orange-600 px-5 py-3.5 font-bold text-white transition hover:bg-orange-700 disabled:opacity-60">{busy ? 'Sending...' : 'Send reset link'}</button><p className="text-center text-sm text-slate-500"><Link to="/login" className="font-bold text-orange-700 hover:underline">Back to login</Link></p></form></AuthShell>
}
