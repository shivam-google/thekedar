import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { publicPages } from '../seoPages'

const siteOrigin = new URL(import.meta.env.VITE_SITE_URL || 'https://thekedar-51s.pages.dev').origin
const siteName = 'TheKedar'
const defaultImage = `${siteOrigin}/icons/thekedar-512.png`

const privateRoutes = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/dashboard',
  '/services',
  '/admin',
  '/machines/new',
  '/workers/profile',
  '/tankers/profile',
  '/materials/profile',
  '/projects',
  '/bookings',
  '/favorites',
  '/notifications',
  '/profile',
]

function isPrivateRoute(pathname) {
  return privateRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

function setMeta(attribute, key, content) {
  const selector = `meta[${attribute}="${key}"]`
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.append(element)
  }
  element.setAttribute('content', content)
}

function setLink(rel, href) {
  let element = document.head.querySelector(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.append(element)
  }
  element.setAttribute('href', href)
}

function setStructuredData(pathname) {
  let element = document.getElementById('thekedar-structured-data')
  if (!element) {
    element = document.createElement('script')
    element.id = 'thekedar-structured-data'
    element.type = 'application/ld+json'
    document.head.append(element)
  }

  const websiteUrl = new URL(pathname, siteOrigin).href
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteOrigin}/#organization`,
        name: siteName,
        url: siteOrigin,
        description: 'A construction marketplace connecting customers and local construction service providers.',
        logo: {
          '@type': 'ImageObject',
          url: defaultImage,
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${siteOrigin}/#website`,
        name: siteName,
        url: siteOrigin,
        description: 'Find construction machines, workers, water tankers and materials near you.',
        publisher: { '@id': `${siteOrigin}/#organization` },
      },
      {
        '@type': 'WebPage',
        '@id': `${websiteUrl}#webpage`,
        name: publicPages[pathname].title,
        description: publicPages[pathname].description,
        url: websiteUrl,
        isPartOf: { '@id': `${siteOrigin}/#website` },
      },
    ],
  }
  element.textContent = JSON.stringify(data)
}

export default function SeoManager() {
  const { pathname } = useLocation()
  const normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '')
  const page = publicPages[normalizedPath]

  useEffect(() => {
    if (!page) {
      document.title = `TheKedar | ${isPrivateRoute(normalizedPath) ? 'Account' : 'Page'}`
      setMeta('name', 'robots', 'noindex, nofollow')
      setMeta('name', 'description', 'TheKedar construction services marketplace.')
      document.head.querySelector('link[rel="canonical"]')?.remove()
      document.getElementById('thekedar-structured-data')?.remove()
      return
    }

    const canonicalUrl = new URL(normalizedPath, siteOrigin).href
    document.title = page.title
    setMeta('name', 'description', page.description)
    setMeta('name', 'robots', 'index, follow')
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:site_name', siteName)
    setMeta('property', 'og:title', page.title)
    setMeta('property', 'og:description', page.description)
    setMeta('property', 'og:url', canonicalUrl)
    setMeta('property', 'og:image', defaultImage)
    setMeta('property', 'og:image:alt', 'TheKedar construction marketplace')
    setMeta('name', 'twitter:card', 'summary')
    setMeta('name', 'twitter:title', page.title)
    setMeta('name', 'twitter:description', page.description)
    setMeta('name', 'twitter:image', defaultImage)
    setLink('canonical', canonicalUrl)
    setStructuredData(normalizedPath)
  }, [normalizedPath, page])

  return null
}
