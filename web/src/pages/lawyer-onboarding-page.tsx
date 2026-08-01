import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, FileCheck2, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ErrorState } from '@/components/page-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/auth-context'
import { practiceAreas } from '@/data/lawyers'
import { ApiError, api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { privateQueryKey } from '@/lib/session'

const languageOptions = ['English', 'Hindi', 'Punjabi', 'Urdu', 'Tamil', 'Telugu', 'Marathi', 'Bengali']

function LawyerProfileEditor() {
  const { user, accessToken, isCurrentAccount } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const profileHydrated = useRef(false)
  const [specializations, setSpecializations] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>([])
  const [yearsOfExperience, setYearsOfExperience] = useState('')
  const [consultationFee, setConsultationFee] = useState('')
  const [courts, setCourts] = useState('')
  const [officeAddress, setOfficeAddress] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const profileQuery = useQuery({
    queryKey: privateQueryKey('lawyer-profile', user!.id),
    queryFn: ({ signal }) => api.getLawyerProfile(accessToken!, signal, { expectedUserId: user!.id, isCurrentAccount }),
    enabled: Boolean(user && accessToken),
    retry: false,
  })

  useEffect(() => {
    if (!profileQuery.data || profileHydrated.current) return
    const { lawyer } = profileQuery.data
    setSpecializations(lawyer.specialization)
    setLanguages(lawyer.languages)
    setYearsOfExperience(String(lawyer.yearsOfExperience))
    setConsultationFee(String(lawyer.consultationFee))
    setCourts(lawyer.courtsPracticed.join(', '))
    setOfficeAddress(lawyer.officeAddress || '')
    setBio(lawyer.bio || '')
    profileHydrated.current = true
  }, [profileQuery.data])

  function toggleValue(value: string, selected: string[], setter: (next: string[]) => void) {
    setter(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value])
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!accessToken) return
    const expectedUserId = user!.id
    const authScope = { expectedUserId, isCurrentAccount }
    if (yearsOfExperience === '' || consultationFee === '') {
      setError('Enter your years of experience and consultation fee before saving.')
      return
    }
    const payload = {
      specialization: specializations,
      languages,
      yearsOfExperience: Number(yearsOfExperience),
      consultationFee: Number(consultationFee),
      courtsPracticed: courts.split(',').map((court) => court.trim()).filter(Boolean),
      officeAddress: officeAddress.trim(),
      bio: bio.trim(),
    }
    setError('')
    setIsSubmitting(true)
    try {
      const updatedProfile = await api.updateLawyerProfile(payload, accessToken, authScope)
      if (!isCurrentAccount(expectedUserId)) return
      queryClient.setQueryData(privateQueryKey('lawyer-profile', expectedUserId), updatedProfile)
      toast.success('Professional profile saved', { description: 'You can now continue with verification and availability.' })
      navigate('/lawyer/dashboard')
    } catch (caught) {
      if (!isCurrentAccount(expectedUserId) || (caught instanceof ApiError && caught.kind === 'superseded')) return
      setError(caught instanceof ApiError ? caught.message : 'Your profile could not be saved. Please check the API connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (profileQuery.isLoading) {
    return <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8" aria-label="Loading professional profile" aria-busy="true"><Skeleton className="h-5 w-44" /><Skeleton className="h-12 max-w-xl" /><Skeleton className="h-6 max-w-2xl" /><Skeleton className="h-80 w-full" /></div>
  }

  if (profileQuery.isError && !profileQuery.data) {
    return <div className="mx-auto max-w-3xl px-4 py-16"><ErrorState title="Professional profile unavailable" message={profileQuery.error instanceof ApiError ? profileQuery.error.message : 'Your existing profile could not be loaded. Your data has not been changed.'} onRetry={() => void profileQuery.refetch()} /></div>
  }

  return (
    <div className="bg-muted/25">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/lawyer/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back to advocate desk</Link>
        <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div>
            <div className="border-b pb-7"><Badge variant="outline"><BadgeCheck /> Professional profile</Badge><h1 className="mt-4 font-heading text-4xl font-semibold tracking-tight">Build a profile clients can assess.</h1><p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Review and edit the professional details currently stored on your account. Saving updates the complete form shown below.</p></div>
            {error && <Alert variant="destructive" className="mt-6"><ShieldCheck /><AlertTitle>Profile not saved</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
            <form onSubmit={submit} className="mt-8 space-y-8">
              <section>
                <div className="flex items-start gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">1</span><div><h2 className="font-heading text-xl font-semibold">Practice focus</h2><p className="mt-1 text-sm text-muted-foreground">Choose the areas that best represent your current work.</p></div></div>
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {practiceAreas.map((area) => <button key={area} type="button" aria-pressed={specializations.includes(area)} onClick={() => toggleValue(area, specializations, setSpecializations)} className={cn('flex min-h-12 items-center justify-between rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-muted', specializations.includes(area) && 'border-primary bg-primary/5 text-primary')}><span>{area}</span>{specializations.includes(area) && <CheckCircle2 className="size-4" />}</button>)}
                </div>
              </section>

              <section className="border-t pt-8">
                <div className="flex items-start gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">2</span><div><h2 className="font-heading text-xl font-semibold">Professional evidence</h2><p className="mt-1 text-sm text-muted-foreground">These details appear directly in client comparisons.</p></div></div>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div className="grid gap-2"><Label htmlFor="experience">Years of experience</Label><Input id="experience" type="number" min="0" step="any" required value={yearsOfExperience} onChange={(event) => setYearsOfExperience(event.target.value)} placeholder="e.g. 8" /></div>
                  <div className="grid gap-2"><Label htmlFor="fee">Consultation fee in rupees</Label><Input id="fee" type="number" min="0" step="any" required value={consultationFee} onChange={(event) => setConsultationFee(event.target.value)} placeholder="e.g. 1500" /></div>
                  <div className="grid gap-2 sm:col-span-2"><Label htmlFor="courts">Courts practiced</Label><Input id="courts" value={courts} onChange={(event) => setCourts(event.target.value)} placeholder="Delhi High Court, District Courts, NCLT Delhi" /><p className="text-xs text-muted-foreground">Separate each court or tribunal with a comma.</p></div>
                  <div className="grid gap-2 sm:col-span-2"><Label htmlFor="office">Office location</Label><Input id="office" value={officeAddress} onChange={(event) => setOfficeAddress(event.target.value)} placeholder="Neighbourhood, city" /></div>
                </div>
              </section>

              <section className="border-t pt-8">
                <div className="flex items-start gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">3</span><div><h2 className="font-heading text-xl font-semibold">Client communication</h2><p className="mt-1 text-sm text-muted-foreground">Help prospective clients know whether the consultation will work for them.</p></div></div>
                <fieldset className="mt-5"><legend className="text-sm font-medium">Consultation languages</legend><div className="mt-2 flex flex-wrap gap-2">{languageOptions.map((language) => <button key={language} type="button" aria-pressed={languages.includes(language)} onClick={() => toggleValue(language, languages, setLanguages)} className={cn('rounded-full border bg-card px-3 py-1.5 text-sm hover:bg-muted', languages.includes(language) && 'border-primary bg-primary text-primary-foreground hover:bg-primary')}>{language}</button>)}</div></fieldset>
                <div className="mt-5 grid gap-2"><div className="flex items-center justify-between"><Label htmlFor="bio">Professional introduction</Label><span className="text-xs text-muted-foreground">{bio.length}/1500</span></div><Textarea id="bio" maxLength={1500} value={bio} onChange={(event) => setBio(event.target.value)} className="min-h-40" placeholder="Describe the matters you handle, the clients you commonly support, and how you approach an initial consultation." /></div>
              </section>

              <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-lg text-xs leading-5 text-muted-foreground">Saving this profile does not make it public. Identity and professional verification must be approved first.</p><Button type="submit" size="lg" className="h-11 px-5" disabled={isSubmitting}>{isSubmitting ? 'Saving profile…' : 'Save and continue'} {!isSubmitting && <ArrowRight />}</Button></div>
            </form>
          </div>

          <aside className="space-y-4">
            <Card className="sticky top-24"><CardHeader><CardTitle className="text-base">Profile review guide</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> Use court and tribunal names clients recognise.</p><p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> Keep the introduction precise and jargon-light.</p><p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> Set a fee you can honour consistently.</p><div className="border-t pt-4"><p className="flex gap-2 font-medium"><FileCheck2 className="size-4 text-primary" /> Verification follows</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Bar enrolment, identity, tax, and payout checks are handled separately.</p></div></CardContent></Card>
          </aside>
        </div>
      </div>
    </div>
  )
}

export function LawyerOnboardingPage() {
  const { user } = useAuth()
  return <LawyerProfileEditor key={user?.id || 'signed-out'} />
}
