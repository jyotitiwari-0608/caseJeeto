import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, CalendarDays, IndianRupee, LayoutDashboard, MessageSquare, Settings, Star, UserRound, WalletCards, X } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChatWindow } from '@/components/chat-window'
import { DashboardShell, type DashboardLink } from '@/components/dashboard-shell'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/page-state'
import { useAuth } from '@/contexts/auth-context'
import { ApiError, api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { advocateFirstName, privateQueryKey } from '@/lib/session'

const links: DashboardLink[] = [
  { label: 'Overview', to: '/lawyer/dashboard', icon: LayoutDashboard },
  { label: 'Consultations', to: '/lawyer/dashboard/consultations', icon: CalendarDays },
  { label: 'Messages', to: '/lawyer/dashboard/messages', icon: MessageSquare },
  { label: 'Earnings', to: '/lawyer/dashboard/earnings', icon: WalletCards },
  { label: 'Reviews', to: '/lawyer/dashboard/reviews', icon: Star },
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
        <div className="border-y py-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Next consultation</p><CalendarDays className="mt-8 size-7 text-muted-foreground" /><p className="mt-4 font-medium">See the Consultations tab</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Your upcoming bookings, with the ability to mark a consultation complete or cancel it, now live under Consultations in the sidebar.</p><Link to="/lawyer/dashboard/consultations" className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}>Open consultations</Link></div>
      </div>
    </>
  )
}

const statusTabs = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
] as const

function LawyerConsultationsSection() {
  const { accessToken } = useAuth()
  const [status, setStatus] = useState<string>('')
  const queryClient = useQueryClient()
  const queryKey = ['lawyer-own-bookings', status]
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => api.getMyLawyerBookings(accessToken!, { status: status || undefined }, signal),
    enabled: Boolean(accessToken),
    retry: false,
  })

  const completeMutation = useMutation({
    mutationFn: (bookingId: string) => api.markBookingCompleted(bookingId, accessToken!),
    onSuccess: () => {
      toast.success('Consultation marked as completed')
      queryClient.invalidateQueries({ queryKey: ['lawyer-own-bookings'] })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Could not update this booking.'),
  })

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => api.cancelLawyerBooking(bookingId, accessToken!),
    onSuccess: () => {
      toast.success('Consultation cancelled')
      queryClient.invalidateQueries({ queryKey: ['lawyer-own-bookings'] })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Could not cancel this booking.'),
  })

  const bookings = query.data?.data.bookings || []
  const pendingActionId = completeMutation.isPending ? completeMutation.variables : cancelMutation.isPending ? cancelMutation.variables : null

  return (
    <div>
      <h1 className="font-heading text-3xl font-semibold">Consultations</h1>
      <p className="mt-2 text-muted-foreground">Bookings recorded against your advocate profile.</p>

      <div className="mt-6 flex flex-wrap gap-1.5">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatus(tab.value)}
            className={cn('rounded-full border px-3 py-1.5 text-xs font-medium transition-colors', status === tab.value ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {query.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : query.isError ? (
          <ErrorState title="Consultations unavailable" message="We could not load bookings from the CaseJeeto API." onRetry={() => void query.refetch()} />
        ) : bookings.length > 0 ? (
          <div className="divide-y border-y">
            {bookings.map((booking) => (
              <article key={booking._id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{booking.clientId.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(booking.scheduledAt))} · {booking.durationMinutes} minutes</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{booking.status}</Badge>
                  {booking.status === 'confirmed' && (
                    <Button size="sm" variant="outline" onClick={() => completeMutation.mutate(booking._id)} disabled={pendingActionId === booking._id}>
                      Mark completed
                    </Button>
                  )}
                  {['pending', 'confirmed'].includes(booking.status) && (
                    <Button size="sm" variant="destructive" onClick={() => cancelMutation.mutate(booking._id)} disabled={pendingActionId === booking._id}>
                      Cancel
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="border-y py-12 text-center">
            <CalendarDays className="mx-auto size-8 text-primary" />
            <p className="mt-4 font-medium">No consultations in this view</p>
            <p className="mt-1 text-sm text-muted-foreground">Bookings will appear here once clients request a slot.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function LawyerMessagesSection() {
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedConversationId = searchParams.get('conversation')
  const [activeId, setActiveId] = useState<string | null>(requestedConversationId)

  const conversationsQuery = useQuery({
    queryKey: ['lawyer-conversations'],
    queryFn: ({ signal }) => api.getLawyerConversations(accessToken!, signal),
    enabled: Boolean(accessToken),
    retry: false,
  })

  useEffect(() => {
    if (requestedConversationId) setActiveId(requestedConversationId)
  }, [requestedConversationId])

  useEffect(() => {
    if (!activeId && conversationsQuery.data?.conversations.length) {
      setActiveId(conversationsQuery.data.conversations[0]._id)
    }
  }, [activeId, conversationsQuery.data])

  const messagesQuery = useQuery({
    queryKey: ['lawyer-conversation-messages', activeId],
    queryFn: ({ signal }) => api.getLawyerConversationMessages(activeId!, accessToken!, signal),
    enabled: Boolean(accessToken && activeId),
    retry: false,
  })

  function selectConversation(id: string) {
    setActiveId(id)
    setSearchParams({ conversation: id })
  }

  async function markRead(conversationId: string) {
    if (!accessToken) return
    try {
      await api.markLawyerConversationRead(conversationId, accessToken)
      queryClient.invalidateQueries({ queryKey: ['lawyer-conversations'] })
    } catch {
      // Non-critical — the socket-side mark_read already clears it live for
      // the other participant; this just refreshes this list's badge sooner.
    }
  }

  const conversations = conversationsQuery.data?.conversations || []

  return (
    <div>
      <h1 className="font-heading text-3xl font-semibold">Messages</h1>
      <p className="mt-2 text-muted-foreground">Conversations clients have started with you.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[18rem_1fr]">
        <div className="rounded-xl border bg-card">
          {conversationsQuery.isLoading ? (
            <div className="space-y-2 p-3"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
          ) : conversationsQuery.isError ? (
            <p className="p-4 text-sm text-muted-foreground">Conversations could not be loaded.</p>
          ) : conversations.length > 0 ? (
            <div className="divide-y">
              {conversations.map((conversation) => (
                <button
                  key={conversation._id}
                  type="button"
                  onClick={() => selectConversation(conversation._id)}
                  className={cn('flex w-full items-start justify-between gap-2 px-4 py-3 text-left text-sm hover:bg-muted', activeId === conversation._id && 'bg-muted')}
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{conversation.client.name}</span>
                    <span className="line-clamp-1 block text-xs text-muted-foreground">{conversation.lastMessage?.text || 'No messages yet'}</span>
                  </span>
                  {conversation.unreadCount > 0 && <Badge className="shrink-0">{conversation.unreadCount}</Badge>}
                </button>
              ))}
            </div>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">No conversations yet. They'll appear here once a client messages you.</p>
          )}
        </div>

        <div>
          {!activeId ? (
            <div className="grid h-[32rem] place-items-center rounded-xl border bg-card text-sm text-muted-foreground">Select a conversation</div>
          ) : messagesQuery.isLoading ? (
            <Skeleton className="h-[32rem] w-full" />
          ) : messagesQuery.isError ? (
            <ErrorState title="Messages unavailable" message="This conversation's history could not be loaded." onRetry={() => void messagesQuery.refetch()} />
          ) : (
            <ChatWindow conversationId={activeId} initialMessages={messagesQuery.data?.messages || []} onJoined={() => void markRead(activeId)} />
          )}
        </div>
      </div>
    </div>
  )
}

function LawyerEarningsSection() {
  const { accessToken } = useAuth()
  const earningsQuery = useQuery({ queryKey: ['lawyer-earnings'], queryFn: ({ signal }) => api.getLawyerEarnings(accessToken!, signal), enabled: Boolean(accessToken), retry: false })
  const payoutsQuery = useQuery({ queryKey: ['lawyer-payouts'], queryFn: ({ signal }) => api.getPayoutHistory(accessToken!, {}, signal), enabled: Boolean(accessToken), retry: false })

  return (
    <div>
      <h1 className="font-heading text-3xl font-semibold">Earnings</h1>
      <p className="mt-2 text-muted-foreground">Payout totals recorded by the payment service. Figures are shown in rupees, converted from the stored paise values.</p>

      {earningsQuery.isLoading ? (
        <Skeleton className="mt-6 h-24 w-full" />
      ) : earningsQuery.isError ? (
        <div className="mt-6"><ErrorState title="Earnings unavailable" message="We could not load your earnings summary." onRetry={() => void earningsQuery.refetch()} /></div>
      ) : earningsQuery.data && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">All-time earned</p><p className="mt-1 font-heading text-xl font-semibold">₹{(earningsQuery.data.allTime.totalEarned / 100).toLocaleString('en-IN')}</p></div>
          <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Paid out</p><p className="mt-1 font-heading text-xl font-semibold">₹{(earningsQuery.data.allTime.totalPaidOut / 100).toLocaleString('en-IN')}</p></div>
          <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="mt-1 font-heading text-xl font-semibold">₹{(earningsQuery.data.allTime.totalPending / 100).toLocaleString('en-IN')}</p></div>
          <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">This month</p><p className="mt-1 font-heading text-xl font-semibold">₹{(earningsQuery.data.thisMonth.amount / 100).toLocaleString('en-IN')}</p></div>
        </div>
      )}

      <h2 className="mt-10 font-heading text-xl font-semibold">Payout history</h2>
      <div className="mt-4">
        {payoutsQuery.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : payoutsQuery.isError ? (
          <ErrorState title="Payout history unavailable" message="We could not load your payout history." onRetry={() => void payoutsQuery.refetch()} />
        ) : (payoutsQuery.data?.payments.length || 0) > 0 ? (
          <div className="divide-y border-y">
            {payoutsQuery.data!.payments.map((payout) => (
              <div key={payout._id} className="flex items-center justify-between py-3 text-sm">
                <span>
                  {payout.clientId && typeof payout.clientId === 'object' ? payout.clientId.name : 'Client'}
                  {payout.bookingId && typeof payout.bookingId === 'object' ? ` · ${new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(payout.bookingId.scheduledAt))}` : ''}
                </span>
                <span className="flex items-center gap-3">
                  <Badge variant="secondary">{payout.paymentStatus === 'refunded' ? 'refunded' : payout.payoutStatus}</Badge>
                  <strong>₹{payout.lawyerPayoutInRupees.toLocaleString('en-IN')}</strong>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="border-y py-8 text-center text-sm text-muted-foreground">No payouts recorded yet.</p>
        )}
      </div>
    </div>
  )
}

function LawyerReviewsSection() {
  const { accessToken } = useAuth()
  const query = useQuery({ queryKey: ['lawyer-my-reviews'], queryFn: ({ signal }) => api.getMyLawyerReviews(accessToken!, { limit: 30 }, signal), enabled: Boolean(accessToken), retry: false })

  return (
    <div>
      <h1 className="font-heading text-3xl font-semibold">Reviews</h1>
      <p className="mt-2 text-muted-foreground">Client feedback left after a completed consultation. You can view these but not edit or remove them.</p>
      <div className="mt-6">
        {query.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : query.isError ? (
          <ErrorState title="Reviews unavailable" message="We could not load your reviews." onRetry={() => void query.refetch()} />
        ) : (query.data?.reviews.length || 0) > 0 ? (
          <div className="divide-y border-y">
            {query.data!.reviews.map((review) => (
              <article key={review._id} className="py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{review.clientId.name}</p>
                  <span className="flex items-center gap-1 text-rating">
                    {Array.from({ length: 5 }, (_, index) => <Star key={index} className={cn('size-3.5', index < review.rating ? 'fill-current' : 'text-muted-foreground/30')} />)}
                  </span>
                </div>
                {review.comment && <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.comment}</p>}
                <p className="mt-2 text-xs text-muted-foreground">{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(review.createdAt))}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="border-y py-12 text-center">
            <Star className="mx-auto size-8 text-primary" />
            <p className="mt-4 font-medium">No reviews yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Reviews appear here once clients rate a completed consultation.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function LawyerAvailabilitySection() {
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [formError, setFormError] = useState('')

  const query = useQuery({ queryKey: ['lawyer-my-availability'], queryFn: ({ signal }) => api.getMyAvailability(accessToken!, {}, signal), enabled: Boolean(accessToken), retry: false })

  const addMutation = useMutation({
    mutationFn: () => {
      if (!date || !startTime || !endTime) throw new Error('Date, start time, and end time are all required.')
      const startIso = new Date(`${date}T${startTime}:00Z`).toISOString()
      const endIso = new Date(`${date}T${endTime}:00Z`).toISOString()
      return api.setMyAvailability({ date, slots: [{ startTime: startIso, endTime: endIso }] }, accessToken!)
    },
    onSuccess: () => {
      toast.success('Slot added to your availability')
      setStartTime('')
      setEndTime('')
      queryClient.invalidateQueries({ queryKey: ['lawyer-my-availability'] })
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not add this slot.'),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ availabilityId, slotId }: { availabilityId: string; slotId: string }) => api.deleteAvailabilitySlot(availabilityId, slotId, accessToken!),
    onSuccess: () => {
      toast.success('Slot removed')
      queryClient.invalidateQueries({ queryKey: ['lawyer-my-availability'] })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not remove this slot.'),
  })

  const days = query.data?.data.availability || []

  return (
    <div>
      <h1 className="font-heading text-3xl font-semibold">Availability</h1>
      <p className="mt-2 text-muted-foreground">Slots you add here appear to clients as open consultation times. Times are entered and stored in UTC.</p>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Add a slot</CardTitle></CardHeader>
        <CardContent>
          {formError && <Alert variant="destructive" className="mb-4"><AlertTitle>Could not add slot</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert>}
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
            <div className="grid gap-1.5"><Label htmlFor="avail-date">Date</Label><Input id="avail-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
            <div className="grid gap-1.5"><Label htmlFor="avail-start">Start (UTC)</Label><Input id="avail-start" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></div>
            <div className="grid gap-1.5"><Label htmlFor="avail-end">End (UTC)</Label><Input id="avail-end" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></div>
            <Button onClick={() => { setFormError(''); addMutation.mutate() }} disabled={addMutation.isPending}>{addMutation.isPending ? 'Adding…' : 'Add slot'}</Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8">
        {query.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : query.isError ? (
          <ErrorState title="Availability unavailable" message="We could not load your availability." onRetry={() => void query.refetch()} />
        ) : days.length > 0 ? (
          <div className="grid gap-4">
            {days.map((day) => (
              <div key={day._id} className="rounded-xl border bg-card p-4">
                <p className="text-sm font-semibold">{new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(day.date))}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {day.slots.map((slot) => (
                    <span key={slot._id} className={cn('inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs', slot.isBooked ? 'bg-muted text-muted-foreground' : 'bg-card')}>
                      {new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(slot.startTime))} – {new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(slot.endTime))}
                      {slot.isBooked ? (
                        <Badge variant="secondary">Booked</Badge>
                      ) : (
                        <button type="button" aria-label="Remove slot" onClick={() => deleteMutation.mutate({ availabilityId: day._id, slotId: slot._id })} className="text-muted-foreground hover:text-destructive">
                          <X className="size-3.5" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="border-y py-8 text-center text-sm text-muted-foreground">No availability set yet. Add a slot above to start accepting bookings.</p>
        )}
      </div>
    </div>
  )
}

function LawyerSectionForPath() {
  const { pathname } = useLocation()
  if (pathname === '/lawyer/dashboard/consultations') return <LawyerConsultationsSection />
  if (pathname === '/lawyer/dashboard/messages') return <LawyerMessagesSection />
  if (pathname === '/lawyer/dashboard/earnings') return <LawyerEarningsSection />
  if (pathname === '/lawyer/dashboard/reviews') return <LawyerReviewsSection />
  if (pathname === '/lawyer/dashboard/settings') return <LawyerAvailabilitySection />
  if (pathname === '/lawyer/dashboard') return <LawyerOverview />
  return <UnconnectedLawyerSection icon={BadgeCheck} title="Advocate page not found" body="This nested advocate route does not exist." />
}

export function LawyerDashboardPage() {
  return <DashboardShell eyebrow="Advocate account" title="Advocate desk" links={links}><LawyerSectionForPath /></DashboardShell>
}
// import { useQuery } from '@tanstack/react-query'
// import { BadgeCheck, CalendarDays, IndianRupee, LayoutDashboard, MessageSquare, Settings, Star, UserRound, WalletCards } from 'lucide-react'
// import { Link, useLocation } from 'react-router-dom'
// import { DashboardShell, type DashboardLink } from '@/components/dashboard-shell'
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
// import { Badge } from '@/components/ui/badge'
// import { buttonVariants } from '@/components/ui/button'
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { Skeleton } from '@/components/ui/skeleton'
// import { useAuth } from '@/contexts/auth-context'
// import { api } from '@/lib/api'
// import { cn } from '@/lib/utils'
// import { privateQueryKey } from '@/lib/session'

// const links: DashboardLink[] = [
//   { label: 'Overview', to: '/lawyer/dashboard', icon: LayoutDashboard },
//   { label: 'Consultations', to: '/lawyer/dashboard/consultations', icon: CalendarDays },
//   { label: 'Messages', to: '/lawyer/dashboard/messages', icon: MessageSquare },
//   { label: 'Earnings', to: '/lawyer/dashboard/earnings', icon: WalletCards },
//   { label: 'Profile', to: '/lawyer/onboarding', icon: UserRound },
//   { label: 'Settings', to: '/lawyer/dashboard/settings', icon: Settings },
// ]

// function UnconnectedLawyerSection({ title, body, icon: Icon }: { title: string; body: string; icon: React.ComponentType<{ className?: string }> }) {
//   return <div className="border-y py-14 text-center"><Icon className="mx-auto size-8 text-primary" /><h2 className="mt-4 font-heading text-2xl font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{body} This service is not connected in the current frontend, so this is not an empty-data result.</p><Link to="/lawyer/onboarding" className={cn(buttonVariants({ variant: 'outline' }), 'mt-6')}>Initial profile setup</Link></div>
// }

// function LawyerOverview() {
//   const { user, accessToken } = useAuth()
//   const query = useQuery({ queryKey: privateQueryKey('lawyer-dashboard', user!.id), queryFn: ({ signal }) => api.getLawyerDashboard(accessToken!, signal), enabled: Boolean(user && accessToken), retry: false })
//   const summary = query.data
//   const stats = [
//     { label: 'Upcoming', value: summary ? summary.upcomingBookings : '—', icon: CalendarDays, note: 'consultations' },
//     { label: 'This month', value: summary ? `₹${(summary.earningsThisMonth / 100).toLocaleString('en-IN')}` : '—', icon: IndianRupee, note: 'net earnings' },
//     { label: 'Client rating', value: summary?.rating ? summary.rating.toFixed(1) : '—', icon: Star, note: `${summary?.reviewCount ?? 0} reviews` },
//     { label: 'Unread', value: summary ? summary.unreadMessages : '—', icon: MessageSquare, note: 'messages' },
//   ]
//   return (
//     <>
//       <div className="flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-primary">Advocate desk</p><h1 className="mt-2 font-heading text-3xl font-semibold">Welcome, {user?.name.split(' ')[0]}.</h1><p className="mt-2 text-sm text-muted-foreground">A compact view of your visibility, client conversations, and practice activity.</p></div><Link to="/lawyer/onboarding" className={buttonVariants({ variant: 'outline' })}>Initial profile setup</Link></div>
//       {query.isError && <Alert className="mt-6"><BadgeCheck /><AlertTitle>Live practice data is unavailable</AlertTitle><AlertDescription>Your workspace remains usable, but dashboard totals require the CaseJeeto API.</AlertDescription></Alert>}
//       <div className="grid grid-cols-2 border-b py-7 xl:grid-cols-4">{stats.map(({ label, value, icon: Icon, note }, index) => <div key={label} className={cn('px-3 py-4 sm:px-5', index % 2 === 1 && 'border-l', index >= 2 && 'border-t xl:border-t-0', index > 0 && 'xl:border-l')}><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><Icon className="size-4 text-primary" /></div>{query.isLoading ? <Skeleton className="mt-4 h-8 w-20" /> : <p className="mt-3 font-heading text-3xl font-semibold">{value}</p>}<p className="mt-1 text-xs text-muted-foreground">{note}</p></div>)}</div>
//       <div className="grid gap-6 pt-7 lg:grid-cols-[1.15fr_.85fr]">
//         <Card><CardHeader><CardTitle>Practice readiness</CardTitle></CardHeader><CardContent className="space-y-5"><div className="flex items-start justify-between gap-4"><div><p className="font-medium">Verification</p><p className="mt-1 text-sm text-muted-foreground">Complete identity and professional checks before going live.</p></div><Badge variant={summary?.verificationStatus === 'approved' ? 'default' : 'secondary'}>{summary?.verificationStatus || 'Unavailable'}</Badge></div><div className="border-t pt-5"><p className="font-medium">Directory visibility</p><p className="mt-1 text-sm text-muted-foreground">{summary ? (summary.isProfileVisible ? 'Your approved profile is visible to prospective clients.' : 'Your profile is currently private while setup or verification is completed.') : 'Visibility could not be loaded from the API.'}</p></div><Link to="/lawyer/onboarding" className={cn(buttonVariants({ variant: 'outline' }), 'mt-2')}>Initial profile setup</Link></CardContent></Card>
//         <div className="border-y py-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Next consultation</p><CalendarDays className="mt-8 size-7 text-muted-foreground" /><p className="mt-4 font-medium">Booking detail unavailable</p><p className="mt-1 text-sm leading-6 text-muted-foreground">The dashboard summary reports counts only. The next-booking endpoint is not connected here, so no schedule claim is made.</p></div>
//       </div>
//     </>
//   )
// }

// function LawyerSectionForPath() {
//   const { pathname } = useLocation()
//   if (pathname === '/lawyer/dashboard/consultations') return <UnconnectedLawyerSection icon={CalendarDays} title="Consultations not connected" body="The advocate booking endpoint still needs a frontend integration." />
//   if (pathname === '/lawyer/dashboard/messages') return <UnconnectedLawyerSection icon={MessageSquare} title="Chat not connected" body="Client conversation data is not loaded here yet." />
//   if (pathname === '/lawyer/dashboard/earnings') return <UnconnectedLawyerSection icon={WalletCards} title="Payouts and refunds not connected" body="Earnings, payout, and refund controls are not loaded here yet." />
//   if (pathname === '/lawyer/dashboard/settings') return <UnconnectedLawyerSection icon={Settings} title="Practice controls not connected" body="Availability, visibility, and notification preferences are not loaded here yet." />
//   if (pathname === '/lawyer/dashboard') return <LawyerOverview />
//   return <UnconnectedLawyerSection icon={BadgeCheck} title="Advocate page not found" body="This nested advocate route does not exist." />
// }

// export function LawyerDashboardPage() {
//   return <DashboardShell eyebrow="Advocate account" title="Advocate desk" links={links}><LawyerSectionForPath /></DashboardShell>
// }
