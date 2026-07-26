import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CalendarDays, Check, IndianRupee, Languages, MapPin, MessageSquareText, Scale, ShieldCheck, Star } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { DemoDataNotice } from '@/components/demo-data-notice'
import { ErrorState } from '@/components/page-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/auth-context'
import { demoLawyers } from '@/data/lawyers'
import { ApiError, DEMO_DATA_ENABLED, api, shouldUseDemoFallback } from '@/lib/api'
import { cn } from '@/lib/utils'

function DetailSkeleton() {
  return <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><Skeleton className="h-5 w-32" /><div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]"><div className="grid gap-6 sm:grid-cols-[17rem_1fr]"><Skeleton className="aspect-[4/5] rounded-2xl" /><div className="space-y-4"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-24 w-full" /></div></div><Skeleton className="h-96 rounded-2xl" /></div></div>
}

function initials(name: string) {
  return name.replace(/^Adv\.\s*/, '').split(' ').slice(0, 2).map((word) => word[0]).join('')
}

export function LawyerDetailPage() {
  const { lawyerId = '' } = useParams()
  const { user, accessToken } = useAuth()
  const demoLawyer = DEMO_DATA_ENABLED ? demoLawyers.find((item) => item._id === lawyerId) : undefined
  const query = useQuery({ queryKey: ['lawyer', lawyerId, user?.id || 'guest'], queryFn: ({ signal }) => api.getLawyer(lawyerId, accessToken || undefined, signal), enabled: Boolean(lawyerId), retry: false })
  const usingDemo = Boolean(demoLawyer) && query.isError && shouldUseDemoFallback(query.error)
  const lawyer = usingDemo ? demoLawyer : query.data?.data.lawyer

  if (query.isLoading) return <DetailSkeleton />
  if (!lawyer) return <div className="mx-auto max-w-3xl px-4 py-16"><ErrorState title={query.error instanceof ApiError && query.error.status === 404 ? 'Advocate profile not found' : 'Advocate profile unavailable'} message={query.error instanceof ApiError ? query.error.message : 'This profile could not be loaded from the live directory.'} onRetry={() => void query.refetch()} /></div>

  return (
    <>
      <section className="profile-hero border-b">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link to="/lawyers" className="pressable inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden="true" /> Back to all advocates</Link>
          {usingDemo && <div className="mt-4"><DemoDataNotice /></div>}

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
            <div className="grid gap-14 pb-10 sm:pb-14">
              <div className="grid items-stretch gap-6 sm:grid-cols-[minmax(13rem,18rem)_minmax(0,1fr)]">
                <Avatar className="h-auto w-full rounded-2xl bg-secondary after:rounded-2xl">
                  <AvatarImage src={lawyer.profilePhoto} alt={`Portrait of ${lawyer.user.name}`} className="aspect-[4/5] rounded-2xl object-cover" />
                  <AvatarFallback className="aspect-[4/5] rounded-2xl bg-primary/8 text-4xl font-semibold text-primary">{initials(lawyer.user.name)}</AvatarFallback>
                </Avatar>

                <div className="flex flex-col justify-center py-2">
                  <p className="eyebrow">Advocate profile</p>
                  <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] text-primary sm:text-5xl">{lawyer.user.name}</h1>
                  <p className="mt-3 flex items-center gap-2 text-muted-foreground"><MapPin className="size-4" aria-hidden="true" /> {lawyer.officeAddress || 'India'}</p>
                  <div className="mt-5 flex flex-wrap gap-2">{lawyer.specialization.map((area, index) => <Badge key={area} variant={index === 0 ? 'default' : 'secondary'}>{area}</Badge>)}</div>
                  <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground">{lawyer.bio || 'This advocate offers thoughtful, confidential guidance and practical next steps for clients.'}</p>

                  <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
                    <div className="bg-card p-4"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Star className="size-3.5 fill-current text-rating" aria-hidden="true" /> Client rating</dt><dd className="mt-1 text-lg font-semibold text-primary">{lawyer.rating.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">/ 5</span></dd></div>
                    <div className="bg-card p-4"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><BriefcaseBusiness className="size-3.5" aria-hidden="true" /> Experience</dt><dd className="mt-1 text-lg font-semibold text-primary">{lawyer.yearsOfExperience} years</dd></div>
                    <div className="bg-card p-4"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><MessageSquareText className="size-3.5" aria-hidden="true" /> Reviews</dt><dd className="mt-1 text-lg font-semibold text-primary">{lawyer.reviewCount}</dd></div>
                    <div className="bg-card p-4"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Scale className="size-3.5" aria-hidden="true" /> Consultations</dt><dd className="mt-1 text-lg font-semibold text-primary">{lawyer.totalConsultations}</dd></div>
                  </dl>
                </div>
              </div>

              <div>
                <p className="eyebrow">Practice evidence</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-primary">Where this advocate practises</h2>
                <div className="mt-6 overflow-hidden rounded-xl border bg-card">
                  {lawyer.courtsPracticed.length ? lawyer.courtsPracticed.map((court) => <div key={court} className="flex items-center gap-3 border-b px-5 py-4 last:border-b-0"><span className="grid size-9 place-items-center rounded-lg bg-primary/7 text-primary"><Scale className="size-4" aria-hidden="true" /></span><span className="font-medium">{court}</span><Check className="ml-auto size-4 text-mint-strong" aria-label="Listed on profile" /></div>) : <p className="p-5 text-sm text-muted-foreground">Court practice has not been listed on this profile.</p>}
                </div>
              </div>

              <div>
                <p className="eyebrow">Conversation fit</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-primary">What you can assess before reaching out</h2>
                <div className="mt-6 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3">
                  {[{ icon: ShieldCheck, title: 'Private account flow', body: 'Account access protects later consultation actions.' }, { icon: Languages, title: 'Language preference', body: `This profile lists ${lawyer.languages.join(', ')}.` }, { icon: MessageSquareText, title: 'Profile context', body: 'Read practice focus and evidence before deciding your next step.' }].map(({ icon: Icon, title, body }) => <article key={title} className="bg-card p-5"><Icon className="size-5 text-seal" aria-hidden="true" /><h3 className="mt-5 font-semibold text-primary">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p></article>)}
                </div>
                <div className="mt-8 flex flex-col gap-4 rounded-xl bg-secondary p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-primary">Still comparing?</p><p className="mt-1 text-sm text-muted-foreground">Adjust practice area, court, language, experience, or fee.</p></div><Link to="/lawyers" className={cn(buttonVariants({ variant: 'outline' }), 'shrink-0 bg-card')}>Refine the shortlist <ArrowRight className="arrow-nudge" aria-hidden="true" /></Link></div>
              </div>
            </div>

            <aside>
              <div className="sticky top-24 overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-small)]">
                <div className="bg-primary px-6 py-6 text-primary-foreground">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Consultation summary</p>
                  <p className="mt-3 flex items-end gap-1 text-4xl font-semibold tracking-[-0.04em]"><IndianRupee className="mb-1.5 size-5" aria-hidden="true" />{lawyer.consultationFee.toLocaleString('en-IN')}</p>
                  <p className="mt-1 text-sm text-white/60">Fee shown on this advocate profile</p>
                </div>
                <div className="grid gap-4 p-6 text-sm">
                  <p className="flex items-start gap-3"><Languages className="mt-0.5 size-4 shrink-0 text-seal" aria-hidden="true" /><span><strong className="block text-primary">Languages</strong><span className="text-muted-foreground">{lawyer.languages.slice(0, 3).join(', ')}</span></span></p>
                  <p className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-seal" aria-hidden="true" /><span><strong className="block text-primary">Private account flow</strong><span className="text-muted-foreground">Sign-in is required before booking actions.</span></span></p>
                  <p className="flex items-start gap-3"><CalendarDays className="mt-0.5 size-4 shrink-0 text-seal" aria-hidden="true" /><span><strong className="block text-primary">Availability not published here</strong><span className="text-muted-foreground">No slot is reserved until live availability is connected.</span></span></p>
                  <Button size="lg" className="mt-2 h-12 w-full" disabled>Booking unavailable</Button>
                  <Link to="/lawyers" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 w-full')}>Compare other advocates</Link>
                  <p className="text-center text-xs leading-5 text-muted-foreground">This control does not store a request or take payment.</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  )
}
