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
    {
      url: `${baseUrl}#reservations`,
      lastModified: new Date(),
      changeFrequency: 'weekly', // Reservation info might change
      priority: 0.9, // High priority for reservations
    },
    {
      url: `${baseUrl}#menu`,
      lastModified: new Date(),
      changeFrequency: 'monthly', // Menu might change seasonally
      priority: 0.8, // High priority for menu
    },
    {
      url: `${baseUrl}#gallery`,
      lastModified: new Date(),
      changeFrequency: 'monthly', // Gallery updated occasionally
      priority: 0.7,
    },
    {
      url: `${baseUrl}#location`,
      lastModified: new Date(),
      changeFrequency: 'yearly', // Location info rarely changes
      priority: 0.6,
    },
  ];

  return [
    ...staticRoutes,
  ];
}