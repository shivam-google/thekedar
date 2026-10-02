import { useState } from 'react'
import '../styles/marketplace-images.css'

function safeImageSource(source) {
  if (typeof source !== 'string' || !source.trim()) return ''
  try {
    const url = new URL(source)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return ''
    return url.href
  } catch {
    return ''
  }
}

export default function MarketplaceImage({ src, alt, fallback, fallbackClassName = '' }) {
  const safeSrc = safeImageSource(src)
  const [loadedSrc, setLoadedSrc] = useState('')
  const [failedSrc, setFailedSrc] = useState('')
  const failed = !safeSrc || failedSrc === safeSrc
  const loaded = Boolean(safeSrc) && loadedSrc === safeSrc

  return <div className="marketplace-image-frame" role={failed ? 'img' : undefined} aria-label={failed ? alt : undefined}>
    {safeSrc && !failed && <img
      src={safeSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={() => setLoadedSrc(safeSrc)}
      onError={() => setFailedSrc(safeSrc)}
      className="marketplace-image-content"
      style={{ opacity: loaded ? 1 : 0 }}
    />}
    {!loaded && <div className={`marketplace-image-fallback ${fallbackClassName}`} aria-hidden="true">{fallback}</div>}
  </div>
}