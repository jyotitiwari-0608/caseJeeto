import { useState } from 'react'
import { ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, FileCheck2, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/auth-context'
import { practiceAreas } from '@/data/lawyers'
import { ApiError, api } from '@/lib/api'
import { cn } from '@/lib/utils'

const languageOptions = ['English', 'Hindi', 'Punjabi', 'Urdu', 'Tamil', 'Telugu', 'Marathi', 'Bengali']

export function LawyerOnboardingPage() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const [specializations, setSpecializations] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>([])
  const [yearsOfExperience, setYearsOfExperience] = useState('')
  const [consultationFee, setConsultationFee] = useState('')
  const [courts, setCourts] = useState('')
  const [officeAddress, setOfficeAddress] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function toggleValue(value: string, selected: string[], setter: (next: string[]) => void) {
    setter(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value])
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!accessToken) return
    const payload = {
      ...(specializations.length > 0 && { specialization: specializations }),
      ...(languages.length > 0 && { languages }),
      ...(yearsOfExperience !== '' && { yearsOfExperience: Number(yearsOfExperience) }),
      ...(consultationFee !== '' && { consultationFee: Number(consultationFee) }),
      ...(courts.trim() && { courtsPracticed: courts.split(',').map((court) => court.trim()).filter(Boolean) }),
      ...(officeAddress.trim() && { officeAddress: officeAddress.trim() }),
      ...(bio.trim() && { bio: bio.trim() }),
    }
    if (Object.keys(payload).length === 0) {
      setError('Enter at least one profile field before saving.')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      await api.updateLawyerProfile(payload, accessToken)
      toast.success('Professional profile saved', { description: 'You can now continue with verification and availability.' })
      navigate('/lawyer/dashboard')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Your profile could not be saved. Please check the API connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-muted/25">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/lawyer/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back to advocate desk</Link>
        <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div>
            <div className="border-b pb-7"><Badge variant="outline"><BadgeCheck /> Initial profile setup</Badge><h1 className="mt-4 font-heading text-4xl font-semibold tracking-tight">Build a profile clients can assess.</h1><p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Only fields you complete are sent. This screen does not load your existing profile, so use it for careful initial setup rather than as a full-profile editor.</p></div>
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
                  <div className="grid gap-2"><Label htmlFor="experience">Years of experience</Label><Input id="experience" type="number" min="0" max="70" value={yearsOfExperience} onChange={(event) => setYearsOfExperience(event.target.value)} placeholder="e.g. 8" /></div>
                  <div className="grid gap-2"><Label htmlFor="fee">Consultation fee in rupees</Label><Input id="fee" type="number" min="0" max="1000000" step="100" value={consultationFee} onChange={(event) => setConsultationFee(event.target.value)} placeholder="e.g. 1500" /></div>
                  <div className="grid gap-2 sm:col-span-2"><Label htmlFor="courts">Courts practiced</Label><Input id="courts" value={courts} onChange={(event) => setCourts(event.target.value)} placeholder="Delhi High Court, District Courts, NCLT Delhi" /><p className="text-xs text-muted-foreground">Separate each court or tribunal with a comma.</p></div>
                  <div className="grid gap-2 sm:col-span-2"><Label htmlFor="office">Office location</Label><Input id="office" value={officeAddress} onChange={(event) => setOfficeAddress(event.target.value)} placeholder="Neighbourhood, city" /></div>
                </div>
              </section>

              <section className="border-t pt-8">
                <div className="flex items-start gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">3</span><div><h2 className="font-heading text-xl font-semibold">Client communication</h2><p className="mt-1 text-sm text-muted-foreground">Help prospective clients know whether the consultation will work for them.</p></div></div>
                <fieldset className="mt-5"><legend className="text-sm font-medium">Consultation languages</legend><div className="mt-2 flex flex-wrap gap-2">{languageOptions.map((language) => <button key={language} type="button" aria-pressed={languages.includes(language)} onClick={() => toggleValue(language, languages, setLanguages)} className={cn('rounded-full border bg-card px-3 py-1.5 text-sm hover:bg-muted', languages.includes(language) && 'border-primary bg-primary text-primary-foreground hover:bg-primary')}>{language}</button>)}</div></fieldset>
                <div className="mt-5 grid gap-2"><div className="flex items-center justify-between"><Label htmlFor="bio">Professional introduction</Label><span className="text-xs text-muted-foreground">{bio.length}/1500</span></div><Textarea id="bio" minLength={80} maxLength={1500} value={bio} onChange={(event) => setBio(event.target.value)} className="min-h-40" placeholder="Describe the matters you handle, the clients you commonly support, and how you approach an initial consultation." /></div>
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
