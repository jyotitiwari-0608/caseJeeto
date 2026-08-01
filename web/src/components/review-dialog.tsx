import { useState, type ReactElement } from 'react'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/auth-context'
import { ApiError, api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface ReviewDialogProps {
  bookingId: string
  onSubmitted: () => void
  trigger: ReactElement
}

export function ReviewDialog({ bookingId, onSubmitted, trigger }: ReviewDialogProps) {
  const { accessToken } = useAuth()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit() {
    if (!accessToken) return
    if (rating < 1) {
      setError('Choose a star rating before submitting.')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      await api.createReview({ bookingId, rating, comment: comment.trim() || undefined }, accessToken)
      toast.success('Thanks — your review has been posted.')
      setOpen(false)
      setRating(0)
      setComment('')
      onSubmitted()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Your review could not be submitted. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setError(''); setRating(0); setComment('') } }}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave a review</DialogTitle>
          <DialogDescription>Your rating and comment will be visible on this advocate's public profile.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label>Rating</Label>
            <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Star rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} star${value > 1 ? 's' : ''}`}
                  onMouseEnter={() => setHoverRating(value)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(value)}
                  className="pressable p-0.5"
                >
                  <Star className={cn('size-7', (hoverRating || rating) >= value ? 'fill-current text-rating' : 'text-muted-foreground')} />
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="review-comment">Comment (optional)</Label>
            <Textarea id="review-comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} placeholder="Share how the consultation went." className="min-h-24" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={isSubmitting}>{isSubmitting ? 'Posting…' : 'Post review'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
