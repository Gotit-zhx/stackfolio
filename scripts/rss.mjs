import { writeFileSync, mkdirSync, readdirSync, existsSync, unlinkSync } from 'fs'
import path from 'path'
import { slug } from 'github-slugger'
import { escape } from 'pliny/utils/htmlEscaper.js'
import siteMetadata from '../data/siteMetadata.js'
import { sortPosts } from 'pliny/utils/contentlayer.js'

const generateRssItem = (config, post) => `
  <item>
    <guid>${config.siteUrl}/blog/${post.slug}</guid>
    <title>${escape(post.title)}</title>
    <link>${config.siteUrl}/blog/${post.slug}</link>
    ${post.summary && `<description>${escape(post.summary)}</description>`}
    <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    <author>${config.email} (${config.author})</author>
    ${post.tags && post.tags.map((t) => `<category>${escape(t)}</category>`).join('')}
  </item>
`

const generateRss = (config, posts, page = 'feed.xml') => `
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
      <title>${escape(config.title)}</title>
      <link>${config.siteUrl}/blog</link>
      <description>${escape(config.description)}</description>
      <language>${config.language}</language>
      <managingEditor>${config.email} (${config.author})</managingEditor>
      <webMaster>${config.email} (${config.author})</webMaster>
      <lastBuildDate>${new Date(posts[0].date).toUTCString()}</lastBuildDate>
      <atom:link href="${config.siteUrl}/${page}" rel="self" type="application/rss+xml"/>
${posts.map((post) => generateRssItem(config, post)).join('')}
    </channel>
  </rss>
`

export function generateRSS(
  config,
  allBlogs,
  outputFolder = process.env.EXPORT ? 'out' : 'public',
  page = 'feed.xml'
) {
  const publishPosts = allBlogs.filter((post) => post.draft !== true)
  const tags = new Set(publishPosts.flatMap((post) => (post.tags || []).map((tag) => slug(tag))))
  // A previously published tag must not retain stale feed data after withdrawal.
  const tagRoot = path.join(outputFolder, 'tags')
  if (existsSync(tagRoot)) {
    for (const entry of readdirSync(tagRoot, { withFileTypes: true })) {
      const feed = path.join(tagRoot, entry.name, page)
      if (entry.isDirectory() && !tags.has(entry.name) && existsSync(feed)) unlinkSync(feed)
    }
  }
  // RSS for blog post
  if (publishPosts.length > 0) {
    const rss = generateRss(config, sortPosts(publishPosts))
    mkdirSync(outputFolder, { recursive: true })
    writeFileSync(path.join(outputFolder, page), rss)
  } else if (existsSync(path.join(outputFolder, page))) {
    unlinkSync(path.join(outputFolder, page))
  }

  if (publishPosts.length > 0) {
    for (const tag of tags) {
      const filteredPosts = publishPosts.filter((post) =>
        (post.tags || []).map((t) => slug(t)).includes(tag)
      )
      const rss = generateRss(config, filteredPosts, `tags/${tag}/${page}`)
      const rssPath = path.join(outputFolder, 'tags', tag)
      mkdirSync(rssPath, { recursive: true })
      writeFileSync(path.join(rssPath, page), rss)
    }
  }
}

const rss = async () => {
  const { allBlogs } = await import('../.contentlayer/generated/index.mjs')
  generateRSS(siteMetadata, allBlogs)
  console.log('RSS feed generated...')
}
export default rss
