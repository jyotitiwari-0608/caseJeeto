import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { shouldResetScroll } from '@/lib/navigation'

export function SiteLayout({ children }: { children: React.ReactNode }) {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (shouldResetScroll(hash)) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname, hash])

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform duration-[var(--motion-fast)] ease-[var(--ease-out)] focus:translate-y-0"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">{children}</main>
      <SiteFooter />
    </div>
  )
}
