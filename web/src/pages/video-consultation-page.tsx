import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Clock3, PhoneOff } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/auth-context'
import { ApiError, api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { BookingResponse, LawyerBookingActionResponse } from '@/types/api'

function formatCountdown(msRemaining: number) {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function useCountdown(targetIso: string | undefined) {
  const target = useMemo(() => (targetIso ? new Date(targetIso).getTime() : null), [targetIso])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!target) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [target])

  if (!target) return { msRemaining: null, isOver: false }
  const msRemaining = target - now
  return { msRemaining, isOver: msRemaining <= 0 }
}

export function VideoConsultationPage() {
  const { bookingId = '' } = useParams()
  const { user, accessToken } = useAuth()
  const navigate = useNavigate()

  const bookingQuery = useQuery<BookingResponse | LawyerBookingActionResponse, Error, BookingResponse | LawyerBookingActionResponse, (string | undefined)[]>({
    queryKey: ['consultation-booking', bookingId, user?.role],
    queryFn: ({ signal }) => user?.role === 'lawyer'
      ? api.getLawyerBookingById(bookingId, accessToken!, signal)
      : api.getBookingById(bookingId, accessToken!, signal),
    enabled: Boolean(bookingId && accessToken && user),
    retry: false,
  })

  const tokenQuery = useQuery({
    queryKey: ['video-token', bookingId],
    queryFn: ({ signal }) => api.getVideoToken(bookingId, accessToken!, signal),
    enabled: Boolean(bookingId && accessToken),
    retry: false,
    // A fresh token is requested every time this page mounts; there's no
    // reason to cache it once the call is over, and re-fetching a stale
    // token wouldn't extend the 15-minute window anyway (see
    // consultationController.getVideoToken — exp is fixed to the
    // scheduled time, not to whenever a token happens to be requested).
    staleTime: 0,
  })

  const { msRemaining, isOver } = useCountdown(tokenQuery.data?.data.accessClosesAt)
  const isLawyerViewer = user?.role === 'lawyer'
  const otherPartyName = bookingQuery.data
    ? isLawyerViewer
      ? (bookingQuery.data as LawyerBookingActionResponse).data.booking.clientId.name
      : (bookingQuery.data as BookingResponse).data.booking.lawyerId.name
    : undefined

  const isLowTime = msRemaining !== null && msRemaining <= 2 * 60 * 1000

  if (tokenQuery.isLoading || bookingQuery.isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-6 h-[32rem] w-full rounded-2xl" />
      </div>
    )
  }

  if (tokenQuery.isError) {
    const message = tokenQuery.error instanceof ApiError ? tokenQuery.error.message : 'The video consultation could not be started.'
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <AlertTriangle className="mx-auto size-8 text-destructive" />
        <h1 className="mt-4 font-heading text-2xl font-semibold">Video access unavailable</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
        <Button variant="outline" className="mt-6" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Go back</Button>
      </div>
    )
  }

  const { roomUrl, token, maxCallMinutes } = tokenQuery.data!.data

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="gap-1.5 px-2" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Back</Button>
          <h1 className="mt-1 font-heading text-2xl font-semibold">Consultation{otherPartyName ? ` with ${otherPartyName}` : ''}</h1>
          <p className="text-sm text-muted-foreground">Video consultations are limited to {maxCallMinutes} minutes.</p>
        </div>
        <div className={cn('flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-sm font-semibold sm:self-auto', isLowTime ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-primary/30 bg-primary/5 text-primary')}>
          <Clock3 className="size-4" />
          {isOver ? 'Time is up' : `${formatCountdown(msRemaining ?? 0)} remaining`}
        </div>
      </div>

      <div className="relative mt-6 overflow-hidden rounded-2xl border bg-card">
        {isOver ? (
          <div className="grid h-[36rem] place-items-center bg-muted/40 p-8 text-center">
            <div>
              <PhoneOff className="mx-auto size-8 text-muted-foreground" />
              <h2 className="mt-4 font-heading text-xl font-semibold">This consultation has ended</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Video consultations are capped at {maxCallMinutes} minutes. The room has closed automatically.
              </p>
              <Link to={user?.role === 'lawyer' ? '/lawyer/dashboard/consultations' : '/workspace/consultations'} className={cn(buttonVariants(), 'mt-6')}>
                Back to consultations
              </Link>
            </div>
          </div>
        ) : (
          <iframe
            key={token}
            title="Video consultation"
            src={`${roomUrl}?t=${encodeURIComponent(token)}`}
            allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
            className="h-[36rem] w-full border-0"
          />
        )}
      </div>

      {!isOver && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          The call will end automatically when the timer above reaches zero, even if you don't leave manually.
        </p>
      )}
    </div>
  )
}
