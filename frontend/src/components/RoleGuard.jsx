import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const roleLabels = {
  customer: 'Customer',
  contractor: 'Contractor',
  worker: 'Worker',
  machine_owner: 'Machine Owner',
  tanker_owner: 'Tanker Owner',
  material_supplier: 'Material Supplier',
}

const roleTasks = {
  machine_owner: 'list equipment',
  worker: 'create a worker profile',
  tanker_owner: 'create a tanker profile',
  material_supplier: 'create a material profile',
}

const marketplaces = {
  machine_owner: ['machines', '/machines'],
  worker: ['workers', '/workers'],
  tanker_owner: ['tankers', '/tankers'],
  material_supplier: ['materials', '/materials'],
}

export default function RoleGuard({ allowedRoles, children }) {
  const { profile, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return null
  if (allowedRoles.includes(profile?.role)) return children

  const requiredRoles = allowedRoles.map((role) => roleLabels[role] || role).join(' or ')
  const requiredRole = allowedRoles.length === 1 ? allowedRoles[0] : null
  const task = requiredRole && roleTasks[requiredRole]

  const createAccount = async () => {
    setError('')
    setBusy(true)
    try {
      await logout()
      navigate(`/signup${requiredRole ? `?role=${requiredRole}` : ''}`, { replace: true })
    } catch {
      setError('Unable to log out. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#f4f1ea] px-6 py-12 text-slate-900">
    <section className="w-full max-w-xl">
      <p className="text-sm font-bold uppercase tracking-wide text-orange-700">Account access</p>
      <h1 className="mt-3 text-3xl font-bold">This account can’t access this page.</h1>
      <p className="mt-4 text-slate-600">{task ? `You need a ${requiredRoles} account to ${task}.` : `You need a ${requiredRoles} account to access this page.`}</p>
      {error && <p role="alert" className="mt-4 text-sm font-semibold text-red-700">{error}</p>}
      <button type="button" disabled={busy} onClick={createAccount} className="mt-7 inline-flex items-center rounded-lg bg-orange-600 px-5 py-3 font-bold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60">
        {busy ? 'Logging out...' : `Log out and create a ${requiredRoles} account`}
      </button>
      {requiredRole && marketplaces[requiredRole] && <p className="mt-5"><Link to={marketplaces[requiredRole][1]} className="font-bold text-orange-800 hover:underline">Back to {marketplaces[requiredRole][0]}</Link></p>}
    </section>
  </main>
}