import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import { Icon } from '../components/Icons'
import { getMyFavoriteItems, removeFavorite } from '../services/favoriteService'
import '../styles/favorites.css'

const typeLabels = { MACHINE: 'Machine', WORKER: 'Worker', TANKER: 'Tanker', MATERIAL: 'Material' }

export default function Favorites() {
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  const loadFavorites = useCallback(async () => {
    try {
      setFavorites(await getMyFavoriteItems())
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadFavorites() }, [loadFavorites])

  const handleRemove = async (favorite) => {
    const key = `${favorite.item_type}:${favorite.item_id}`
    setBusyId(key)
    setError('')
    try {
      await removeFavorite(favorite.item_type, favorite.item_id)
      setFavorites((current) => current.filter((item) => item.id !== favorite.id))
    } catch (removeError) {
      setError(removeError.message)
    } finally {
      setBusyId('')
    }
  }

  return <div className="site-page"><Navbar /><main className="favorites-page">
    <header className="favorites-heading"><div><p className="eyebrow eyebrow-orange">Your saved listings</p><h1>Favorites</h1><p>Marketplace items you’ve saved for later.</p></div><span className="favorites-total">{favorites.length} {favorites.length === 1 ? 'saved item' : 'saved items'}</span></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    {loading ? <div className="favorites-state"><Icon name="loader" size={25} /><p>Loading favorites...</p></div> : favorites.length === 0 ? <div className="favorites-state"><Icon name="heart" size={28} /><h2>No favorites yet</h2><p>Save machines, workers, tankers, or materials to find them here.</p><Link to="/machines" className="button">Explore marketplace <Icon name="arrow" size={16} /></Link></div> : <section className="favorites-list" aria-label="Saved marketplace items">
      {favorites.map((favorite) => {
        const key = `${favorite.item_type}:${favorite.item_id}`
        const item = favorite.item
        return <article className="favorite-row" key={favorite.id}>
          <div className="favorite-item-image">{item?.image ? <img src={item.image} alt="" /> : <Icon name={favorite.item_type === 'WORKER' ? 'user' : favorite.item_type === 'TANKER' ? 'water' : favorite.item_type === 'MATERIAL' ? 'box' : 'truck'} size={30} />}</div>
          <div className="favorite-item-info"><p className="eyebrow">{typeLabels[favorite.item_type] || 'Marketplace item'}</p>{item ? <><h2><Link to={favorite.href}>{item.title}</Link></h2><p>{item.subtitle}{item.location ? ` · ${item.location}` : ''}</p></> : <><h2>This item is no longer available</h2><p>The listing may have been removed or is not currently visible.</p></>}</div>
          {item?.price != null && <strong className="favorite-item-price">₹{Number(item.price).toLocaleString('en-IN')}<small>{item.unit ? ` / ${item.unit}` : ''}</small></strong>}
          {item && <Link to={favorite.href} className="favorite-view-link">View details <Icon name="arrow" size={15} /></Link>}
          <button type="button" className="favorite-remove" onClick={() => handleRemove(favorite)} disabled={busyId === key} aria-label={`Remove ${item?.title || 'item'} from favorites`} title="Remove from favorites"><Icon name="close" size={17} /></button>
        </article>
      })}
    </section>}
  </main><Footer /></div>
}