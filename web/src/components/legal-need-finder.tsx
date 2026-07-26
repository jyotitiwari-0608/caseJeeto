import { useState } from 'react'
import { ArrowRight, BriefcaseBusiness, Building2, Gavel, Home, Scale, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { practiceAreas } from '@/data/lawyers'
import { cn } from '@/lib/utils'

const legalNeeds = [
  { label: 'Family Law', helper: 'Marriage & family', icon: UsersRound },
  { label: 'Criminal Law', helper: 'Bail & defence', icon: Gavel },
  { label: 'Property Law', helper: 'Property & tenancy', icon: Home },
  { label: 'Corporate Law', helper: 'Business & contracts', icon: Building2 },
  { label: 'Consumer Law', helper: 'Goods & services', icon: Scale },
  { label: 'Employment Law', helper: 'Workplace matters', icon: BriefcaseBusiness },
] as const

const courts = ['Delhi High Court', 'Supreme Court', 'District Courts', 'Family Courts', 'Consumer Commissions', 'Labour Courts']
const languages = ['English', 'Hindi', 'Punjabi', 'Urdu', 'Telugu']

interface LegalNeedFinderProps {
  className?: string
  initialSpecialization?: string
  initialCourt?: string
  initialLanguage?: string
}

export function LegalNeedFinder({ className, initialSpecialization = 'Family Law', initialCourt = '', initialLanguage = '' }: LegalNeedFinderProps) {
  const navigate = useNavigate()
  const [specialization, setSpecialization] = useState(practiceAreas.includes(initialSpecialization) ? initialSpecialization : '')
  const [court, setCourt] = useState(initialCourt)
  const [language, setLanguage] = useState(initialLanguage)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (specialization) params.set('specialization', specialization)
    if (court) params.set('court', court)
    if (language) params.set('language', language)
    navigate(`/lawyers${params.size ? `?${params.toString()}` : ''}`)
  }

  return (
    <form onSubmit={submit} className={cn('finder-panel', className)} aria-label="Find an advocate by legal need">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Start with your legal need</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-primary sm:text-2xl">Find relevant advocate profiles</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose the facts that matter. You can refine them in the directory.</p>
        </div>
        <span className="hidden rounded-lg bg-primary/7 px-3 py-2 text-xs font-semibold text-primary sm:inline-flex">Step 1 of 2</span>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-foreground">What do you need help with?</legend>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          {legalNeeds.map(({ label, helper, icon: Icon }) => {
            const selected = specialization === label
            return (
              <button
                key={label}
                type="button"
                aria-pressed={selected}
                onClick={() => setSpecialization(selected ? '' : label)}
                className="legal-need-chip"
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="min-w-0 text-left">
                  <strong className="block truncate text-sm">{label.replace(' Law', '')}</strong>
                  <small className="block truncate text-[0.7rem] text-muted-foreground">{helper}</small>
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="finder-court">Court or jurisdiction</Label>
          <select id="finder-court" value={court} onChange={(event) => setCourt(event.target.value)} className="field-control">
            <option value="">Any court or jurisdiction</option>
            {courts.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="finder-language">Preferred language</Label>
          <select id="finder-language" value={language} onChange={(event) => setLanguage(event.target.value)} className="field-control">
            <option value="">Any language</option>
            {languages.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <Button type="submit" size="lg" className="h-12 bg-seal px-5 text-seal-foreground hover:bg-seal/90">
          Show matching advocates <ArrowRight className="arrow-nudge" aria-hidden="true" />
        </Button>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">Browsing profiles does not create a booking or take payment. Availability is shown only when supplied by the CaseJeeto service.</p>
    </form>
  )
}
