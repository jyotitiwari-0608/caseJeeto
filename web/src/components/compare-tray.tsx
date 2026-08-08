import { useState } from 'react'
import { ArrowRight, Scale, Star, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { VerifiedBadge } from '@/components/verified-badge'
import { useCompare } from '@/contexts/compare-context'
import { cn } from '@/lib/utils'
import type { Lawyer } from '@/types/api'

function initials(name: string) {
  return name.replace(/^Adv\.\s*/, '').split(' ').slice(0, 2).map((part) => part[0]).join('')
}

const ROWS: Array<{ label: string; render: (lawyer: Lawyer) => React.ReactNode }> = [
  { label: 'Practice focus', render: (lawyer) => <span className="line-clamp-2">{lawyer.specialization.slice(0, 3).join(', ')}</span> },
  { label: 'Rating', render: (lawyer) => <span className="flex items-center justify-center gap-1 font-semibold"><Star className="size-3.5 fill-current text-rating" aria-hidden="true" />{lawyer.rating.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">({lawyer.reviewCount})</span></span> },
  { label: 'Experience', render: (lawyer) => `${lawyer.yearsOfExperience} years` },
  { label: 'Court practice', render: (lawyer) => <span className="line-clamp-2">{lawyer.courtsPracticed.slice(0, 2).join(', ') || 'Not listed'}</span> },
  { label: 'Languages', render: (lawyer) => <span className="line-clamp-2">{lawyer.languages.slice(0, 3).join(', ')}</span> },
  { label: 'Consultation fee', render: (lawyer) => <span className="font-heading text-lg font-semibold text-primary">₹{lawyer.consultationFee.toLocaleString('en-IN')}</span> },
  { label: 'Consultations', render: (lawyer) => lawyer.totalConsultations.toLocaleString('en-IN') },
]

function CompareDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { items, remove, clear } = useCompare()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Scale className="size-5 text-primary" aria-hidden="true" /> Compare advocates</DialogTitle>
          <DialogDescription>Side-by-side profile facts to help you decide who to speak with first.</DialogDescription>
        </DialogHeader>

        {items.length < 2 ? (
          <div className="rounded-xl border bg-muted/40 p-8 text-center">
            <Scale className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-4 text-sm font-medium">Add one more advocate to compare side by side.</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">Use the Compare button on any advocate profile card or page to build your shortlist.</p>
            {items.length === 1 && <Button variant="outline" size="sm" className="mt-4" onClick={() => remove(items[0]._id)}>Remove {items[0].user.name.split(' ')[0]}</Button>}
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-auto rounded-xl border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="sticky left-0 z-10 w-28 bg-muted/40 p-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground sm:w-36">Profile</th>
                  {items.map((lawyer) => (
                    <th key={lawyer._id} className="min-w-44 p-3 align-top">
                      <div className="flex flex-col items-center gap-2">
                        <Avatar className="size-16 rounded-xl">
                          <AvatarImage src={lawyer.profilePhoto} alt={`Portrait of ${lawyer.user.name}`} className="object-cover" />
                          <AvatarFallback className="rounded-xl bg-secondary font-heading text-primary">{initials(lawyer.user.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-center font-semibold text-primary">{lawyer.user.name}</span>
                        <VerifiedBadge />
                        <button type="button" onClick={() => remove(lawyer._id)} className="text-xs font-medium text-muted-foreground hover:text-destructive" aria-label={`Remove ${lawyer.user.name} from comparison`}>Remove</button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label} className="border-b last:border-b-0">
                    <th scope="row" className="sticky left-0 z-10 bg-card p-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground sm:bg-card">{row.label}</th>
                    {items.map((lawyer) => (
                      <td key={lawyer._id} className="p-3 text-center align-middle text-foreground">{row.render(lawyer)}</td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th scope="row" className="sticky left-0 z-10 bg-card p-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Action</th>
                  {items.map((lawyer) => (
                    <td key={lawyer._id} className="p-3 text-center">
                      <Link to={`/lawyers/${lawyer._id}`} onClick={() => onOpenChange(false)} className={cn('inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90')}>
                        View profile <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter showCloseButton>
          {items.length > 0 && <Button variant="outline" onClick={clear} disabled={items.length === 0}>Clear all</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CompareTray() {
  const { items, clear } = useCompare()
  const [open, setOpen] = useState(false)

  if (items.length === 0) return null

  return (
    <>
      <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
        <div className="flex items-center gap-3 rounded-full border bg-card py-2 pl-4 pr-2 shadow-[var(--shadow-raised)]">
          <Scale className="size-4 text-primary" aria-hidden="true" />
          <span className="text-sm font-medium">
            Compare <span className="text-primary">{items.length}</span> advocate{items.length === 1 ? '' : 's'}
            {items.length < 2 && <span className="ml-1 hidden text-xs text-muted-foreground sm:inline">— add one more to view side by side</span>}
          </span>
          <Button size="sm" onClick={() => setOpen(true)}>{items.length < 2 ? 'Review shortlist' : 'Compare now'}</Button>
          <Button size="icon-sm" variant="ghost" aria-label="Clear comparison" onClick={clear}>
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <CompareDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
