import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, AuthShell, Field } from './Login'
import { finishPasswordRecovery, validateNewPassword } from '../services/passwordRecovery'
import { recoveryLinkError, supabase } from '../services/supabaseClient'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let active = true
    const verify = async () => {
      try {
        if (recoveryLinkError) throw new Error('This reset link is invalid or expired. Request a new one.')
        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !data.session) throw new Error('This reset link is invalid or expired. Request a new one.')
        const { error: userError } = await supabase.auth.getUser()
        if (userError) throw new Error('This reset link is invalid or expired. Request a new one.')
        if (active) setReady(true)
      } catch (error) { if (active) setError(error.message) }
      finally { if (active) setChecking(false) }
    }
    verify()
    return () => { active = false }
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try { validateNewPassword(password, confirmPassword) } catch (error) { return setError(error.message) }
    setBusy(true)
    try { await finishPasswordRecovery(supabase.auth, password); setDone(true) }
    catch (error) { setError(error.message) }
    finally { setBusy(false) }
  }

  return <AuthShell eyebrow="New password" title="Make it memorable" subtitle="Choose a new password with at least 8 characters.">{checking ? <p role="status">Checking your reset link...</p> : done ? <><Alert success>Password updated. Log in with your new password.</Alert><Link to="/login" className="button">Log in</Link></> : <form onSubmit={submit} className="space-y-5">{ready && <><Field label="New password" type="password" value={password} onChange={setPassword} placeholder="8+ characters" /><Field label="Confirm new password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat password" /></>}{error && <Alert>{error}</Alert>}{ready && <button disabled={busy} className="w-full rounded-xl bg-orange-600 px-5 py-3.5 font-bold text-white disabled:opacity-60">{busy ? 'Updating...' : 'Update password'}</button>}<p className="text-center text-sm"><Link to="/forgot-password" className="font-bold text-orange-700 hover:underline">Request a new reset link</Link></p></form>}</AuthShell>
}
