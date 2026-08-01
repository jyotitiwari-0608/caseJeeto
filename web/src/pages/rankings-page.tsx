import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, MessageSquareText, Scale, Star, TrendingUp, Trophy } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { DemoDataNotice } from '@/components/demo-data-notice'
import { ErrorState } from '@/components/page-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { demoLawyers, practiceAreas } from '@/data/lawyers'
import { ApiError, api, shouldUseDemoFallback } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Lawyer, LawyerRanking } from '@/types/api'

const RATING_WEIGHT = 0.4
const VOLUME_WEIGHT = 0.6

function scoreLawyer(lawyer: Pick<Lawyer, 'rating' | 'totalConsultations'>, min: number, max: number) {
  const flat = max === min
  const volumeScore = flat ? 0.5 : (lawyer.totalConsultations - min) / (max - min)
  const ratingScore = lawyer.rating > 0 ? lawyer.rating / 5 : 0
  const score = (RATING_WEIGHT * ratingScore + VOLUME_WEIGHT * volumeScore) * 100
  return Math.round(score * 10) / 10
}

function buildDemoRankings(specialization: string): LawyerRanking[] {
  const lawyers = specialization
    ? demoLawyers.filter((lawyer) => lawyer.specialization.includes(specialization))
    : [...demoLawyers]
  const consultations = lawyers.map((lawyer) => lawyer.totalConsultations)
  const min = consultations.length ? Math.min(...consultations) : 0
  const max = consultations.length ? Math.max(...consultations) : 0
  return [...lawyers]
    .sort((a, b) => {
      const byScore = scoreLawyer(b, min, max) - scoreLawyer(a, min, max)
      if (byScore !== 0) return byScore
      const byRating = b.rating - a.rating
      if (byRating !== 0) return byRating
      return b.totalConsultations - a.totalConsultations
    })
    .map((lawyer, index) => ({ rank: index + 1, score: scoreLawyer(lawyer, min, max), lawyer }))
}

function initials(name: string) {
  return name.replace(/^Adv\.\s*/, '').split(' ').slice(0, 2).map((part) => part[0]).join('')
}

const medalStyles: Record<number, string> = {
  1: 'bg-amber-100 text-amber-700 ring-amber-300',
  2: 'bg-slate-100 text-slate-600 ring-slate-300',
  3: 'bg-orange-100 text-orange-700 ring-orange-300',
}

const podiumOrder = [2, 1, 3]

function PodiumCard({ ranking, highlight }: { ranking: LawyerRanking; highlight: boolean }) {
  const { rank, score, lawyer } = ranking
  return (
    <div className={cn('flex flex-col items-center rounded-2xl border bg-card p-6 text-center shadow-[var(--shadow-small)]', highlight && 'border-primary/40 ring-1 ring-primary/20')}>
      <span className={cn('grid size-10 place-items-center rounded-full ring-2', medalStyles[rank])}>
        {rank === 1 ? <Trophy className="size-5" aria-hidden="true" /> : <span className="text-sm font-bold">{rank}</span>}
      </span>
      <Avatar className="mt-4 size-20 rounded-2xl">
        <AvatarImage src={lawyer.profilePhoto} alt={`Portrait of ${lawyer.user.name}`} loading={highlight ? 'eager' : 'lazy'} className="object-cover" />
        <AvatarFallback className="rounded-2xl bg-secondary font-heading text-lg text-primary">{initials(lawyer.user.name)}</AvatarFallback>
      </Avatar>
      <h3 className="mt-3 truncate text-base font-semibold tracking-[-0.02em] text-primary">{lawyer.user.name}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{lawyer.specialization[0]}</p>
      <dl className="mt-4 grid w-full grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted px-2 py-2">
          <dt className="flex items-center justify-center gap-1 text-muted-foreground"><Star className="size-3 fill-current text-rating" aria-hidden="true" /> Rating</dt>
          <dd className="mt-0.5 font-semibold">{lawyer.rating.toFixed(1)}</dd>
        </div>
        <div className="rounded-lg bg-muted px-2 py-2">
          <dt className="flex items-center justify-center gap-1 text-muted-foreground"><Scale className="size-3" aria-hidden="true" /> Cases</dt>
          <dd className="mt-0.5 font-semibold">{lawyer.totalConsultations.toLocaleString('en-IN')}</dd>
        </div>
      </dl>
      <p className="mt-3 text-lg font-bold text-primary">{score.toFixed(1)}<span className="text-xs font-medium text-muted-foreground"> / 100</span></p>
      <Link to={`/lawyers/${lawyer._id}`} className={cn(buttonVariants({ variant: highlight ? 'default' : 'outline', size: 'sm' }), 'mt-4 h-9 gap-1.5')}>View profile <ArrowRight className="arrow-nudge size-3.5" aria-hidden="true" /></Link>
    </div>
  )
}

function RankingRow({ ranking }: { ranking: LawyerRanking }) {
  const { rank, score, lawyer } = ranking
  return (
    <article className="grid items-center gap-4 border-b p-5 last:border-b-0 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto]">
      <div className="flex items-center justify-center">
        {rank <= 3 ? (
          <span className={cn('grid size-10 place-items-center rounded-full ring-2', medalStyles[rank])}>{rank === 1 ? <Trophy className="size-5" aria-hidden="true" /> : <span className="text-sm font-bold">{rank}</span>}</span>
        ) : (
          <span className="font-heading text-2xl font-bold tracking-[-0.04em] text-muted-foreground/50">{rank}</span>
        )}
      </div>
      <div className="flex min-w-0 items-center gap-4">
        <Avatar className="size-14 shrink-0 rounded-xl">
          <AvatarImage src={lawyer.profilePhoto} alt={`Portrait of ${lawyer.user.name}`} loading="lazy" className="object-cover" />
          <AvatarFallback className="rounded-xl bg-secondary font-heading text-primary">{initials(lawyer.user.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h3 className="truncate font-semibold tracking-[-0.02em] text-primary">{lawyer.user.name}</h3>
          <p className="mt-1 truncate text-sm text-muted-foreground">{lawyer.specialization.slice(0, 2).join(' · ') || 'General practice'}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Star className="size-3 fill-current text-rating" aria-hidden="true" /> {lawyer.rating.toFixed(1)} <span className="text-muted-foreground/70">({lawyer.reviewCount})</span></span>
            <span className="flex items-center gap-1"><Scale className="size-3" aria-hidden="true" /> {lawyer.totalConsultations.toLocaleString('en-IN')} cases</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="w-36 text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="text-sm text-muted-foreground">Score</span>
            <span className="font-bold text-primary">{score.toFixed(1)}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
            <div className="h-full rounded-full bg-seal" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
          </div>
        </div>
        <Link to={`/lawyers/${lawyer._id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>View profile</Link>
      </div>
    </article>
  )
}

function RankingsSkeleton() {
  return (
    <div aria-label="Loading advocate rankings" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="rounded-2xl border bg-card p-6"><div className="mx-auto size-10 rounded-full bg-muted" /><div className="mx-auto mt-4 size-20 rounded-2xl bg-muted" /><div className="mx-auto mt-4 h-4 w-32 bg-muted" /><div className="mt-3 h-3 w-24 bg-muted" /></div>)}
      </div>
      <div className="mt-8 overflow-hidden rounded-2xl border bg-card">{Array.from({ length: 5 }, (_, index) => <div key={index} className="flex items-center gap-4 border-b p-5 last:border-b-0"><div className="size-10 rounded-full bg-muted" /><div className="size-14 rounded-xl bg-muted" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-44" /><Skeleton className="h-3 w-56" /></div></div>)}</div>
    </div>
  )
}

export function RankingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedSpecialization = searchParams.get('specialization') || ''
  const specialization = practiceAreas.includes(requestedSpecialization) ? requestedSpecialization : ''
  const requestedPage = Number(searchParams.get('page'))
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 1_000) : 1
  const [showFormula, setShowFormula] = useState(false)

  const query = useQuery({
    queryKey: ['lawyer-rankings', specialization, page],
    queryFn: ({ signal }) => api.getLawyerRankings({ specialization: specialization || undefined, page, limit: 12 }, signal),
    retry: false,
  })
  const usingDemo = query.isError && shouldUseDemoFallback(query.error)

  const demoRankings = useMemo(() => buildDemoRankings(specialization), [specialization])

  const rankings = usingDemo ? demoRankings : query.data?.data.rankings || []
  const total = usingDemo ? demoRankings.length : query.data?.meta.total || 0
  const totalPages = usingDemo ? 1 : query.data?.meta.totalPages || 1
  const showPodium = page === 1
  const podium = showPodium ? podiumOrder.map((rank) => rankings.find((item) => item.rank === rank)).filter((item): item is LawyerRanking => Boolean(item)) : []
  const listed = showPodium ? rankings.filter((item) => item.rank > 3) : rankings

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value); else next.delete(key)
    if (key !== 'page') next.delete('page')
    setSearchParams(next)
  }

  return (
    <>
      <section className="directory-hero border-b">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="max-w-3xl reveal-up">
            <p className="eyebrow">Advocate rankings</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] text-primary sm:text-6xl">The advocates clients consult most, ranked.</h1>
            <p className="mt-5 max-w-2xl text-lg leading-7 text-muted-foreground">A transparent leaderboard of approved advocate profiles weighted by client feedback and case volume.</p>
          </div>
          <div className="mt-8 flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-end">
            <div className="grid gap-1.5">
              <Label htmlFor="ranking-practice">Practice area</Label>
              <select id="ranking-practice" value={specialization} onChange={(event) => setParam('specialization', event.target.value)} className="field-control h-12 w-full min-w-64">
                <option value="">All practice areas</option>
                {practiceAreas.map((area) => <option key={area} value={area}>{area}</option>)}
              </select>
            </div>
            <Button variant="outline" size="lg" className="h-12" onClick={() => setShowFormula((value) => !value)}>How is this ranked?</Button>
          </div>
          {showFormula && (
            <div className="mt-5 max-w-4xl rounded-xl border bg-card p-5 shadow-[var(--shadow-small)]">
              <p className="text-sm font-semibold text-primary">Ranking formula</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Every approved, visible profile gets a score from 0 to 100. Case volume is normalised to the range of the current result set, so a score is only meaningful within this list.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg bg-muted p-3"><Star className="size-4 shrink-0 text-rating" aria-hidden="true" /><span className="text-sm"><strong>Client rating</strong><span className="text-muted-foreground"> — rating out of 5, {Math.round(RATING_WEIGHT * 100)}% weight</span></span></div>
                <div className="flex items-center gap-3 rounded-lg bg-muted p-3"><Scale className="size-4 shrink-0 text-primary" aria-hidden="true" /><span className="text-sm"><strong>Cases solved</strong><span className="text-muted-foreground"> — consultations, normalised, {Math.round(VOLUME_WEIGHT * 100)}% weight</span></span></div>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {usingDemo && <div className="mb-6"><DemoDataNotice /></div>}
        <div className="mb-5 flex items-center justify-between border-b pb-5">
          <div>
            <p className="flex items-center gap-2 font-semibold text-primary" aria-live="polite"><Trophy className="size-4" aria-hidden="true" /> {query.isLoading ? 'Calculating rankings…' : `${total} ranked advocate${total === 1 ? '' : 's'}`}</p>
            <p className="mt-1 text-sm text-muted-foreground">Ranked by rating and case volume{specialization ? ` within ${specialization}` : ''}.</p>
          </div>
        </div>

        {query.isLoading ? <RankingsSkeleton /> : query.isError && !usingDemo ? <ErrorState title="Advocate rankings unavailable" message={query.error instanceof ApiError ? query.error.message : 'The rankings could not be loaded.'} onRetry={() => void query.refetch()} /> : rankings.length > 0 ? (
          <>
            {podium.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-3">
                {podium.map((ranking) => <PodiumCard key={ranking.lawyer._id} ranking={ranking} highlight={ranking.rank === 1} />)}
              </div>
            )}
            {listed.length > 0 && (
              <div className={cn('overflow-hidden rounded-2xl border bg-card', podium.length > 0 && 'mt-6')}>{listed.map((ranking) => <RankingRow key={ranking.lawyer._id} ranking={ranking} />)}</div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border bg-card py-16 text-center">
            <MessageSquareText className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold text-primary">No ranked profiles yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">No approved advocate profiles match this practice area yet. Try a different filter.</p>
            <Button variant="outline" className="mt-5" onClick={() => setSearchParams({})}>Clear filters</Button>
          </div>
        )}
        {!usingDemo && !query.isLoading && totalPages > 1 && <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Ranking pages"><Button variant="outline" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>Previous</Button><span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span><Button variant="outline" disabled={page >= totalPages} onClick={() => setParam('page', String(page + 1))}>Next</Button></nav>}
        {!usingDemo && !query.isLoading && rankings.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><TrendingUp className="size-3.5" aria-hidden="true" /> Scores update as client feedback and case volume change.</div>
        )}
      </div>
    </>
  )
}
