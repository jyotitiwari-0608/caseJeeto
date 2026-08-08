import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Bookmark, CalendarDays, FolderOpen, LayoutDashboard, MessageSquare, ReceiptText, Search, Settings, ShieldCheck, Star } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChatWindow } from '@/components/chat-window'
import { DashboardShell, type DashboardLink } from '@/components/dashboard-shell'
import { ErrorState } from '@/components/page-state'
import { RazorpayPaymentButton } from '@/components/razorpay-payment-button'
import { RefundDialog } from '@/components/refund-dialog'
import { ReviewDialog } from '@/components/review-dialog'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { VerifiedBadge } from '@/components/verified-badge'
import { useAuth } from '@/contexts/auth-context'
import { ApiError, api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { privateQueryKey } from '@/lib/session'
import type { Booking } from '@/types/api'

const links: DashboardLink[] = [
  { label: 'Overview', to: '/workspace', icon: LayoutDashboard },
  { label: 'My matters', to: '/workspace/cases', icon: FolderOpen },
  { label: 'Consultations', to: '/workspace/consultations', icon: CalendarDays },
  { label: 'Saved lawyers', to: '/workspace/saved', icon: Bookmark },
  { label: 'Messages', to: '/workspace/messages', icon: MessageSquare },
  { label: 'Refunds', to: '/workspace/refunds', icon: ReceiptText },
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

interface BookingListProps {
  bookings: Booking[]
  interactive?: boolean
  onChanged?: () => void
  reviewedBookingIds?: Set<string>
  onReviewed?: (bookingId: string) => void
}

function BookingList({ bookings, interactive = false, onChanged, reviewedBookingIds, onReviewed }: BookingListProps) {
  const { accessToken } = useAuth()
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  async function cancel(bookingId: string) {
    if (!accessToken) return
    setCancellingId(bookingId)
    try {
      await api.cancelBooking(bookingId, accessToken)
      toast.success('Consultation cancelled')
      onChanged?.()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'This booking could not be cancelled.')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="divide-y border-y">
      {bookings.map((booking) => {
        const label = booking.lawyerId.name || booking.lawyerId.specialization.join(', ') || 'Legal consultation'
        const hasPayment = Boolean(booking.paymentId)
        const alreadyReviewed = reviewedBookingIds?.has(booking._id)
        return (
          <article key={booking._id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(booking.scheduledAt))} · {booking.durationMinutes} minutes</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{booking.status}</Badge>
              <span className="text-sm font-medium">₹{booking.lawyerId.consultationFee.toLocaleString('en-IN')}</span>
              {interactive && booking.status === 'pending' && (
                <RazorpayPaymentButton booking={booking} onPaid={() => onChanged?.()} />
              )}
              {interactive && ['pending', 'confirmed'].includes(booking.status) && (
                <Button size="sm" variant="destructive" onClick={() => void cancel(booking._id)} disabled={cancellingId === booking._id}>
                  {cancellingId === booking._id ? 'Cancelling…' : 'Cancel'}
                </Button>
              )}
              {interactive && booking.status === 'completed' && !alreadyReviewed && (
                <ReviewDialog bookingId={booking._id} onSubmitted={() => onReviewed?.(booking._id)} trigger={<Button size="sm" variant="outline">Leave a review</Button>} />
              )}
              {interactive && booking.status === 'completed' && alreadyReviewed && (
                <Badge variant="outline">Reviewed</Badge>
              )}
              {interactive && ['confirmed', 'cancelled'].includes(booking.status) && hasPayment && (
                <RefundDialog bookingId={booking._id} onSubmitted={() => onChanged?.()} trigger={<Button size="sm" variant="outline">Request refund</Button>} />
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function ConsultationsSection() {
  const { user, accessToken } = useAuth()
  const queryKey = privateQueryKey('client-bookings', user!.id)
  const query = useQuery({ queryKey, queryFn: ({ signal }) => api.getClientBookings(accessToken!, signal), enabled: Boolean(user && accessToken), retry: false })
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())

  if (query.isLoading) return <div><h1 className="font-heading text-3xl font-semibold">Consultations</h1><Skeleton className="mt-7 h-40 w-full" /></div>
  if (query.isError) return <ErrorState title="Consultations unavailable" message="We could not load bookings from the CaseJeeto API." onRetry={() => void query.refetch()} />
  const bookings = query.data?.data.bookings || []
  return (
    <div>
      <h1 className="font-heading text-3xl font-semibold">Consultations</h1>
      <p className="mt-2 text-muted-foreground">Appointments recorded by the booking service. Pay a pending request, cancel, leave a review once completed, or request a refund on a paid booking.</p>
      {bookings.length > 0 ? (
        <div className="mt-7">
          <BookingList
            bookings={bookings}
            interactive
            onChanged={() => void query.refetch()}
            reviewedBookingIds={reviewedIds}
            onReviewed={(id) => setReviewedIds((previous) => new Set(previous).add(id))}
          />
        </div>
      ) : (
        <EmptyWorkspaceSection icon={CalendarDays} title="Your consultation diary is clear" body="No bookings are recorded for this account." action="Browse lawyers" to="/lawyers" />
      )}
    </div>
  )
}

function SavedLawyersSection() {
  const { user, accessToken } = useAuth()
  const query = useQuery({ queryKey: privateQueryKey('client-saved-lawyers', user!.id), queryFn: ({ signal }) => api.getSavedLawyers(accessToken!, signal), enabled: Boolean(user && accessToken), retry: false })
  if (query.isLoading) return <div><h1 className="font-heading text-3xl font-semibold">Saved lawyers</h1><Skeleton className="mt-7 h-40 w-full" /></div>
  if (query.isError) return <ErrorState title="Saved lawyers unavailable" message="We could not load your private shortlist from the CaseJeeto API." onRetry={() => void query.refetch()} />
  const lawyers = query.data?.data.savedLawyers || []
  return <div><h1 className="font-heading text-3xl font-semibold">Saved lawyers</h1><p className="mt-2 text-muted-foreground">Your private shortlist, loaded from your client account.</p>{lawyers.length > 0 ? <div className="mt-7 divide-y border-y">{lawyers.map((lawyer) => <article key={lawyer._id} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-heading text-lg font-semibold">{lawyer.user.name}</h2><VerifiedBadge />{!lawyer.isAvailable && <Badge variant="secondary">Currently unavailable</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">{lawyer.specialization.join(', ') || 'Practice areas not listed'}</p></div><div className="flex items-center gap-4"><span className="flex items-center gap-1 text-sm"><Star className="size-4 text-primary" /> {lawyer.rating.toFixed(1)}</span><span className="text-sm font-medium">₹{lawyer.consultationFee.toLocaleString('en-IN')}</span><Link to={`/lawyers/${lawyer._id}`} className={buttonVariants({ variant: 'outline' })}>View</Link></div></article>)}</div> : <EmptyWorkspaceSection icon={Bookmark} title="Build a thoughtful shortlist" body="No lawyers are saved for this account yet." action="Start comparing" to="/lawyers" />}</div>
}

function MessagesSection() {
  const { accessToken } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedConversationId = searchParams.get('conversation')
  const [activeId, setActiveId] = useState<string | null>(requestedConversationId)

  const conversationsQuery = useQuery({
    queryKey: ['client-conversations'],
    queryFn: ({ signal }) => api.getClientConversations(accessToken!, signal),
    enabled: Boolean(accessToken),
    retry: false,
  })

  useEffect(() => {
    if (requestedConversationId) setActiveId(requestedConversationId)
  }, [requestedConversationId])

  useEffect(() => {
    if (!activeId && conversationsQuery.data?.data.conversations.length) {
      setActiveId(conversationsQuery.data.data.conversations[0]._id)
    }
  }, [activeId, conversationsQuery.data])

  const messagesQuery = useQuery({
    queryKey: ['client-conversation-messages', activeId],
    queryFn: ({ signal }) => api.getClientConversationMessages(activeId!, accessToken!, signal),
    enabled: Boolean(accessToken && activeId),
    retry: false,
  })

  function selectConversation(id: string) {
    setActiveId(id)
    setSearchParams({ conversation: id })
  }

  const conversations = conversationsQuery.data?.data.conversations || []

  return (
    <div>
      <h1 className="font-heading text-3xl font-semibold">Messages</h1>
      <p className="mt-2 text-muted-foreground">Conversations with advocates you've messaged from their profile.</p>

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
                  className={cn('flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left text-sm hover:bg-muted', activeId === conversation._id && 'bg-muted')}
                >
                  <span className="font-medium">{conversation.lawyerId.name}</span>
                  <span className="line-clamp-1 text-xs text-muted-foreground">{conversation.messages[0]?.text || 'No messages yet'}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">No conversations yet. Message an advocate from their profile to start one.</p>
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
            <ChatWindow conversationId={activeId} initialMessages={messagesQuery.data?.data.messages || []} />
          )}
        </div>
      </div>
    </div>
  )
}

function RefundsSection() {
  const { accessToken } = useAuth()
  const query = useQuery({ queryKey: ['client-refunds'], queryFn: ({ signal }) => api.getMyRefunds(accessToken!, signal), enabled: Boolean(accessToken), retry: false })

  if (query.isLoading) return <div><h1 className="font-heading text-3xl font-semibold">Refunds</h1><Skeleton className="mt-7 h-40 w-full" /></div>
  if (query.isError) return <ErrorState title="Refunds unavailable" message="We could not load your refund requests." onRetry={() => void query.refetch()} />
  const refunds = query.data?.data.refunds || []

  return (
    <div>
      <h1 className="font-heading text-3xl font-semibold">Refunds</h1>
      <p className="mt-2 text-muted-foreground">Requests you've submitted from a paid or cancelled consultation, and their review status.</p>
      {refunds.length > 0 ? (
        <div className="mt-7 divide-y border-y">
          {refunds.map((refund) => (
            <article key={refund._id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(refund.bookingId.scheduledAt))}</p>
                <p className="mt-1 text-sm text-muted-foreground">{refund.refundReason.replaceAll('_', ' ').toLowerCase()}</p>
                {refund.failureReason && <p className="mt-1 text-xs text-destructive">{refund.failureReason}</p>}
              </div>
              <Badge variant={refund.refundStatus === 'completed' ? 'default' : refund.refundStatus === 'rejected' || refund.refundStatus === 'failed' ? 'destructive' : 'secondary'}>{refund.refundStatus.replaceAll('_', ' ')}</Badge>
            </article>
          ))}
        </div>
      ) : (
        <EmptyWorkspaceSection icon={ReceiptText} title="No refund requests yet" body="Request a refund from a paid consultation under Consultations." action="Go to consultations" to="/workspace/consultations" />
      )}
    </div>
  )
}

function MattersSection() {
  return (
    <div>
      <h1 className="font-heading text-3xl font-semibold">My matters</h1>
      <p className="mt-2 text-muted-foreground">Keep every legal concern and its documents in one organised place.</p>
      <div className="mt-7 overflow-hidden rounded-2xl border bg-card">
        <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-10 sm:p-8">
          <div className="max-w-xl">
            <p className="eyebrow">Coming soon</p>
            <h2 className="mt-2 font-heading text-2xl font-semibold tracking-[-0.02em] text-primary">Matter folders are on the way.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">You will be able to group documents, timelines, and notes for each legal matter — so your next conversation with an advocate starts with everything in front of you. Until then, the essentials below already work.</p>
          </div>
          <FolderOpen className="size-16 shrink-0 text-primary/20" aria-hidden="true" />
        </div>
        <div className="grid gap-px border-t bg-border sm:grid-cols-3">
          {[
            { icon: Search, title: 'Find an advocate', body: 'Shortlist verified profiles that match your matter.', to: '/lawyers', action: 'Browse advocates' },
            { icon: CalendarDays, title: 'Request a consultation', body: 'Reserve a slot and pay securely from your workspace.', to: '/workspace/consultations', action: 'View consultations' },
            { icon: MessageSquare, title: 'Prepare the conversation', body: 'Message an advocate and ask questions before you meet.', to: '/workspace/messages', action: 'Open messages' },
          ].map(({ icon: Icon, title, body, to, action }) => (
            <div key={title} className="flex flex-col bg-card p-6">
              <span className="grid size-10 place-items-center rounded-lg bg-primary/7 text-primary"><Icon className="size-5" aria-hidden="true" /></span>
              <h3 className="mt-4 font-semibold text-primary">{title}</h3>
              <p className="mt-1 flex-1 text-sm leading-6 text-muted-foreground">{body}</p>
              <Link to={to} className={cn(buttonVariants({ variant: 'outline' }), 'mt-5 h-10 gap-2 self-start')}>{action} <ArrowRight className="arrow-nudge" aria-hidden="true" /></Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function UnconnectedSection({ title, service, icon: Icon }: { title: string; service: string; icon: React.ComponentType<{ className?: string }> }) {
  return <div><h1 className="font-heading text-3xl font-semibold">{title}</h1><div className="mt-7 border-y py-12 text-center"><Icon className="mx-auto size-8 text-primary" /><h2 className="mt-4 font-heading text-xl font-semibold">Not connected yet</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{service} is not wired into this frontend. This is an unavailable feature state, not an empty account result.</p></div></div>
}

function SectionForPath() {
  const { pathname } = useLocation()
  if (pathname === '/workspace/cases') return <MattersSection />
  if (pathname === '/workspace/consultations') return <ConsultationsSection />
  if (pathname === '/workspace/saved') return <SavedLawyersSection />
  if (pathname === '/workspace/messages') return <MessagesSection />
  if (pathname === '/workspace/refunds') return <RefundsSection />
  if (pathname === '/workspace/settings') return <div><h1 className="font-heading text-3xl font-semibold">Account settings</h1><p className="mt-2 text-muted-foreground">Profile and privacy controls, coming to this workspace.</p><Card className="mt-7"><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> Privacy by default</CardTitle></CardHeader><CardContent className="space-y-3 text-sm leading-6 text-muted-foreground"><p>CaseJeeto separates public lawyer information from private client activity. Only you can see your matters, bookings, messages, and saved shortlist.</p><p>Profile editing and notification preferences will appear here as the account service expands. Everything you need today is under the other tabs.</p></CardContent></Card></div>
  if (pathname === '/workspace') return <Overview />
  return <UnconnectedSection icon={ShieldCheck} title="Workspace page not found" service="This nested workspace route" />
}

export function ClientWorkspacePage() {
  return <DashboardShell eyebrow="Client account" title="Client workspace" links={links}><SectionForPath /></DashboardShell>
}
