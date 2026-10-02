import { useState } from 'react'
import { coordinates } from '../utils/location'

export default function LocationFields({ value, onChange }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const capture = () => {
    setError('')
    if (!navigator.geolocation) return setError('Location is unavailable. Enter coordinates manually.')
    setBusy(true)
    navigator.geolocation.getCurrentPosition(({ coords }) => { onChange({ latitude: coords.latitude, longitude: coords.longitude }); setBusy(false) }, () => { setBusy(false); setError('Unable to get your location. Enter coordinates manually or try again.') }, { timeout: 10000, maximumAge: 60000 })
  }
  return <fieldset className="listing-coordinates"><legend>Map position (optional)</legend><p>Add the service location so customers can sort by distance. Coordinates are visible in the marketplace.</p><div className="form-fields two-column"><label className="form-label">Latitude<input type="number" step="any" min="-90" max="90" value={value.latitude ?? ''} onChange={(event) => onChange({ latitude: event.target.value })} /></label><label className="form-label">Longitude<input type="number" step="any" min="-180" max="180" value={value.longitude ?? ''} onChange={(event) => onChange({ longitude: event.target.value })} /></label></div><button type="button" className="text-link text-link-dark" disabled={busy} onClick={capture}>{busy ? 'Getting location...' : 'Use current location'}</button>{coordinates(value) && <button type="button" className="text-link text-link-dark" onClick={() => onChange({ latitude: '', longitude: '' })}>Clear coordinates</button>}{error && <p role="alert">{error}</p>}</fieldset>
}
