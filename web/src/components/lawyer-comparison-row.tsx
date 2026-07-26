import { ArrowRight, BriefcaseBusiness, Languages, MapPin, MessageSquareText, Scale, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Lawyer } from '@/types/api'

function initials(name: string) {
  return name.replace(/^Adv\.\s*/, '').split(' ').slice(0, 2).map((part) => part[0]).join('')
}

interface LawyerComparisonRowProps {
  lawyer: Lawyer
  tone?: 'light' | 'dark'
  priorityImage?: boolean
}

export function LawyerComparisonRow({ lawyer, tone = 'light', priorityImage = false }: LawyerComparisonRowProps) {
  const dark = tone === 'dark'

  return (
    <article className={cn('lawyer-profile-row group', dark && 'lawyer-profile-row-dark')}>
      <div className="flex min-w-0 items-center gap-4">
        <Avatar className="size-16 shrink-0 rounded-xl sm:size-20">
          <AvatarImage src={lawyer.profilePhoto} alt={`Portrait of ${lawyer.user.name}`} loading={priorityImage ? 'eager' : 'lazy'} className="object-cover" />
          <AvatarFallback className={cn('rounded-xl bg-secondary font-heading text-lg text-primary', dark && 'bg-white/10 text-white')}>{initials(lawyer.user.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h3 className={cn('truncate text-lg font-semibold tracking-[-0.025em] sm:text-xl', dark && 'text-white')}>{lawyer.user.name}</h3>
          <p className={cn('mt-1 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground', dark && 'text-white/60')}>
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{lawyer.officeAddress || 'India'}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {lawyer.specialization.slice(0, 2).map((area, index) => (
              <Badge key={area} variant={index === 0 ? 'default' : 'secondary'} className={cn(dark && index === 0 && 'bg-white text-primary', dark && index > 0 && 'bg-white/10 text-white')}>{area}</Badge>
            ))}
          </div>
        </div>
      </div>

      <dl className={cn('grid grid-cols-2 gap-x-4 gap-y-3 border-y py-4 text-sm sm:grid-cols-4 lg:border-y-0 lg:py-0', dark ? 'border-white/12' : 'border-border')}>
        <div>
          <dt className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', dark && 'text-white/55')}><BriefcaseBusiness className="size-3.5" aria-hidden="true" /> Experience</dt>
          <dd className={cn('mt-1 font-semibold', dark && 'text-white')}>{lawyer.yearsOfExperience} years</dd>
        </div>
        <div>
          <dt className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', dark && 'text-white/55')}><Scale className="size-3.5" aria-hidden="true" /> Court practice</dt>
          <dd className={cn('mt-1 truncate font-semibold', dark && 'text-white')}>{lawyer.courtsPracticed[0] || 'Not listed'}</dd>
        </div>
        <div>
          <dt className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', dark && 'text-white/55')}><Languages className="size-3.5" aria-hidden="true" /> Languages</dt>
          <dd className={cn('mt-1 truncate font-semibold', dark && 'text-white')}>{lawyer.languages.slice(0, 2).join(', ')}</dd>
        </div>
        <div>
          <dt className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', dark && 'text-white/55')}><MessageSquareText className="size-3.5" aria-hidden="true" /> Client feedback</dt>
          <dd className={cn('mt-1 flex items-center gap-1 font-semibold', dark && 'text-white')}><Star className="size-3.5 fill-current text-rating" aria-hidden="true" /> {lawyer.rating.toFixed(1)} <span className={cn('font-normal text-muted-foreground', dark && 'text-white/55')}>({lawyer.reviewCount})</span></dd>
        </div>
      </dl>

      <div className="flex items-center justify-between gap-4 lg:justify-end">
        <div className="lg:text-right">
          <p className={cn('text-xs text-muted-foreground', dark && 'text-white/55')}>Consultation fee</p>
          <p className={cn('font-semibold', dark && 'text-white')}>₹{lawyer.consultationFee.toLocaleString('en-IN')}</p>
        </div>
        <Link
          to={`/lawyers/${lawyer._id}`}
          aria-label={`View ${lawyer.user.name}'s profile`}
          className={cn(buttonVariants({ variant: dark ? 'secondary' : 'outline', size: 'lg' }), 'h-11 gap-2 px-4', dark && 'border-white bg-white text-primary hover:bg-white/90')}
        >
          View profile <ArrowRight className="arrow-nudge" aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}
