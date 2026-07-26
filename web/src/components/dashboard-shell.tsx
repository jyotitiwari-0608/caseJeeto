import { LogOut, Scale } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

export interface DashboardLink { label: string; to: string; icon: React.ComponentType<{ className?: string }> }

export function DashboardShell({ eyebrow, title, links, children }: { eyebrow: string; title: string; links: DashboardLink[]; children: React.ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className="bg-muted/25">
      <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="hidden border-r bg-card px-4 py-7 lg:block">
          <div className="px-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p><p className="mt-2 truncate font-heading text-lg font-semibold">{user?.name}</p></div>
          <nav className="mt-7 grid gap-1" aria-label={`${title} navigation`}>
            {links.map(({ label, to, icon: Icon }) => <NavLink key={to} end={to.split('/').filter(Boolean).length <= 2} to={to} className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground', isActive && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground')}><Icon className="size-4" /> {label}</NavLink>)}
          </nav>
          <div className="mt-8 border-t pt-5"><Link to="/" className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground"><Scale className="size-4" /> Back to CaseJeeto</Link><Button variant="ghost" className="mt-1 w-full justify-start text-muted-foreground" onClick={logout}><LogOut /> Log out</Button></div>
        </aside>
        <section className="min-w-0">
          <div className="overflow-x-auto border-b bg-card px-4 lg:hidden"><nav className="flex min-w-max gap-1 py-2" aria-label={`${title} mobile navigation`}>{links.map(({ label, to, icon: Icon }) => <NavLink key={to} end={to.split('/').filter(Boolean).length <= 2} to={to} className={({ isActive }) => cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground', isActive && 'bg-primary text-primary-foreground')}><Icon className="size-4" />{label}</NavLink>)}</nav></div>
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </section>
      </div>
    </div>
  )
}
