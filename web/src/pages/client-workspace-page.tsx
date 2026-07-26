import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Bookmark, CalendarDays, FolderOpen, LayoutDashboard, MessageSquare, Search, Settings, ShieldCheck, Star } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { DashboardShell, type DashboardLink } from '@/components/dashboard-shell'
import { ErrorState } from '@/components/page-state'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { privateQueryKey } from '@/lib/session'

const links: DashboardLink[] = [
  { label: 'Overview', to: '/workspace', icon: LayoutDashboard },
  { label: 'My matters', to: '/workspace/cases', icon: FolderOpen },
  { label: 'Consultations', to: '/workspace/consultations', icon: CalendarDays },
  { label: 'Saved lawyers', to: '/workspace/saved', icon: Bookmark },
  { label: 'Messages', to: '/workspace/messages', icon: MessageSquare },
  { label: 'Settings', to: '/workspace/settings', icon: Settings },
]

function EmptyWorkspaceSection({ icon: Icon, title, body, action, to }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string; action: string; to: string }) {
  return (
    <div className="border-y py-14 text-center">
      <Icon className="mx-auto size-8 text-primary" />
      <h2 className="mt-4 font-heading text-2xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{body}</p>
      <Link to={to} className={cn(buttonVariants(), 'mt-6 gap-2')}>{action} <ArrowRight /></Link>
    </div>
  )
}

function Overview() {
  const { user, accessToken } = useAuth()
  const bookings = useQuery({
    queryKey: privateQueryKey('client-bookings', user!.id),
    queryFn: ({ signal }) => api.getClientBookings(accessToken!, signal),
    enabled: Boolean(user && accessToken),
    retry: false,
  })
  const upcoming = bookings.data?.data.bookings.filter((booking) => ['pending', 'confirmed'].includes(booking.status)).slice(0, 3) || []
  return (
    <>
      <div className="flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-semibold text-primary">Client workspace</p><h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">Good to see you, {user?.name.split(' ')[0]}.</h1><p className="mt-2 text-sm text-muted-foreground">Keep your matters, consultations, and next steps in one place.</p></div>
        <Link to="/lawyers" className={cn(buttonVariants(), 'h-10 gap-2')}><Search /> Find a lawyer</Link>
      </div>
      <div className="grid gap-4 py-7 md:grid-cols-[1.15fr_.85fr]">
        <Card className="border-primary/20 bg-primary text-primary-foreground">
          <CardHeader><Badge variant="secondary" className="mb-3">Start here</Badge><CardTitle className="text-2xl">Turn a legal concern into a clear brief.</CardTitle></CardHeader>
          <CardContent><p className="max-w-xl text-sm leading-6 text-primary-foreground/75">Shortlist advocates based on the facts, then prepare the essential context before your first conversation.</p><Link to="/lawyers" className={cn(buttonVariants({ variant: 'secondary' }), 'mt-6 gap-2')}>Explore advocates <ArrowRight /></Link></CardContent>
        </Card>
        <div className="border-y py-5 md:px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Account readiness</p>
          <div className="mt-5 grid gap-4 text-sm">
            <p className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-primary text-xs text-primary-foreground">1</span> Find an advocate for your legal need</p>
            <p className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full border">2</span> Request a consultation slot</p>
            <p className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full border">3</span> Organise your documents and questions</p>
          </div>
        </div>
      </div>
      <section className="pt-3"><div className="flex items-center justify-between"><div><h2 className="font-heading text-xl font-semibold">Upcoming consultations</h2><p className="mt-1 text-sm text-muted-foreground">Booking data from your private CaseJeeto account.</p></div><Link to="/workspace/consultations" className={buttonVariants({ variant: 'ghost' })}>View all</Link></div><div className="mt-5">{bookings.isLoading ? <Skeleton className="h-24 w-full" /> : bookings.isError ? <ErrorState title="Consultations unavailable" message="We could not load your private bookings. Your session will be cleared automatically if the server rejects it." onRetry={() => void bookings.refetch()} /> : upcoming.length > 0 ? <BookingList bookings={upcoming} /> : <div className="border-y py-8 text-center"><CalendarDays className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 text-sm font-medium">No consultations scheduled</p><p className="mt-1 text-xs text-muted-foreground">A real confirmed booking will appear here after the booking service records it.</p></div>}</div></section>
    </>
  )
}

function BookingList({ bookings }: { bookings: import('@/types/api').Booking[] }) {
  return <div className="divide-y border-y">{bookings.map((booking) => <article key={booking._id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{booking.lawyerId.specialization.join(', ') || 'Legal consultation'}</p><p className="mt-1 text-sm text-muted-foreground">{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(booking.scheduledAt))} · {booking.durationMinutes} minutes</p></div><div className="flex items-center gap-3"><Badge variant="secondary">{booking.status}</Badge><span className="text-sm font-medium">₹{booking.lawyerId.consultationFee.toLocaleString('en-IN')}</span></div></article>)}</div>
}

function ConsultationsSection() {
  const { user, accessToken } = useAuth()
  const query = useQuery({ queryKey: privateQueryKey('client-bookings', user!.id), queryFn: ({ signal }) => api.getClientBookings(accessToken!, signal), enabled: Boolean(user && accessToken), retry: false })
  if (query.isLoading) return <div><h1 className="font-heading text-3xl font-semibold">Consultations</h1><Skeleton className="mt-7 h-40 w-full" /></div>
  if (query.isError) return <ErrorState title="Consultations unavailable" message="We could not load bookings from the CaseJeeto API." onRetry={() => void query.refetch()} />
  const bookings = query.data?.data.bookings || []
  return <div><h1 className="font-heading text-3xl font-semibold">Consultations</h1><p className="mt-2 text-muted-foreground">Appointments recorded by the booking service.</p>{bookings.length > 0 ? <div className="mt-7"><BookingList bookings={bookings} /></div> : <EmptyWorkspaceSection icon={CalendarDays} title="Your consultation diary is clear" body="No bookings are recorded for this account." action="Browse lawyers" to="/lawyers" />}</div>
}

function SavedLawyersSection() {
  const { user, accessToken } = useAuth()
  const query = useQuery({ queryKey: privateQueryKey('client-saved-lawyers', user!.id), queryFn: ({ signal }) => api.getSavedLawyers(accessToken!, signal), enabled: Boolean(user && accessToken), retry: false })
  if (query.isLoading) return <div><h1 className="font-heading text-3xl font-semibold">Saved lawyers</h1><Skeleton className="mt-7 h-40 w-full" /></div>
  if (query.isError) return <ErrorState title="Saved lawyers unavailable" message="We could not load your private shortlist from the CaseJeeto API." onRetry={() => void query.refetch()} />
  const lawyers = query.data?.data.savedLawyers || []
  return <div><h1 className="font-heading text-3xl font-semibold">Saved lawyers</h1><p className="mt-2 text-muted-foreground">Your private shortlist, loaded from your client account.</p>{lawyers.length > 0 ? <div className="mt-7 divide-y border-y">{lawyers.map((lawyer) => <article key={lawyer._id} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><h2 className="font-heading text-lg font-semibold">{lawyer.user.name}</h2>{!lawyer.isAvailable && <Badge variant="secondary">Currently unavailable</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">{lawyer.specialization.join(', ') || 'Practice areas not listed'}</p></div><div className="flex items-center gap-4"><span className="flex items-center gap-1 text-sm"><Star className="size-4 text-primary" /> {lawyer.rating.toFixed(1)}</span><span className="text-sm font-medium">₹{lawyer.consultationFee.toLocaleString('en-IN')}</span><Link to={`/lawyers/${lawyer._id}`} className={buttonVariants({ variant: 'outline' })}>View</Link></div></article>)}</div> : <EmptyWorkspaceSection icon={Bookmark} title="Build a thoughtful shortlist" body="No lawyers are saved for this account yet." action="Start comparing" to="/lawyers" />}</div>
}

function UnconnectedSection({ title, service, icon: Icon }: { title: string; service: string; icon: React.ComponentType<{ className?: string }> }) {
  return <div><h1 className="font-heading text-3xl font-semibold">{title}</h1><div className="mt-7 border-y py-12 text-center"><Icon className="mx-auto size-8 text-primary" /><h2 className="mt-4 font-heading text-xl font-semibold">Not connected yet</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{service} is not wired into this frontend. This is an unavailable feature state, not an empty account result.</p></div></div>
}

function SectionForPath() {
  const { pathname } = useLocation()
  if (pathname === '/workspace/cases') return <UnconnectedSection icon={FolderOpen} title="My matters" service="Matter folders" />
  if (pathname === '/workspace/consultations') return <ConsultationsSection />
  if (pathname === '/workspace/saved') return <SavedLawyersSection />
  if (pathname === '/workspace/messages') return <UnconnectedSection icon={MessageSquare} title="Messages" service="Client chat" />
  if (pathname === '/workspace/settings') return <div><h1 className="font-heading text-3xl font-semibold">Account settings</h1><p className="mt-2 text-muted-foreground">Profile and privacy controls will be available as the account service expands.</p><Card className="mt-7"><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> Privacy by default</CardTitle></CardHeader><CardContent className="space-y-3 text-sm leading-6 text-muted-foreground"><p>CaseJeeto separates public lawyer information from private client activity.</p><p>Chat, review submission, and refund controls are not yet connected in this frontend.</p></CardContent></Card></div>
  if (pathname === '/workspace') return <Overview />
  return <UnconnectedSection icon={ShieldCheck} title="Workspace page not found" service="This nested workspace route" />
}

export function ClientWorkspacePage() {
  return <DashboardShell eyebrow="Client account" title="Client workspace" links={links}><SectionForPath /></DashboardShell>
}
