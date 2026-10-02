import { createContext, useContext, useEffect, useState } from 'react'
import { createProfile, getProfile } from '../services/profileService'
import { getCurrentSession, onAuthStateChange, sendPasswordReset, signIn, signOut, signUp } from '../services/authService'

const AuthContext = createContext(null)

const friendlyError = (error) => {
  const message = error?.message?.toLowerCase() || ''
  if (message.includes('invalid login credentials')) return new Error('Incorrect email or password.')
  if (message.includes('user already registered')) return new Error('This email is already registered.')
  if (message.includes('invalid email')) return new Error('Enter a valid email address.')
  if (error?.status === 429 || message.includes('rate limit')) return new Error('Too many requests. Please wait before trying again.')
  if (message.includes('email not confirmed')) return new Error('Confirm your email before logging in.')
  if (message.includes('password')) return new Error('Password must be at least 8 characters.')
  if (message.includes('fetch') || message.includes('network')) return new Error('Network error. Check your connection and try again.')
  return new Error('Something went wrong. Please try again.')
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    let profileRequest = 0

    const loadProfile = async (sessionUser) => {
      const request = ++profileRequest
      if (!sessionUser) {
        if (active && request === profileRequest) setProfile(null)
        return
      }

      try {
        const nextProfile = await getProfile(sessionUser.id)
        if (active && request === profileRequest) setProfile(nextProfile)
      } catch {
        if (active && request === profileRequest) setProfile(null)
      }
    }

    getCurrentSession().then(({ data }) => {
      if (!active) return
      setUser(data.session?.user || null)
      return loadProfile(data.session?.user)
    }).catch(() => { if (active) { setUser(null); setProfile(null) } }).finally(() => active && setLoading(false))

    const { data: listener } = onAuthStateChange((_event, session) => {
      if (!active) return
      setUser(session?.user || null)
      // The SDK holds an auth lock here; defer API calls until it is released.
      setTimeout(() => { if (active) loadProfile(session?.user) }, 0)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const login = async (email, password) => {
    const { data, error } = await signIn(email, password)
    if (error) throw friendlyError(error)
    return data
  }

  const signup = async (details) => {
    const { data, error } = await signUp(details)
    if (error) throw friendlyError(error)

    if (data.user && data.session) {
      try {
        const nextProfile = await createProfile({ id: data.user.id, ...details })
        setProfile(nextProfile)
      } catch {
        throw new Error('Account created, but your profile could not be saved. Contact support.')
      }
    }

    return { ...data, confirmationRequired: !data.session }
  }

  const logout = async () => {
    const { error } = await signOut()
    if (error) throw friendlyError(error)
    setUser(null)
    setProfile(null)
  }

  const resetPassword = async (email) => {
    const { error } = await sendPasswordReset(email)
    if (error) throw friendlyError(error)
  }

  const refreshProfile = async () => {
    if (!user) return null
    const nextProfile = await getProfile(user.id)
    setProfile(nextProfile)
    return nextProfile
  }

  return <AuthContext.Provider value={{ user, profile, loading, isAuthenticated: Boolean(user), login, signup, logout, resetPassword, refreshProfile }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
