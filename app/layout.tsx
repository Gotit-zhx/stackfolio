import 'css/tailwind.css'
import 'css/site.css'
import type { Metadata } from 'next'
import siteMetadata from '@/data/siteMetadata'
import SiteShell from '@/components/SiteShell'
import { ThemeProviders } from './theme-providers'

export const metadata: Metadata = {
  metadataBase: new URL(siteMetadata.siteUrl),
  title: { default: siteMetadata.title, template: `%s | ${siteMetadata.title}` },
  description: siteMetadata.description,
  icons: { icon: '/gotit-mark.svg' },
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
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProviders>
          <SiteShell>{children}</SiteShell>
        </ThemeProviders>
      </body>
    </html>
  )
}
