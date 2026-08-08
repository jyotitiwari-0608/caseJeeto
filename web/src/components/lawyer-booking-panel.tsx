import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, CheckCircle2, Clock3, IndianRupee, LogIn } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/auth-context'
import { ApiError, api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { AvailabilityDay, AvailabilitySlot, Lawyer } from '@/types/api'

function formatDayLabel(dateIso: string) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(dateIso))
}

function formatSlotTime(startIso: string, endIso: string) {
  const timeFormat = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' })
  return `${timeFormat.format(new Date(startIso))} – ${timeFormat.format(new Date(endIso))}`
}

function slotDurationMinutes(slot: AvailabilitySlot) {
  return Math.round((new Date(slot.endTime).getTime() - new Date(slot.startTime).getTime()) / 60000)
}

interface SelectedSlot { availabilityId: string; slot: AvailabilitySlot }

/**
 * Replaces the old static "Booking unavailable" card on the lawyer detail
 * page. Only client accounts can actually request a slot — booking.routes.js
 * enforces requireRole('client') server-side regardless of what this
 * component allows, so the role gates here are a UX convenience, not the
 * real authorization boundary.
 */
export function LawyerBookingPanel({ lawyer }: { lawyer: Lawyer }) {
  const { user, accessToken } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<SelectedSlot | null>(null)
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null)

  const isClient = user?.role === 'client'
  const query = useQuery({
    queryKey: ['lawyer-availability', lawyer._id],
    queryFn: ({ signal }) => api.getLawyerAvailability(lawyer._id, {}, signal),
    retry: false,
  })

  const days = query.data?.data.availability || []
  const visibleDays = days.slice(0, 7)

  const bookingMutation = useMutation({
    mutationFn: (input: SelectedSlot) => api.createBooking({
      lawyerId: lawyer._id,
      availabilityId: input.availabilityId,
      slotId: input.slot.slotId,
      durationMinutes: slotDurationMinutes(input.slot),
    }, accessToken!),
    onSuccess: (response) => {
      setConfirmedBookingId(response.data.booking._id)
      queryClient.invalidateQueries({ queryKey: ['lawyer-availability', lawyer._id] })
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'This slot could not be booked. Please try another.')
      setSelected(null)
    },
  })

  if (query.isLoading) {
    return (
      <div className="grid gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (query.isError) {
    return (
      <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
        Availability could not be loaded. Please refresh and try again.
      </p>
    )
  }

  if (visibleDays.length === 0) {
    return (
      <p className="rounded-xl border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
        This advocate has no open slots right now. Check back soon.
      </p>
    )
  }

  function requestGuestSlot() {
    if (user) return
    navigate('/login', { state: { from: `/lawyers/${lawyer._id}` } })
  }

  return (
    <div className="grid gap-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        <CalendarClock className="size-3.5" /> Next available slots
      </p>
      <div className="grid gap-3">
        {visibleDays.map((day: AvailabilityDay) => (
          <div key={day.availabilityId}>
            <p className="text-xs font-semibold text-muted-foreground">{formatDayLabel(day.date)}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {day.slots.map((slot) => {
                const onSelect = isClient
                  ? () => setSelected({ availabilityId: day.availabilityId, slot })
                  : user
                    ? undefined
                    : requestGuestSlot
                return (
                  <button
                    key={slot.slotId}
                    type="button"
                    onClick={onSelect}
                    disabled={!isClient && Boolean(user)}
                    className="rounded-lg border bg-card px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-current disabled:hover:bg-card"
                  >
                    {formatSlotTime(slot.startTime, slot.endTime)}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {!user && (
        <div className="rounded-xl border bg-secondary p-4 text-center">
          <p className="text-sm font-medium text-primary">Log in to request a slot</p>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-muted-foreground">Booking needs an account so you can track the request and pay for the consultation securely.</p>
          <Link to="/login" state={{ from: `/lawyers/${lawyer._id}` }} className={cn(buttonVariants(), 'mt-3 gap-2')}>
            <LogIn className="size-4" /> Log in to book
          </Link>
        </div>
      )}
      {user && !isClient && (
        <p className="rounded-xl border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
          Only client accounts can request a consultation.
        </p>
      )}

      <Dialog open={Boolean(selected) || Boolean(confirmedBookingId)} onOpenChange={(open) => { if (!open) { setSelected(null); setConfirmedBookingId(null) } }}>
        <DialogContent>
          {confirmedBookingId ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="size-5 text-mint-strong" /> Consultation requested</DialogTitle>
                <DialogDescription>Your slot is reserved as pending. Here is what happens next.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 rounded-lg border bg-muted/40 p-4">
                {[
                  ['1', 'Pay the consultation fee', 'Open your Consultations page and pay to confirm this slot.'],
                  ['2', 'Get ready', 'Add any documents and questions to make the call more useful.'],
                  ['3', 'Join the video call', 'A secure video link appears here once your booking is confirmed.'],
                ].map(([step, title, body]) => (
                  <div key={step} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
                    <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{step}</span>
                    <div><p className="text-sm font-semibold text-primary">{title}</p><p className="text-xs leading-5 text-muted-foreground">{body}</p></div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button onClick={() => navigate('/workspace/consultations')}>View my consultations</Button>
              </DialogFooter>
            </>
          ) : selected ? (
            <>
              <DialogHeader>
                <DialogTitle>Confirm consultation request</DialogTitle>
                <DialogDescription>Review the details before requesting this slot.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 rounded-lg border bg-muted/40 p-4 text-sm">
                <p className="flex items-center gap-2"><Clock3 className="size-4 text-primary" /> {formatSlotTime(selected.slot.startTime, selected.slot.endTime)} · {slotDurationMinutes(selected.slot)} minutes</p>
                <p className="flex items-center gap-2"><IndianRupee className="size-4 text-primary" /> {lawyer.consultationFee.toLocaleString('en-IN')} consultation fee</p>
              </div>
              <p className="text-xs text-muted-foreground">This reserves the slot as pending. Payment is required separately to confirm it.</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)} disabled={bookingMutation.isPending}>Cancel</Button>
                <Button onClick={() => bookingMutation.mutate(selected)} disabled={bookingMutation.isPending}>
                  {bookingMutation.isPending ? 'Requesting…' : 'Confirm request'}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}