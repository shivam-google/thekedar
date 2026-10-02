import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getProfile } from '../services/profileService'

export default function AdminRoute({ children }) {
  const { user, profile, loading, isAuthenticated } = useAuth()
  const location = useLocation()
  const [verifiedRole, setVerifiedRole] = useState('')
  const [checkingRole, setCheckingRole] = useState(true)

  useEffect(() => {
    let active = true
    if (!isAuthenticated || !user) {
      setVerifiedRole('')
      setCheckingRole(false)
      return () => { active = false }
    }
    if (profile?.role) {
      setVerifiedRole(profile.role)
      setCheckingRole(false)
      return () => { active = false }
    }

    setCheckingRole(true)
    getProfile(user.id).then((nextProfile) => {
      if (active) setVerifiedRole(nextProfile?.role || '')
    }).catch(() => {
      if (active) setVerifiedRole('')
    }).finally(() => {
      if (active) setCheckingRole(false)
    })
    return () => { active = false }
  }, [user?.id, profile?.role, isAuthenticated, user])

  if (loading || checkingRole) return <div className="flex min-h-screen items-center justify-center bg-[#f4f1ea] text-sm font-bold text-slate-600">Loading your workspace...</div>
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (verifiedRole !== 'admin') return <Navigate to="/dashboard" replace />
  if (!user) return null
  return children
}