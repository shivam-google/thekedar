import { useEffect, useRef, useState } from 'react'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import { Icon } from '../components/Icons'
import { useAuth } from '../context/AuthContext'
import { getProfile, getProfileImageUrl, updateProfile, uploadProfileImage } from '../services/profileService'
import '../styles/profile.css'

const emptyForm = { full_name: '', phone: '', city: '', state: '', address: '', bio: '' }

export default function Profile() {
  const { user, profile: authProfile, refreshProfile } = useAuth()
  const fileInput = useRef(null)
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [imageUrl, setImageUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true
    getProfile(user.id).then(async (data) => {
      if (!active) return
      setProfile(data)
      setForm({
        full_name: data?.full_name || '',
        phone: data?.phone || '',
        city: data?.city || '',
        state: data?.state || '',
        address: data?.address || '',
        bio: data?.bio || '',
      })
      if (data?.profile_image) {
        try {
          const signedUrl = await getProfileImageUrl()
          if (active) setImageUrl(signedUrl || '')
        } catch {
          if (active) setError('Profile loaded, but its image could not be displayed.')
        }
      }
    }).catch(() => active && setError('Unable to load your profile. Please try again.')).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [user.id])

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setSuccess('')
  }

  const save = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const updated = await updateProfile(form)
      setProfile(updated)
      await refreshProfile()
      setSuccess('Profile updated successfully.')
    } catch (saveError) {
      setError(saveError.message || 'Unable to save your profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const selectImage = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    setSuccess('')
    setUploading(true)
    try {
      const updated = await uploadProfileImage(file)
      setProfile(updated)
      await refreshProfile()
      try {
        setImageUrl(await getProfileImageUrl() || '')
        setSuccess('Profile image updated successfully.')
      } catch {
        setError('Image saved, but its preview could not be loaded.')
      }
    } catch (uploadError) {
      setError(uploadError.message || 'Unable to upload your profile image.')
    } finally {
      setUploading(false)
    }
  }

  return <div className="site-page"><Navbar /><main className="profile-page">
    <header className="profile-heading"><p className="eyebrow eyebrow-orange">Account settings</p><h1>Your profile</h1><p>Keep your account details up to date.</p></header>
    {loading ? <div className="profile-state"><Icon name="loader" size={24} /><p>Loading your profile...</p></div> : <div className="profile-layout">
      <aside className="profile-summary">
        <div className="profile-photo-wrap">{imageUrl ? <img src={imageUrl} alt="Your profile" /> : <span>{(profile?.full_name || user.email || 'U').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>}</div>
        <button type="button" className="button button-ghost profile-image-button" onClick={() => fileInput.current?.click()} disabled={uploading}>{uploading ? 'Uploading image...' : 'Change profile image'} <Icon name="image" size={16} /></button>
        <input ref={fileInput} className="profile-image-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectImage} />
        <h2>{profile?.full_name || 'Your name'}</h2>
        <p>{profile?.email || user.email}</p>
        <span className="profile-role-label">{(profile?.role || authProfile?.role || '').replaceAll('_', ' ')}</span>
      </aside>
      <form className="profile-form" onSubmit={save}>
        <div className="profile-section-heading"><div><p className="eyebrow eyebrow-orange">Personal information</p><h2>Account details</h2></div><span>Role: {(profile?.role || authProfile?.role || '').replaceAll('_', ' ')}</span></div>
        <label className="form-label">Full name<input required minLength="2" maxLength="120" value={form.full_name} onChange={(event) => updateField('full_name', event.target.value)} autoComplete="name" /></label>
        <label className="form-label">Email<input type="email" value={profile?.email || user.email || ''} readOnly aria-readonly="true" /></label>
        <label className="form-label">Phone<input type="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} autoComplete="tel" /></label>
        <div className="profile-location-fields">
          <label className="form-label">City<input value={form.city} onChange={(event) => updateField('city', event.target.value)} autoComplete="address-level2" /></label>
          <label className="form-label">State<input value={form.state} onChange={(event) => updateField('state', event.target.value)} autoComplete="address-level1" /></label>
        </div>
        <label className="form-label">Address<textarea rows="2" value={form.address} onChange={(event) => updateField('address', event.target.value)} autoComplete="street-address" /></label>
        <label className="form-label">About you<textarea rows="4" maxLength="2000" value={form.bio} onChange={(event) => updateField('bio', event.target.value)} placeholder="Add a short introduction." /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {success && <p className="profile-success" role="status">{success}</p>}
        <div className="profile-form-actions"><button type="submit" className="button" disabled={saving || uploading}>{saving ? 'Saving profile...' : 'Save changes'} <Icon name="arrow" size={16} /></button></div>
      </form>
    </div>}
  </main><Footer /></div>
}