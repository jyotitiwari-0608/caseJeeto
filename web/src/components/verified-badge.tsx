import { BadgeCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface VerifiedBadgeProps {
  dark?: boolean
  className?: string
}

export function VerifiedBadge({ dark = false, className }: VerifiedBadgeProps) {
  return (
    <Badge
      aria-label="Verified advocate: identity and credentials verified by CaseJeeto"
      title="Identity and credentials verified by CaseJeeto"
      variant={dark ? 'secondary' : 'secondary'}
      className={cn(
        'gap-1 border border-mint-strong/30 bg-mint text-mint-strong',
        dark && 'border-white/15 bg-white/10 text-white',
        className,
      )}
    >
      <BadgeCheck aria-hidden="true" />
      Verified
    </Badge>
  )
}
