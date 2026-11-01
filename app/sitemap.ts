import type { MetadataRoute } from 'next'
import { allBlogs, allProjects } from 'contentlayer/generated'
import siteMetadata from '@/data/siteMetadata'
export const dynamic = 'force-static'
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...['', 'blog', 'projects', 'about'].map((route) => ({
      url: `${siteMetadata.siteUrl}/${route}`,
    })),
    ...allBlogs
      .filter((p) => !p.draft)
      .map((p) => ({
        url: `${siteMetadata.siteUrl}/blog/${p.slug}`,
        lastModified: p.lastmod || p.date,
      })),
    ...allProjects
      .filter((p) => !p.draft)
      .map((p) => ({ url: `${siteMetadata.siteUrl}/projects/${p.slug}` })),
  ]
}
