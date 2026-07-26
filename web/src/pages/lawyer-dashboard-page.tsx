import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, CalendarDays, IndianRupee, LayoutDashboard, MessageSquare, Settings, Star, UserRound, WalletCards } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { DashboardShell, type DashboardLink } from '@/components/dashboard-shell'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { advocateFirstName, privateQueryKey } from '@/lib/session'

const links: DashboardLink[] = [
  { label: 'Overview', to: '/lawyer/dashboard', icon: LayoutDashboard },
  { label: 'Consultations', to: '/lawyer/dashboard/consultations', icon: CalendarDays },
  { label: 'Messages', to: '/lawyer/dashboard/messages', icon: MessageSquare },
  { label: 'Earnings', to: '/lawyer/dashboard/earnings', icon: WalletCards },
  { label: 'Profile', to: '/lawyer/profile', icon: UserRound },
  { label: 'Settings', to: '/lawyer/dashboard/settings', icon: Settings },
]

function UnconnectedLawyerSection({ title, body, icon: Icon }: { title: string; body: string; icon: React.ComponentType<{ className?: string }> }) {
  return <div className="border-y py-14 text-center"><Icon className="mx-auto size-8 text-primary" /><h2 className="mt-4 font-heading text-2xl font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{body} This service is not connected in the current frontend, so this is not an empty-data result.</p><Link to="/lawyer/profile" className={cn(buttonVariants({ variant: 'outline' }), 'mt-6')}>Edit profile</Link></div>
}

function LawyerOverview() {
  const { user, accessToken } = useAuth()
  const query = useQuery({ queryKey: privateQueryKey('lawyer-dashboard', user!.id), queryFn: ({ signal }) => api.getLawyerDashboard(accessToken!, signal), enabled: Boolean(user && accessToken), retry: false })
  const summary = query.data
  const stats = [
    { label: 'Upcoming', value: summary ? summary.upcomingBookings : '—', icon: CalendarDays, note: 'consultations' },
    { label: 'This month', value: summary ? `₹${(summary.earningsThisMonth / 100).toLocaleString('en-IN')}` : '—', icon: IndianRupee, note: 'net earnings' },
    { label: 'Client rating', value: summary?.rating ? summary.rating.toFixed(1) : '—', icon: Star, note: `${summary?.reviewCount ?? 0} reviews` },
    { label: 'Unread', value: summary ? summary.unreadMessages : '—', icon: MessageSquare, note: 'messages' },
  ]
  return (
    <>
      <div className="flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-primary">Advocate desk</p><h1 className="mt-2 font-heading text-3xl font-semibold">Welcome, {advocateFirstName(user?.name || '')}.</h1><p className="mt-2 text-sm text-muted-foreground">A compact view of your visibility, client conversations, and practice activity.</p></div><Link to="/lawyer/profile" className={buttonVariants({ variant: 'outline' })}>Edit profile</Link></div>
      {query.isError && <Alert className="mt-6"><BadgeCheck /><AlertTitle>Live practice data is unavailable</AlertTitle><AlertDescription>Your workspace remains usable, but dashboard totals require the CaseJeeto API.</AlertDescription></Alert>}
      <div className="grid grid-cols-2 border-b py-7 xl:grid-cols-4">{stats.map(({ label, value, icon: Icon, note }, index) => <div key={label} className={cn('px-3 py-4 sm:px-5', index % 2 === 1 && 'border-l', index >= 2 && 'border-t xl:border-t-0', index > 0 && 'xl:border-l')}><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><Icon className="size-4 text-primary" /></div>{query.isLoading ? <Skeleton className="mt-4 h-8 w-20" /> : <p className="mt-3 font-heading text-3xl font-semibold">{value}</p>}<p className="mt-1 text-xs text-muted-foreground">{note}</p></div>)}</div>
      <div className="grid gap-6 pt-7 lg:grid-cols-[1.15fr_.85fr]">
        <Card><CardHeader><CardTitle>Practice readiness</CardTitle></CardHeader><CardContent className="space-y-5"><div className="flex items-start justify-between gap-4"><div><p className="font-medium">Verification</p><p className="mt-1 text-sm text-muted-foreground">Complete identity and professional checks before going live.</p></div><Badge variant={summary?.verificationStatus === 'approved' ? 'default' : 'secondary'}>{summary?.verificationStatus || 'Unavailable'}</Badge></div><div className="border-t pt-5"><p className="font-medium">Directory visibility</p><p className="mt-1 text-sm text-muted-foreground">{summary ? (summary.isProfileVisible ? 'Your approved profile is visible to prospective clients.' : 'Your profile is currently private while setup or verification is completed.') : 'Visibility could not be loaded from the API.'}</p></div><Link to="/lawyer/profile" className={cn(buttonVariants({ variant: 'outline' }), 'mt-2')}>Edit profile</Link></CardContent></Card>
        <div className="border-y py-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Next consultation</p><CalendarDays className="mt-8 size-7 text-muted-foreground" /><p className="mt-4 font-medium">Booking detail unavailable</p><p className="mt-1 text-sm leading-6 text-muted-foreground">The dashboard summary reports counts only. The next-booking endpoint is not connected here, so no schedule claim is made.</p></div>
      </div>
    </>
  )
}

function LawyerSectionForPath() {
  const { pathname } = useLocation()
  if (pathname === '/lawyer/dashboard/consultations') return <UnconnectedLawyerSection icon={CalendarDays} title="Consultations not connected" body="The advocate booking endpoint still needs a frontend integration." />
  if (pathname === '/lawyer/dashboard/messages') return <UnconnectedLawyerSection icon={MessageSquare} title="Chat not connected" body="Client conversation data is not loaded here yet." />
  if (pathname === '/lawyer/dashboard/earnings') return <UnconnectedLawyerSection icon={WalletCards} title="Payouts and refunds not connected" body="Earnings, payout, and refund controls are not loaded here yet." />
  if (pathname === '/lawyer/dashboard/settings') return <UnconnectedLawyerSection icon={Settings} title="Practice controls not connected" body="Availability, visibility, and notification preferences are not loaded here yet." />
  if (pathname === '/lawyer/dashboard') return <LawyerOverview />
  return <UnconnectedLawyerSection icon={BadgeCheck} title="Advocate page not found" body="This nested advocate route does not exist." />
}

export function LawyerDashboardPage() {
  return <DashboardShell eyebrow="Advocate account" title="Advocate desk" links={links}><LawyerSectionForPath /></DashboardShell>
}
