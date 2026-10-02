import { useEffect, useState } from 'react'
import { getReviewsForItem } from '../services/reviewService'
import '../styles/reviews.css'

export default function ProviderRatings({ itemType, itemId }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getReviewsForItem(itemType, itemId).then((data) => active && setReviews(data)).catch(() => active && setError('Reviews are unavailable.')).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [itemType, itemId])

  if (loading || error) return error ? <p className="review-muted" role="status">{error}</p> : null
  const average = reviews.length ? reviews.reduce((total, review) => total + Number(review.rating), 0) / reviews.length : 0

  return <section className="provider-ratings" aria-label="Provider ratings">
    <h2>Ratings and reviews</h2>
    <p className="provider-rating-summary">{reviews.length ? <><strong>{average.toFixed(1)}</strong> out of 5 · {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</> : 'No reviews yet.'}</p>
    {reviews.map((review, index) => <article className="provider-review" key={`${review.created_at}-${index}`}>
      <p className="review-rating"><span aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span><strong>{review.rating}/5</strong></p>
      {review.comment && <p>{review.comment}</p>}
      <time dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString('en-IN')}</time>
    </article>)}
  </section>
}
