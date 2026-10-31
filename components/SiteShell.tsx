'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import headerNavLinks from '@/data/headerNavLinks'

export default function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const home = pathname === '/'
  return (
    <div className={`site-shell ${home ? 'home-shell' : 'reading-shell'}`}>
      <a className="skip-link" href="#main-content">
        跳转到正文
      </a>
      <header className="site-header wrap">
        <Link className="wordmark" href="/" aria-label="Gotit-zhx，返回首页">
          <span className="brand-mark">z.</span>
          <span>
            ZHANG <span className="wordmark-muted">/ 宏鑫</span>
          </span>
        </Link>
        <nav aria-label="主导航">
          {headerNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={
                pathname.startsWith(link.href) && !link.href.includes('#') ? 'page' : undefined
              }
            >
              {link.title}
            </Link>
          ))}
        </nav>
      </header>
      <main id="main-content">{children}</main>
      <footer className="site-footer wrap">
        <span>© {new Date().getFullYear()} Gotit-zhx</span>
        <span>BUILD, LEARN, REPEAT.</span>
        <a
          href="https://github.com/timlrx/tailwind-nextjs-starter-blog"
          target="_blank"
          rel="noreferrer"
        >
          基于 Tailwind Nextjs Starter Blog ↗
        </a>
      </footer>
    </div>
  )
}
