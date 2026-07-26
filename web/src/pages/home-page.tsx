import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BadgeIndianRupee,
  BriefcaseBusiness,
  CalendarCheck2,
  Check,
  FileSearch,
  MessageSquareText,
  ShieldCheck,
  UserRoundSearch,
  UsersRound,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import consultationImage from '@/assets/casejeeto-consultation.webp'
import { LawyerComparisonRow } from '@/components/lawyer-comparison-row'
import { LegalNeedFinder } from '@/components/legal-need-finder'
import { ErrorState } from '@/components/page-state'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api, shouldUseDemoFallback } from '@/lib/api'
import { demoLawyers } from '@/data/lawyers'
import { scrollToLocationHash } from '@/lib/navigation'
import { cn } from '@/lib/utils'

const steps = [
  { icon: FileSearch, number: '01', title: 'Describe the matter', body: 'Choose a legal need, relevant court or jurisdiction, and preferred language.' },
  { icon: UserRoundSearch, number: '02', title: 'Compare the evidence', body: 'Review practice focus, court experience, feedback, languages, and fees together.' },
  { icon: MessageSquareText, number: '03', title: 'Prepare the conversation', body: 'Open a detailed profile and choose a next step when booking is available.' },
]

export function HomePage() {
  const [audience, setAudience] = useState<'client' | 'advocate'>('client')
  const { hash } = useLocation()
  const featuredQuery = useQuery({
    queryKey: ['homepage-featured-lawyers'],
    queryFn: ({ signal }) => api.getLawyers({ sortBy: 'rating', order: 'desc', limit: 3 }, signal),
    retry: false,
  })
  const usingFeaturedDemo = featuredQuery.isError && shouldUseDemoFallback(featuredQuery.error)
  const featuredLawyers = usingFeaturedDemo ? demoLawyers.slice(0, 3) : featuredQuery.data?.data.lawyers.slice(0, 3) || []

  useEffect(() => {
    if (!hash) return
    const frame = window.requestAnimationFrame(() => scrollToLocationHash(hash))
    return () => window.cancelAnimationFrame(frame)
  }, [hash])

  const advocateAudience = audience === 'advocate'

  return (
    <>
      <section className="hero-marketplace">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20 lg:px-8 lg:pb-20">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,.92fr)_minmax(30rem,1.08fr)] lg:gap-14">
            <div className="reveal-up">
              <div className="audience-switch" aria-label="Choose your CaseJeeto path">
                <button type="button" aria-pressed={!advocateAudience} onClick={() => setAudience('client')}><UsersRound className="size-4" aria-hidden="true" /> I need legal help</button>
                <button type="button" aria-pressed={advocateAudience} onClick={() => setAudience('advocate')}><BriefcaseBusiness className="size-4" aria-hidden="true" /> I am an advocate</button>
              </div>
              <p className="eyebrow mt-7">Legal discovery, with context</p>
              <h1 className="text-display mt-4 text-primary">
                {advocateAudience ? 'Let the right clients understand your practice.' : 'Find the right advocate for the conversation ahead.'}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
                {advocateAudience
                  ? 'Present your expertise, court practice, languages, and consultation fee in one clear professional profile.'
                  : 'Compare relevant profile facts in one place, then decide who you want to speak with.'}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={advocateAudience ? '/register?role=lawyer' : '/lawyers'} className={cn(buttonVariants({ size: 'lg' }), 'h-12 bg-seal px-6 text-seal-foreground hover:bg-seal/90')}>
                  {advocateAudience ? 'Build your advocate profile' : 'Explore advocates'} <ArrowRight className="arrow-nudge" aria-hidden="true" />
                </Link>
                <Link to={advocateAudience ? '/#how-it-works' : '/register'} className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-12 px-6')}>
                  {advocateAudience ? 'See how discovery works' : 'Create a client account'}
                </Link>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-mint-strong" aria-hidden="true" /> Private by design</span>
                <span className="flex items-center gap-2"><BadgeIndianRupee className="size-4 text-mint-strong" aria-hidden="true" /> Fees shown when provided</span>
                <span className="flex items-center gap-2"><CalendarCheck2 className="size-4 text-mint-strong" aria-hidden="true" /> No payment while browsing</span>
              </div>
            </div>

            <div className="reveal-up-delayed relative">
              <div className="hero-photo-frame">
                <img src={consultationImage} alt="A client speaking with a legal professional in a bright office" width="1440" height="960" fetchPriority="high" className="h-full w-full object-cover" />
              </div>
              <div className="hero-photo-note">
                <span className="grid size-10 place-items-center rounded-lg bg-mint text-mint-strong"><MessageSquareText className="size-5" aria-hidden="true" /></span>
                <span><strong>Start with a clearer choice</strong><small>Profile facts before the first conversation</small></span>
              </div>
            </div>
          </div>
          <LegalNeedFinder className="mt-10 lg:-mt-4 lg:mx-8" />
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-7xl md:grid-cols-2">
          <Link to="/lawyers" className="intent-path group border-b px-4 py-9 sm:px-6 md:border-b-0 md:border-r lg:px-10">
            <span className="intent-icon bg-primary/7 text-primary"><UsersRound className="size-5" aria-hidden="true" /></span>
            <span className="min-w-0"><strong>I need legal help</strong><small>Compare practice focus, court experience, languages, feedback, and fees.</small></span>
            <ArrowRight className="arrow-nudge size-5 text-primary" aria-hidden="true" />
          </Link>
          <Link to="/register?role=lawyer" className="intent-path group px-4 py-9 sm:px-6 lg:px-10">
            <span className="intent-icon bg-accent text-accent-foreground"><BriefcaseBusiness className="size-5" aria-hidden="true" /></span>
            <span className="min-w-0"><strong>I want better-fit client inquiries</strong><small>Explain your practice clearly and make the first conversation more useful.</small></span>
            <ArrowRight className="arrow-nudge size-5 text-primary" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="section-intro">
            <p className="eyebrow">A clear path forward</p>
            <h2 className="text-section-title mt-3 text-primary">From a legal question to a more prepared first conversation.</h2>
            <p className="mt-4 max-w-2xl text-lg leading-7 text-muted-foreground">Each step reduces uncertainty without suggesting that any legal outcome can be guaranteed.</p>
          </div>
          <div className="process-flow mt-10">
            {steps.map(({ icon: Icon, number, title, body }) => (
              <article key={number} className="process-step">
                <div className="flex items-center justify-between"><span className="text-xs font-bold tracking-[0.14em] text-muted-foreground">STEP {number}</span><span className="grid size-10 place-items-center rounded-lg bg-primary/7 text-primary"><Icon className="size-[18px]" aria-hidden="true" /></span></div>
                <h3 className="mt-10 text-xl font-semibold tracking-[-0.02em] text-primary">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary py-20 text-primary-foreground sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow text-coral-soft">Evidence you can compare</p>
              <h2 className="text-section-title mt-3 text-white">A shortlist that reads like a useful brief.</h2>
              <p className="mt-4 text-lg leading-7 text-white/65">Profile data is loaded from the CaseJeeto directory. Demo records appear only when development fallback is enabled.</p>
            </div>
            <Link to="/lawyers" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'h-11 shrink-0 border-white bg-white px-5 text-primary hover:bg-white/90')}>View all advocates <ArrowRight className="arrow-nudge" aria-hidden="true" /></Link>
          </div>

          {usingFeaturedDemo && <p className="mt-8 rounded-lg border border-white/15 bg-white/6 px-4 py-3 text-sm text-white/70">Sample profiles follow. Their names, ratings, reviews, fees, and portraits are representative demo data shown because the API is unreachable.</p>}
          <div className={cn('lawyer-results-list overflow-hidden rounded-2xl border border-white/15 bg-primary-strong', usingFeaturedDemo ? 'mt-4' : 'mt-10')}>
            {featuredQuery.isLoading ? (
              <div className="divide-y divide-white/10" aria-label="Loading advocate profiles" aria-busy="true">{[0, 1, 2].map((item) => <div key={item} className="grid gap-4 p-5 sm:grid-cols-[5rem_1fr]"><Skeleton className="size-20 rounded-xl bg-white/10" /><div className="space-y-3"><Skeleton className="h-5 w-48 bg-white/10" /><Skeleton className="h-4 w-full bg-white/10" /><Skeleton className="h-4 w-3/4 bg-white/10" /></div></div>)}</div>
            ) : featuredQuery.isError && !usingFeaturedDemo ? (
              <div className="bg-card p-6 text-foreground"><ErrorState title="Featured advocates unavailable" message="We could not load advocate profiles from the live directory." onRetry={() => void featuredQuery.refetch()} /></div>
            ) : featuredLawyers.length ? (
              <div className="divide-y divide-white/12">{featuredLawyers.map((lawyer, index) => <LawyerComparisonRow key={lawyer._id} lawyer={lawyer} tone="dark" priorityImage={index === 0} />)}</div>
            ) : (
              <p className="p-8 text-center text-sm text-white/65">No featured profiles are available right now. Browse the directory to adjust your criteria.</p>
            )}
          </div>
        </div>
      </section>

      <section id="for-advocates" className="scroll-mt-24 py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[.88fr_1.12fr] lg:px-8">
          <div>
            <p className="eyebrow">Built for advocates too</p>
            <h2 className="text-section-title mt-3 text-primary">Make your practice easier to understand before the first call.</h2>
            <p className="mt-5 max-w-xl text-lg leading-7 text-muted-foreground">A structured profile helps potential clients see your focus, experience, languages, and fee without turning your work into a commodity.</p>
            <ul className="mt-7 grid gap-3 text-sm text-foreground">
              {['Present practice areas and court experience clearly', 'Set consultation fees and manage profile details', 'Keep new inquiries and next steps organised'].map((item) => <li key={item} className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-lg bg-mint text-mint-strong"><Check className="size-4" aria-hidden="true" /></span>{item}</li>)}
            </ul>
            <Link to="/register?role=lawyer" className={cn(buttonVariants({ size: 'lg' }), 'mt-8 h-11 px-5')}>Join as an advocate <ArrowRight className="arrow-nudge" aria-hidden="true" /></Link>
          </div>

          <div className="workspace-preview" role="group" aria-label="Illustrative advocate workspace preview">
            <div className="flex items-center justify-between border-b px-5 py-4"><div><p className="text-sm font-semibold text-primary">Practice overview</p><p className="text-xs text-muted-foreground">Illustrative product preview</p></div><span className="rounded-lg bg-mint px-2.5 py-1 text-xs font-semibold text-mint-strong">Profile active</span></div>
            <div className="grid gap-3 p-5 sm:grid-cols-[.7fr_1.3fr]">
              <div className="grid gap-3"><div className="preview-stat"><span>Profile completeness</span><strong>82%</strong><small>2 sections to review</small></div><div className="preview-stat"><span>Consultation fee</span><strong>₹1,800</strong><small>Visible on profile</small></div></div>
              <div className="rounded-xl border bg-card p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Recent inquiries</p>{[['AK', 'Property documentation', 'Hindi'], ['RS', 'Employment contract', 'English'], ['PN', 'Consumer complaint', 'Hindi']].map(([initials, matter, language]) => <div key={matter} className="flex items-center gap-3 border-b py-3 last:border-b-0"><span className="grid size-9 place-items-center rounded-lg bg-primary/7 text-xs font-bold text-primary">{initials}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{matter}</strong><small className="text-muted-foreground">Preferred language: {language}</small></span><span className="size-2 rounded-full bg-seal" aria-label="New inquiry" /></div>)}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20 sm:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="cta-marketplace">
            <div className="max-w-3xl"><p className="eyebrow text-coral-soft">Start with context</p><h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-5xl">A better first legal conversation starts with a clearer choice.</h2><p className="mt-4 text-lg text-white/70">Explore profile evidence and choose the next step that fits your matter.</p></div>
            <Link to="/lawyers" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'h-12 shrink-0 border-white bg-white px-6 text-primary hover:bg-white/90')}>Find an advocate <ArrowRight className="arrow-nudge" aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
    </>
  )
}
