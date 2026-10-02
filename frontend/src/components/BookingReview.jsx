import { useEffect, useState } from 'react'
import { getMyBookingReview, submitBookingReview } from '../services/reviewService'
import { Icon } from './Icons'
import '../styles/reviews.css'

export default function BookingReview({ booking }) {
  const [review, setReview] = useState(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let active = true
    getMyBookingReview(booking.id).then((existing) => active && setReview(existing)).catch((loadError) => active && setError(loadError.message)).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [booking.id])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (rating < 1 || rating > 5) return setError('Choose a rating from 1 to 5.')
    setBusy(true)
    try {
      const saved = await submitBookingReview({ bookingId: booking.id, rating, comment })
      setReview(saved)
      setSuccess(true)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  return <section className="booking-review" aria-labelledby="booking-review-title">
    <h2 id="booking-review-title">{review ? 'Your review' : 'Leave a review'}</h2>
    {loading ? <p className="review-muted">Checking for an existing review...</p> : review ? <div className="review-submitted" role="status">
      <p className="review-rating"><span aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span><strong>{review.rating}/5</strong></p>
      {review.comment && <p>{review.comment}</p>}
      {success && <p className="review-success">Review submitted successfully.</p>}
    </div> : <form onSubmit={submit}>
      <p className="review-muted">Share your experience with this provider.</p>
      <fieldset className="review-rating-fieldset">
        <legend>Rating</legend>
        <div className="review-rating-options">{[1, 2, 3, 4, 5].map((value) => <label key={value} className={rating === value ? 'is-selected' : ''}>
          <input type="radio" name={`review-rating-${booking.id}`} value={value} checked={rating === value} onChange={() => setRating(value)} />
          <Icon name="star" size={18} />
          <span>{value}</span>
        </label>)}</div>
      </fieldset>
      <label className="form-label review-comment-label">Comment (optional)<textarea rows="3" maxLength="2000" value={comment} onChange={(event) => setComment(event.target.value)} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="button" disabled={busy}>{busy ? 'Submitting review...' : 'Submit review'} <Icon name="arrow" size={16} /></button>
    </form>}
  </section>
}
