import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { coordinates } from '../utils/location'

export function useNearbyLocation() {
  const { profile } = useAuth()
  const [point, setPoint] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const origin = { city: profile?.city, state: profile?.state, ...point }
  const locate = () => {
    setError('')
    if (!navigator.geolocation) return setError('This browser cannot access location. Set your city/state in your profile.')
    setBusy(true)
    navigator.geolocation.getCurrentPosition(({ coords }) => { setPoint({ latitude: coords.latitude, longitude: coords.longitude }); setBusy(false) }, () => { setBusy(false); setError('Location access failed. Allow location and try again, or set your city/state in your profile.') }, { timeout: 10000, maximumAge: 60000 })
  }
  return { origin, locate, error, busy }
}

export default function NearbyLocation({ location }) {
  return <div className="nearby-location"><button type="button" className="text-link text-link-dark" onClick={location.locate} disabled={location.busy}>{location.busy ? 'Getting location...' : 'Use my location'}</button><p role="status">{coordinates(location.origin) ? 'Sorted by distance. Listings without coordinates follow by city/state relevance.' : location.origin.city || location.origin.state ? 'Using your profile city/state until you share a location.' : 'Share your location for distance sorting. Showing newest listings until then.'}</p>{location.error && <p role="alert">{location.error}</p>}</div>
}

export function DistanceLabel({ item }) {
  return item.distance_km != null ? <span className="distance-label">{item.distance_km < 1 ? '< 1' : item.distance_km.toFixed(1)} km away</span> : null
}
