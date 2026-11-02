'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Github from '@/components/GitHubIcon'
import { useEffect, useState } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { ArrowUpRight, Mail, Menu, Moon, Sun, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTheme } from 'next-themes'
import headerNavLinks from '@/data/headerNavLinks'
import siteMetadata from '@/data/siteMetadata'
import VisitorNotice from '@/components/VisitorNotice'

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      aria-label="切换浅色或深色模式"
      title="切换浅色或深色模式"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      <Sun className="theme-sun" size={17} strokeWidth={1.8} />
      <Moon className="theme-moon" size={17} strokeWidth={1.8} />
    </button>
  )
}

function MobileNavigation({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className="icon-button mobile-menu-button"
        aria-label="打开导航菜单"
        aria-expanded={open}
        aria-controls="mobile-navigation"
        onClick={() => setOpen(true)}
      >
        <Menu size={20} strokeWidth={1.8} />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} className="mobile-dialog">
        <DialogBackdrop className="mobile-nav-backdrop" />
        <div className="mobile-nav-position">
          <DialogPanel className="mobile-nav-panel" id="mobile-navigation">
            <div className="mobile-nav-head">
              <DialogTitle className="mobile-nav-label">GOTIT-ZHX / MENU</DialogTitle>
              <button
                type="button"
                className="icon-button"
                aria-label="关闭导航菜单"
                onClick={() => setOpen(false)}
              >
                <X size={20} strokeWidth={1.8} />
              </button>
            </div>
            <nav className="mobile-nav-links">
              {headerNavLinks.map((link, index) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={
                    pathname.startsWith(link.href) && !link.href.includes('#') ? 'page' : undefined
                  }
                >
                  <span>0{index + 1}</span>
                  {link.title}
                  <ArrowUpRight size={18} strokeWidth={1.6} />
                </Link>
              ))}
            </nav>
            <div className="mobile-nav-foot">
              <a href={siteMetadata.github} target="_blank" rel="noreferrer">
                <Github size={16} /> GitHub
              </a>
              <a href={`mailto:${siteMetadata.email}`}>
                <Mail size={16} /> 邮箱
              </a>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}

export default function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const home = pathname === '/'
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
            observer.unobserve(entry.target)
          }
      },
      { threshold: 0.08 }
    )
    const elements = document.querySelectorAll(
      '.section-heading, .practice-list > div, .note-row, .detail-gallery, .detail-contributions'
    )
    elements.forEach((element) => {
      if (element.getBoundingClientRect().top > window.innerHeight) {
        element.classList.add('reveal-on-scroll')
        observer.observe(element)
      }
    })
    return () => {
      observer.disconnect()
      elements.forEach((element) => element.classList.remove('reveal-on-scroll'))
    }
  }, [pathname])
  useEffect(() => {
    if (localStorage.getItem('gotit-zhx-visitor-consent') !== 'yes') return
    const body = JSON.stringify({ path: pathname })
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/visitor-consent/', new Blob([body], { type: 'application/json' }))
    } else {
      void fetch('/api/visitor-consent/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      })
    }
  }, [pathname])
  return (
    <div className={`site-shell ${home ? 'home-shell' : 'reading-shell'}`}>
      <a className="skip-link" href="#main-content">
        跳转到正文
      </a>
      <header className="site-header wrap">
        <Link className="wordmark" href="/" aria-label="Gotit-zhx，返回首页">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none">
              <path
                d="M26 11H15a5 5 0 0 0-5 5v9a5 5 0 0 0 5 5h11V20h-8"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="m33 11-5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span>
            GOTIT <span className="wordmark-muted">/ ZHX</span>
          </span>
        </Link>
        <div className="header-tools">
          <nav aria-label="主导航" className="desktop-nav">
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
          <ThemeToggle />
          <MobileNavigation pathname={pathname} />
        </div>
      </header>
      <main id="main-content">{children}</main>
      <VisitorNotice />
      <footer className="site-footer wrap">
        <span>© {new Date().getFullYear()} Gotit-zhx</span>
        <span>BUILD, LEARN, REPEAT.</span>
        <a href={siteMetadata.github} target="_blank" rel="noreferrer">
          GitHub / Gotit-zhx ↗
        </a>
      </footer>
    </div>
  )
}
