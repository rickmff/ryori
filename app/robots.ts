import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'], // Disallow API routes and any admin pages
    },
    sitemap: 'https://ryorirestaurant.com/sitemap.xml',
  }
}