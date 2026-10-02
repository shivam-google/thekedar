import { supabase } from './supabaseClient'

export const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })

export const signUp = ({ email, password, fullName, phone, role }) => supabase.auth.signUp({
  email,
  password,
  options: {
    data: { full_name: fullName, phone, role },
  },
})

export const signOut = () => supabase.auth.signOut()

export const sendPasswordReset = (email) => supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password`,
})

export const updatePassword = (password) => supabase.auth.updateUser({ password })

export const getCurrentSession = () => supabase.auth.getSession()
export const onAuthStateChange = (callback) => supabase.auth.onAuthStateChange(callback)