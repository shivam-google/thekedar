import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadEnv } from 'vite'
import { publicPages } from './src/seoPages.js'

const privatePaths = [
  '/login', '/signup', '/forgot-password', '/reset-password', '/dashboard',
  '/services', '/admin', '/machines/new', '/machines/*/edit',
  '/workers/profile', '/tankers/profile', '/materials/profile', '/projects',
  '/bookings', '/favorites', '/notifications', '/profile',
]

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character])
}

function staticMetadataPlugin(siteOrigin) {
  let outputDirectory

  return {
    name: 'thekedar-static-seo',
    apply: 'build',
    configResolved(config) {
      outputDirectory = resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      const sourceHtml = await readFile(resolve(outputDirectory, 'index.html'), 'utf8')
      const imageUrl = `${siteOrigin}/icons/thekedar-512.png`
      const robots = [
        'User-agent: *',
        'Allow: /',
        ...privatePaths.map((path) => `Disallow: ${path}`),
        '',
        `Sitemap: ${siteOrigin}/sitemap.xml`,
        '',
      ].join('\n')
      const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...Object.keys(publicPages).map((path) => `  <url><loc>${siteOrigin}${path}</loc></url>`),
        '</urlset>',
        '',
      ].join('\n')

      await writeFile(resolve(outputDirectory, 'robots.txt'), robots)
      await writeFile(resolve(outputDirectory, 'sitemap.xml'), sitemap)

      for (const [path, page] of Object.entries(publicPages)) {
        const canonicalUrl = new URL(path, siteOrigin).href
        const structuredData = {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Organization',
              '@id': `${siteOrigin}/#organization`,
              name: 'TheKedar',
              url: siteOrigin,
              description: 'A construction marketplace connecting customers and local construction service providers.',
              logo: { '@type': 'ImageObject', url: imageUrl },
            },
            {
              '@type': 'WebSite',
              '@id': `${siteOrigin}/#website`,
              name: 'TheKedar',
              url: siteOrigin,
              description: 'Find construction machines, workers, water tankers and materials near you.',
              publisher: { '@id': `${siteOrigin}/#organization` },
            },
            {
              '@type': 'WebPage',
              '@id': `${canonicalUrl}#webpage`,
              name: page.title,
              description: page.description,
              url: canonicalUrl,
              isPartOf: { '@id': `${siteOrigin}/#website` },
            },
          ],
        }
        const metadata = [
          `<title>${escapeHtml(page.title)}</title>`,
          `<meta name="description" content="${escapeHtml(page.description)}" />`,
          '<meta name="robots" content="index, follow" />',
          `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
          '<meta property="og:type" content="website" />',
          '<meta property="og:site_name" content="TheKedar" />',
          `<meta property="og:title" content="${escapeHtml(page.title)}" />`,
          `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
          `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
          `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`,
          '<meta property="og:image:alt" content="TheKedar construction marketplace" />',
          '<meta name="twitter:card" content="summary" />',
          `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`,
          `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`,
          `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`,
          `<script id="thekedar-structured-data" type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, '\\u003c')}</script>`,
        ].join('\n    ')
        const html = sourceHtml
          .replace(/<title>[\s\S]*?<\/title>/i, '')
          .replace(/<meta\s+name="description"[^>]*\/?>/gi, '')
          .replace(/<meta\s+name="robots"[^>]*\/?>/gi, '')
          .replace('</head>', `    ${metadata}\n  </head>`)
        const pageDirectory = path === '/' ? outputDirectory : resolve(outputDirectory, path.slice(1))
        await mkdir(pageDirectory, { recursive: true })
        await writeFile(resolve(pageDirectory, 'index.html'), html)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '')
  const siteOrigin = new URL(environment.VITE_SITE_URL || 'https://thekedar-51s.pages.dev').origin

  return {
    plugins: [react(), staticMetadataPlugin(siteOrigin)],
  }
})
