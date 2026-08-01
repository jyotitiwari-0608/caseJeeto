import { useState, type ReactElement } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/auth-context'
import { ApiError, api } from '@/lib/api'
import type { RefundReason } from '@/types/api'

// Mirrors CLIENT_SELECTABLE_REASONS in server/controllers/refundController.js
// exactly. LAWYER_MISCONDUCT and ADMIN_GOODWILL are deliberately excluded —
// the backend rejects them from this endpoint too, since those require
// admin judgment.
const REASON_OPTIONS: Array<{ value: RefundReason; label: string }> = [
  { value: 'CLIENT_CANCELLED_WITHIN_POLICY', label: 'I cancelled within the allowed window' },
  { value: 'CLIENT_CANCELLED_OUTSIDE_POLICY', label: 'I cancelled outside the allowed window' },
  { value: 'LAWYER_CANCELLED', label: 'The advocate cancelled' },
  { value: 'LAWYER_NO_SHOW', label: 'The advocate did not join the consultation' },
  { value: 'TECHNICAL_FAILURE', label: 'A technical problem prevented the consultation' },
  { value: 'DUPLICATE_PAYMENT', label: 'I was charged more than once' },
  { value: 'OTHER', label: 'Something else' },
]

interface RefundDialogProps {
  bookingId: string
  onSubmitted: () => void
  trigger: ReactElement
}

export function RefundDialog({ bookingId, onSubmitted, trigger }: RefundDialogProps) {
  const { accessToken } = useAuth()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<RefundReason>('OTHER')
  const [evidence, setEvidence] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit() {
    if (!accessToken) return
    if (!evidence.trim()) {
      setError('Describe what happened — this is required so an admin can review the request.')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      await api.requestRefund({ bookingId, refundReason: reason, evidence: evidence.trim(), refundNote: note.trim() || undefined }, accessToken)
      toast.success('Refund request submitted. An admin will review it.')
      setOpen(false)
      setEvidence('')
      setNote('')
      onSubmitted()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Your refund request could not be submitted. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setError(''); setEvidence(''); setNote('') } }}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a refund</DialogTitle>
          <DialogDescription>This creates a request only — an admin reviews it and issues the refund. It does not happen automatically.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="refund-reason">Reason</Label>
            <select id="refund-reason" value={reason} onChange={(event) => setReason(event.target.value as RefundReason)} className="field-control">
              {REASON_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="refund-evidence">What happened <span className="text-destructive">*</span></Label>
            <Textarea id="refund-evidence" value={evidence} onChange={(event) => setEvidence(event.target.value)} maxLength={1000} placeholder="e.g. The advocate did not join by 15 minutes past the scheduled time." className="min-h-24" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="refund-note">Additional note (optional)</Label>
            <Textarea id="refund-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} className="min-h-16" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={isSubmitting}>{isSubmitting ? 'Submitting…' : 'Submit request'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
