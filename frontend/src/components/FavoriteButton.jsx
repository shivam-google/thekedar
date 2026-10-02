import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { addFavorite, getFavorite, removeFavorite } from '../services/favoriteService'
import { Icon } from './Icons'

export default function FavoriteButton({ itemType, itemId, className = '' }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [active, setActive] = useState(false)
  const [checking, setChecking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    setActive(false)
    setError('')
    if (!isAuthenticated || !itemId) {
      setChecking(false)
      return () => { mounted = false }
    }
    setChecking(true)
    getFavorite(itemType, itemId)
      .then((favorited) => mounted && setActive(favorited))
      .catch((loadError) => mounted && setError(loadError.message))
      .finally(() => mounted && setChecking(false))
    return () => { mounted = false }
  }, [isAuthenticated, itemType, itemId])

  const toggle = async (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!isAuthenticated) return navigate('/login', { state: { from: location.pathname } })
    if (busy) return
    const previous = active
    setActive(!previous)
    setBusy(true)
    setError('')
    try {
      if (previous) await removeFavorite(itemType, itemId)
      else await addFavorite(itemType, itemId)
    } catch (toggleError) {
      setActive(previous)
      setError(toggleError.message)
    } finally {
      setBusy(false)
    }
  }

  return <button type="button" className={`favorite-button ${active ? 'is-favorite' : ''} ${className}`} onClick={toggle} disabled={busy || checking} aria-pressed={active} aria-label={active ? 'Remove from favorites' : 'Add to favorites'} title={error || (active ? 'Remove from favorites' : 'Add to favorites')}>
    <Icon name="heart" size={18} />
  </button>
}