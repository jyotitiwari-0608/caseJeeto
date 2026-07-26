import { useState, type MouseEvent } from 'react'
import { LogOut, Menu, Scale, UserRound } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { accountDestination } from '@/lib/session'
import { isUnmodifiedPrimaryActivation, scrollRepeatedHashDestination } from '@/lib/navigation'

const publicLinks = [
  { label: 'Find a lawyer', to: '/lawyers' },
  { label: 'How it works', to: '/#how-it-works', section: true },
  { label: 'For advocates', to: '/register?role=lawyer' },
]

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link to="/" onClick={onClick} className="pressable group inline-flex items-center gap-2.5" aria-label="CaseJeeto home">
      <span className="brand-mark grid size-9 place-items-center rounded-[0.65rem] bg-primary text-primary-foreground shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--primary-foreground)_12%,transparent)]">
        <Scale className="size-[18px]" aria-hidden="true" />
      </span>
      <span className="font-heading text-xl font-bold tracking-[-0.04em] text-primary">CaseJeeto</span>
    </Link>
  )
}

export function SiteHeader() {
  const { user, logout } = useAuth()
  const { pathname, hash } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const dashboardPath = user ? accountDestination(user.role) : '/login'

  function handleSectionLink(event: MouseEvent<HTMLAnchorElement>, destination: string) {
    if (!isUnmodifiedPrimaryActivation(event)) return
    if (scrollRepeatedHashDestination(pathname, hash, destination)) event.preventDefault()
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
        <Brand />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {publicLinks.map((item) => item.section ? (
            <Link key={item.label} to={item.to} onClick={(event) => handleSectionLink(event, item.to)} className="nav-link pressable px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">{item.label}</Link>
          ) : (
            <NavLink key={item.label} to={item.to} className={({ isActive }) => cn('nav-link pressable px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground', isActive && item.to === '/lawyers' && 'text-foreground')}>{item.label}</NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Link to={dashboardPath} className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'gap-2')}>
              <UserRound aria-hidden="true" />
              {user.name.split(' ')[0]}'s workspace
            </Link>
          ) : (
            <>
              <Link to="/login" className={buttonVariants({ variant: 'ghost', size: 'lg' })}>Log in</Link>
              <Link to="/register" className={cn(buttonVariants({ size: 'lg' }), 'h-10 bg-seal px-4 text-seal-foreground hover:bg-seal/90')}>Get legal help</Link>
            </>
          )}
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger render={<Button variant="outline" size="icon" className="md:hidden" aria-label="Open navigation" />}>
            <Menu aria-hidden="true" />
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(22rem,90vw)]">
            <SheetHeader className="border-b">
              <SheetTitle><Brand onClick={() => setMobileOpen(false)} /></SheetTitle>
              <SheetDescription className="text-left">Compare advocate profiles and take a clearer next step.</SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4" aria-label="Mobile navigation">
              {publicLinks.map((item) => (
                <Link key={item.label} to={item.to} onClick={(event) => { if (item.section) handleSectionLink(event, item.to); setMobileOpen(false) }} className="pressable rounded-lg px-3 py-3 text-base font-medium hover:bg-muted">
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto grid gap-2 border-t p-4">
              {user ? (
                <>
                  <Link to={dashboardPath} onClick={() => setMobileOpen(false)} className={buttonVariants({ size: 'lg' })}>Open workspace</Link>
                  <Button variant="outline" size="lg" onClick={() => { setMobileOpen(false); logout() }}><LogOut /> Log out</Button>
                </>
              ) : (
                <>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className={buttonVariants({ size: 'lg' })}>Get legal help</Link>
                  <Link to="/login" onClick={() => setMobileOpen(false)} className={buttonVariants({ variant: 'outline', size: 'lg' })}>Log in</Link>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
