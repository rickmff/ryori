import { MetadataRoute } from 'next'

// Replace with your actual website domain
const baseUrl = 'https://your-restaurant-url.com';

export default function sitemap(): MetadataRoute.Sitemap {
  // Define your static routes with the correct type
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly', // Or 'weekly' if homepage content changes often
      priority: 1.0, // Highest priority for the homepage
    },
    {
      url: `${baseUrl}/sobre`,
      lastModified: new Date(), // Or a specific date if it rarely changes
      changeFrequency: 'yearly', // If the 'About' page content is stable
      priority: 0.8, // High priority, but less than homepage
    },
    // Add other static pages if you have them (e.g., /menu, /contact)
    // {
    //   url: `${baseUrl}/menu`,
    //   lastModified: new Date(),
    //   changeFrequency: 'weekly',
    //   priority: 0.9,
    // },
  ];

  // ... existing code ...

  return [
    ...staticRoutes,
    // ... add dynamic routes here if needed in the future
  ];
}