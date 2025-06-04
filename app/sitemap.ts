import { MetadataRoute } from 'next'

// Restaurant's actual domain from the schema
const baseUrl = 'https://ryorirestaurant.com';

export default function sitemap(): MetadataRoute.Sitemap {
  // Define your static routes with the correct type
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0, // Highest priority for the homepage
    },
  ];

  return [
    ...staticRoutes,
  ];
}