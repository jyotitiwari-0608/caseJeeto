import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { DemoDataNotice } from '@/components/demo-data-notice'
import { LawyerComparisonRow } from '@/components/lawyer-comparison-row'
import { ErrorState } from '@/components/page-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { demoLawyers, practiceAreas } from '@/data/lawyers'
import { ApiError, api, shouldUseDemoFallback } from '@/lib/api'
import { lawyerSearchDestination } from '@/lib/discovery'
import type { LawyerFilters } from '@/types/api'

const languages = ['English', 'Hindi', 'Punjabi', 'Urdu', 'Telugu']
const courts = ['Delhi High Court', 'Supreme Court', 'District Courts', 'Family Courts', 'Consumer Commissions', 'Labour Courts', 'NCLT Delhi']
const sortOptions: Array<{ label: string; value: string; sortBy: LawyerFilters['sortBy']; order: LawyerFilters['order'] }> = [
  { label: 'Top rated', value: 'rating-desc', sortBy: 'rating', order: 'desc' },
  { label: 'Most experienced', value: 'experience-desc', sortBy: 'experience', order: 'desc' },
  { label: 'Fee: low to high', value: 'fee-asc', sortBy: 'fee', order: 'asc' },
  { label: 'Most consulted', value: 'consultations-desc', sortBy: 'consultations', order: 'desc' },
]

function SelectField({ id, label, value, onChange, options, anyLabel }: { id: string; label: string; value: string; onChange: (value: string) => void; options: string[]; anyLabel?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="field-control">
        <option value="">{anyLabel || `Any ${label.toLowerCase()}`}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  )
}

interface FilterPanelProps {
  specialization: string
  language: string
  court: string
  maxFee: string
  minExperience: string
  setParam: (key: string, value: string) => void
  clear: () => void
  idPrefix: string
}

function FilterPanel({ specialization, language, court, maxFee, minExperience, setParam, clear, idPrefix }: FilterPanelProps) {
  return (
    <div className="grid gap-5">
      <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Your criteria</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-primary">Refine results</h2></div><Button variant="ghost" size="sm" onClick={clear}>Clear</Button></div>
      <SelectField id={`${idPrefix}-practice`} label="Practice area" value={specialization} onChange={(value) => setParam('specialization', value)} options={practiceAreas} />
      <SelectField id={`${idPrefix}-court`} label="Court or jurisdiction" value={court} onChange={(value) => setParam('court', value)} options={courts} anyLabel="Any court or jurisdiction" />
      <SelectField id={`${idPrefix}-language`} label="Language" value={language} onChange={(value) => setParam('language', value)} options={languages} />
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-max-fee`}>Maximum consultation fee</Label>
        <select id={`${idPrefix}-max-fee`} value={maxFee} onChange={(event) => setParam('maxFee', event.target.value)} className="field-control">
          <option value="">Any fee</option><option value="1500">Up to ₹1,500</option><option value="2000">Up to ₹2,000</option><option value="2500">Up to ₹2,500</option>
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-experience`}>Minimum experience</Label>
        <select id={`${idPrefix}-experience`} value={minExperience} onChange={(event) => setParam('minExperience', event.target.value)} className="field-control">
          <option value="">Any experience</option><option value="5">5+ years</option><option value="10">10+ years</option><option value="15">15+ years</option>
        </select>
      </div>
    </div>
  )
}

function DirectoryRowsSkeleton() {
  return <div className="overflow-hidden rounded-2xl border bg-card" aria-label="Loading advocate profiles" aria-busy="true">{Array.from({ length: 4 }, (_, index) => <div key={index} className="grid gap-4 border-b p-5 last:border-b-0"><div className="flex gap-4"><Skeleton className="size-20 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-5 w-44" /><Skeleton className="h-4 w-32" /><Skeleton className="h-5 w-28" /></div></div><div className="grid grid-cols-2 gap-3"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div><Skeleton className="h-11 w-36" /></div>)}</div>
}

export function LawyersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawName = (searchParams.get('name') || '').slice(0, 100)
  const [searchDraft, setSearchDraft] = useState(rawName)
  const requestedSpecialization = searchParams.get('specialization') || ''
  const specialization = practiceAreas.includes(requestedSpecialization) ? requestedSpecialization : ''
  const requestedLanguage = searchParams.get('language') || ''
  const language = languages.includes(requestedLanguage) ? requestedLanguage : ''
  const court = (searchParams.get('court') || '').slice(0, 100)
  const requestedFee = Number(searchParams.get('maxFee'))
  const maxFee = Number.isFinite(requestedFee) && requestedFee > 0 ? String(Math.min(Math.round(requestedFee), 100_000)) : ''
  const requestedExperience = Number(searchParams.get('minExperience'))
  const minExperience = Number.isFinite(requestedExperience) && requestedExperience > 0 ? String(Math.min(Math.round(requestedExperience), 70)) : ''
  const requestedSort = searchParams.get('sort') || 'rating-desc'
  const sortValue = sortOptions.some((option) => option.value === requestedSort) ? requestedSort : 'rating-desc'
  const requestedPage = Number(searchParams.get('page'))
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 1_000) : 1
  const selectedSort = sortOptions.find((option) => option.value === sortValue) || sortOptions[0]

  const filters = useMemo<LawyerFilters>(() => ({
    name: rawName || undefined,
    specialization: specialization || undefined,
    language: language || undefined,
    court: court || undefined,
    maxFee: maxFee ? Number(maxFee) : undefined,
    minExperience: minExperience ? Number(minExperience) : undefined,
    sortBy: selectedSort.sortBy,
    order: selectedSort.order,
    page,
    limit: 12,
  }), [rawName, specialization, language, court, maxFee, minExperience, selectedSort, page])

  const query = useQuery({ queryKey: ['lawyers', filters], queryFn: ({ signal }) => api.getLawyers(filters, signal), retry: false })
  const usingDemo = query.isError && shouldUseDemoFallback(query.error)

  useEffect(() => setSearchDraft(rawName), [rawName])

  const demoResults = useMemo(() => {
    const name = filters.name?.toLowerCase()
    const courtQuery = filters.court?.toLowerCase()
    const result = demoLawyers.filter((lawyer) =>
      (!name || lawyer.user.name.toLowerCase().includes(name) || lawyer.specialization.some((area) => area.toLowerCase().includes(name))) &&
      (!filters.specialization || lawyer.specialization.includes(filters.specialization)) &&
      (!filters.language || lawyer.languages.includes(filters.language)) &&
      (!courtQuery || lawyer.courtsPracticed.some((item) => item.toLowerCase().includes(courtQuery))) &&
      (!filters.maxFee || lawyer.consultationFee <= filters.maxFee) &&
      (!filters.minExperience || lawyer.yearsOfExperience >= filters.minExperience)
    )
    return [...result].sort((a, b) => {
      const direction = filters.order === 'asc' ? 1 : -1
      const field = filters.sortBy === 'fee' ? 'consultationFee' : filters.sortBy === 'experience' ? 'yearsOfExperience' : filters.sortBy === 'consultations' ? 'totalConsultations' : 'rating'
      return (a[field] - b[field]) * direction
    })
  }, [filters])

  const lawyers = usingDemo ? demoResults : query.data?.data.lawyers || []
  const total = usingDemo ? demoResults.length : query.data?.meta.total || 0
  const totalPages = usingDemo ? 1 : query.data?.meta.totalPages || 1

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value); else next.delete(key)
    if (key !== 'page') next.delete('page')
    setSearchParams(next)
  }

  function clearFilters() {
    setSearchDraft('')
    setSearchParams(sortValue === 'rating-desc' ? {} : { sort: sortValue })
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault()
    const destination = new URL(lawyerSearchDestination(searchDraft), 'https://casejeeto.local')
    const next = new URLSearchParams(destination.searchParams)
    if (sortValue !== 'rating-desc') next.set('sort', sortValue)
    setSearchParams(next)
  }

  const activeFilters = [specialization, court, language, maxFee && `Up to ₹${Number(maxFee).toLocaleString('en-IN')}`, minExperience && `${minExperience}+ years`].filter(Boolean)

  return (
    <>
      <section className="directory-hero border-b">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="max-w-3xl reveal-up">
            <p className="eyebrow">Advocate directory</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] text-primary sm:text-6xl">Compare the facts that matter to your case.</h1>
            <p className="mt-5 max-w-2xl text-lg leading-7 text-muted-foreground">Search profiles by practice focus, court or jurisdiction, language, experience, and consultation fee.</p>
          </div>
          <form onSubmit={submitSearch} className="mt-8 flex max-w-4xl flex-col gap-2 rounded-xl border bg-card p-2 shadow-[var(--shadow-small)] sm:flex-row" role="search">
            <div className="relative flex-1"><Search className="absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input className="h-12 border-0 bg-transparent pl-10 text-base shadow-none focus-visible:ring-0" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Advocate name or recognised practice area" aria-label="Search by advocate name or practice area" /></div>
            <Button type="submit" size="lg" className="h-12 px-6">Search</Button>
            <Sheet>
              <SheetTrigger render={<Button type="button" variant="outline" size="lg" className="h-12 lg:hidden" />}><SlidersHorizontal aria-hidden="true" /> Filters</SheetTrigger>
              <SheetContent side="right"><SheetHeader><SheetTitle>Filter advocates</SheetTitle><SheetDescription>Choose the profile facts relevant to your matter.</SheetDescription></SheetHeader><div className="px-4 pb-6"><FilterPanel idPrefix="mobile" {...{ specialization, language, court, maxFee, minExperience, setParam, clear: clearFilters }} /></div></SheetContent>
            </Sheet>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {usingDemo && <div className="mb-6"><DemoDataNotice /></div>}
        <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="hidden lg:block"><div className="sticky top-24 rounded-xl border bg-card p-5"><FilterPanel idPrefix="desktop" {...{ specialization, language, court, maxFee, minExperience, setParam, clear: clearFilters }} /></div></aside>
          <div>
            <div className="mb-5 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-semibold text-primary" aria-live="polite">{query.isLoading ? 'Finding advocates…' : `${total} advocate${total === 1 ? '' : 's'} found`}</p>{activeFilters.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{activeFilters.map((filter) => <Badge key={filter} variant="secondary">{filter}</Badge>)}<Button variant="ghost" size="xs" onClick={clearFilters}><X aria-hidden="true" /> Clear</Button></div>}</div>
              <div className="flex items-center gap-2"><Label htmlFor="sort" className="shrink-0 text-muted-foreground">Sort by</Label><select id="sort" className="field-control h-10 w-auto" value={sortValue} onChange={(event) => setParam('sort', event.target.value)}>{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
            </div>

            {query.isLoading ? <DirectoryRowsSkeleton /> : query.isError && !usingDemo ? <ErrorState title="Advocate directory unavailable" message={query.error instanceof ApiError ? query.error.message : 'The directory could not be loaded.'} onRetry={() => void query.refetch()} /> : lawyers.length > 0 ? (
              <div className="lawyer-results-list overflow-hidden rounded-2xl border bg-card">{lawyers.map((lawyer, index) => <LawyerComparisonRow key={lawyer._id} lawyer={lawyer} priorityImage={index === 0} />)}</div>
            ) : (
              <div className="rounded-2xl border bg-card py-16 text-center"><Search className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-4 text-xl font-semibold text-primary">No exact matches yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Try a broader practice area, higher fee range, or fewer filters.</p><Button variant="outline" className="mt-5" onClick={clearFilters}>Clear all filters</Button></div>
            )}
            {!usingDemo && !query.isLoading && totalPages > 1 && <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Directory pages"><Button variant="outline" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>Previous</Button><span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span><Button variant="outline" disabled={page >= totalPages} onClick={() => setParam('page', String(page + 1))}>Next</Button></nav>}
          </div>
        </div>
      </div>
    </>
  )
}
