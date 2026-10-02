import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!form.email || !form.password) return setError('Enter your email and password.')
    setBusy(true)
    try {
      await login(form.email.trim(), form.password)
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  return <AuthShell eyebrow="Welcome back" title="Log in to your workspace" subtitle="Pick up your next build right where you left it.">
    <form onSubmit={submit} className="space-y-5">
      <Field label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} placeholder="you@example.com" />
      <Field label="Password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} placeholder="Your password" />
      {error && <Alert>{error}</Alert>}
      <button disabled={busy} className="w-full rounded-xl bg-orange-600 px-5 py-3.5 font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60">{busy ? 'Signing in...' : 'Log in'}</button>
      <div className="flex justify-between text-sm"><Link to="/forgot-password" className="font-semibold text-orange-700 hover:underline">Forgot password?</Link><Link to="/signup" className="font-semibold text-slate-700 hover:text-orange-700">Create account</Link></div>
    </form>
  </AuthShell>
}

export function AuthShell({ eyebrow, title, subtitle, children }) {
  return <main className="flex min-h-screen items-center justify-center bg-[#f4f1ea] px-5 py-10 text-slate-900"><div className="w-full max-w-md"><Link to="/" className="mb-10 block text-center text-2xl font-black tracking-tight">Thekedar<span className="text-orange-600">.</span></Link><section className="rounded-[2rem] bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-10"><p className="text-xs font-black uppercase tracking-[0.25em] text-orange-600">{eyebrow}</p><h1 className="mt-3 text-3xl font-black tracking-tight">{title}</h1><p className="mt-3 text-sm leading-6 text-slate-500">{subtitle}</p><div className="mt-8">{children}</div></section></div></main>
}

export function Field({ label, type = 'text', value, onChange, placeholder }) {
  return <label className="block text-sm font-bold text-slate-700">{label}<input required type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100" /></label>
}

export function Alert({ children, success = false }) {
  return <p role="alert" className={`rounded-xl px-4 py-3 text-sm ${success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{children}</p>
}
