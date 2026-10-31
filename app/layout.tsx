import 'css/tailwind.css'
import 'css/site.css'
import type { Metadata } from 'next'
import siteMetadata from '@/data/siteMetadata'
import SiteShell from '@/components/SiteShell'

export const metadata: Metadata = {
  metadataBase: new URL(siteMetadata.siteUrl),
  title: { default: siteMetadata.title, template: `%s | ${siteMetadata.title}` },
  description: siteMetadata.description,
  openGraph: {
    title: siteMetadata.title,
    description: siteMetadata.description,
    locale: 'zh_CN',
    type: 'website',
  },
  alternates: { types: { 'application/rss+xml': '/feed.xml' } },
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  )
}
