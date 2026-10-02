import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, AuthShell, Field } from './Login'
import { useAuth } from '../context/AuthContext'

const roles = [
  ['customer', 'Customer', 'Find people and resources for your project'],
  ['contractor', 'Contractor', 'Manage projects and coordinate work'],
  ['worker', 'Worker', 'Offer your skills to construction teams'],
  ['machine_owner', 'Machine Owner', 'Rent out your construction equipment'],
  ['tanker_owner', 'Tanker Owner', 'Provide water tanker services'],
  ['material_supplier', 'Material Supplier', 'Supply materials to active projects'],
]

export default function Signup() {
  const { signup, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedRole = searchParams.get('role')
  const initialRole = roles.some(([value]) => value === requestedRole) ? requestedRole : ''
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '', role: initialRole })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!form.fullName || !form.email || !form.phone || !form.password || !form.confirmPassword || !form.role) return setError('Complete every field to create your account.')
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Enter a valid email address.')
    if (!/^[+\d][\d\s()-]{7,}$/.test(form.phone)) return setError('Enter a valid phone number.')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.')
    setBusy(true)
    try {
      const result = await signup(form)
      if (result.confirmationRequired) setMessage('Account created. Check your email to confirm your address, then log in.')
      else navigate('/dashboard', { replace: true })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  return <AuthShell eyebrow="Join Thekedar" title="Start with the right role" subtitle="Create a real account for the work you do. Admin access is managed separately.">
    <form onSubmit={submit} className="space-y-5">
      <Field label="Full name" value={form.fullName} onChange={(value) => setForm({ ...form, fullName: value })} placeholder="Your full name" />
      <Field label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} placeholder="you@example.com" />
      <Field label="Phone" type="tel" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} placeholder="+91 98765 43210" />
      <div><p className="text-sm font-bold text-slate-700">Your role</p><div className="mt-2 grid gap-2">{roles.map(([value, label, description]) => <label key={value} className={`cursor-pointer rounded-xl border p-3 transition ${form.role === value ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-orange-300'}`}><input type="radio" name="role" value={value} checked={form.role === value} onChange={(event) => setForm({ ...form, role: event.target.value })} className="sr-only" /><span className="block text-sm font-bold">{label}</span><span className="mt-1 block text-xs text-slate-500">{description}</span></label>)}</div></div>
      <div className="grid gap-5 sm:grid-cols-2"><Field label="Password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} placeholder="8+ characters" /><Field label="Confirm password" type="password" value={form.confirmPassword} onChange={(value) => setForm({ ...form, confirmPassword: value })} placeholder="Repeat password" /></div>
      {error && <Alert>{error}</Alert>}
      {message && <Alert success>{message}</Alert>}
      <button disabled={busy} className="w-full rounded-xl bg-orange-600 px-5 py-3.5 font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60">{busy ? 'Creating account...' : 'Create account'}</button>
      <p className="text-center text-sm text-slate-500">Already registered? <Link to="/login" className="font-bold text-orange-700 hover:underline">Log in</Link></p>
    </form>
  </AuthShell>
}
