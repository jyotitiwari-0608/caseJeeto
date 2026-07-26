import { useEffect, useState } from 'react'
import { ArrowRight, Briefcase, CheckCircle2, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth-context'
import { ApiError } from '@/lib/api'
import { accountDestination, normalizePhoneNumber, roleFromSearchParams } from '@/lib/session'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/api'

interface AuthPageProps { mode: 'login' | 'register' }

export function AuthPage({ mode }: AuthPageProps) {
  const [searchParams] = useSearchParams()
  const initialRole = roleFromSearchParams(searchParams)
  const [role, setRole] = useState<Exclude<UserRole, 'admin'>>(initialRole)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isRegister = mode === 'register'

  useEffect(() => setRole(roleFromSearchParams(searchParams)), [searchParams])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    const normalizedPhone = isRegister ? normalizePhoneNumber(phone) : null
    if (isRegister && !normalizedPhone) {
      setError('Enter a valid Indian mobile number or E.164 phone number.')
      return
    }
    setIsSubmitting(true)
    try {
      const user = isRegister
        ? await register({ name: name.trim(), email: email.trim(), phone: normalizedPhone!, password, role })
        : await login(email.trim(), password)
      toast.success(isRegister ? 'Your CaseJeeto account is ready.' : `Welcome back, ${user.name.split(' ')[0]}.`)
      const requestedPath = (location.state as { from?: string } | null)?.from
      const destination = user.role === 'lawyer' && isRegister ? '/lawyer/onboarding' : accountDestination(user.role)
      navigate(requestedPath || destination, { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'CaseJeeto could not reach the server. Please try again in a moment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-[calc(100svh-4rem)] lg:grid-cols-[.88fr_1.12fr]">
      <section className="auth-panel-mark relative hidden overflow-hidden border-r bg-primary p-10 text-primary-foreground lg:flex lg:flex-col xl:p-14">
        <p className="eyebrow relative z-10 text-primary-foreground/65">Legal help, with context</p>
        <div className="relative z-10 my-auto max-w-xl py-14">
          <p className="font-heading text-5xl font-semibold leading-[1.08] tracking-[-0.035em] text-primary-foreground xl:text-6xl">Good legal decisions begin with a clear first conversation.</p>
          <div className="mt-10 border-t border-primary-foreground/20">
            {['Compare advocates on facts that matter', 'Keep your legal journey organised', 'Return to conversations and documents securely'].map((item, index) => <div key={item} className="grid grid-cols-[2rem_1fr] gap-3 border-b border-primary-foreground/15 py-4 text-sm text-primary-foreground/80"><span className="font-heading text-primary-foreground/45">0{index + 1}</span><p>{item}</p></div>)}
          </div>
        </div>
        <p className="relative z-10 text-xs text-primary-foreground/60">Your account data is used only to operate the CaseJeeto service.</p>
      </section>

      <section className="flex items-center justify-center bg-background px-4 py-12 sm:px-8 lg:px-12">
        <Card className="reveal-up w-full max-w-xl rounded-lg border-border/80 shadow-[var(--shadow-raised)]">
          <CardHeader className="pb-3 sm:px-7">
            <p className="eyebrow">{isRegister ? 'Create your account' : 'Welcome back'}</p>
            <h1 className="mt-2 font-heading text-3xl font-medium tracking-[-0.025em]">{isRegister ? 'Begin with CaseJeeto' : 'Continue your legal journey'}</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{isRegister ? 'Choose how you will use the platform. You can complete your profile after signup.' : 'Log in to access your workspace and consultations.'}</p>
          </CardHeader>
          <CardContent className="sm:px-7">
            {isRegister && (
              <fieldset className="mb-5 grid grid-cols-2 gap-3">
                <legend className="mb-2 text-sm font-medium">I am joining as</legend>
                {[{ value: 'client' as const, icon: UserRound, label: 'A client', note: 'I need legal help' }, { value: 'lawyer' as const, icon: Briefcase, label: 'An advocate', note: 'I want client discovery' }].map(({ value, icon: Icon, label, note }) => (
                  <button key={value} type="button" onClick={() => setRole(value)} aria-pressed={role === value} className={cn('pressable group relative rounded-lg border bg-card p-4 text-left hover:bg-muted', role === value && 'border-primary bg-primary/5 ring-2 ring-primary/15')}>
                    <Icon className="size-5 text-primary" />{role === value && <CheckCircle2 className="absolute right-3 top-3 size-4 text-seal" aria-hidden="true" />}<span className="mt-3 block text-sm font-semibold">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{note}</span>
                  </button>
                ))}
              </fieldset>
            )}
            {error && <Alert variant="destructive" className="mb-5"><ShieldCheck /><AlertTitle>We could not {isRegister ? 'create your account' : 'log you in'}</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
            <form onSubmit={submit} className="grid gap-4">
              {isRegister && <div className="grid gap-2"><Label htmlFor="name">Full name</Label><Input className="h-10" id="name" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} placeholder={role === 'lawyer' ? 'Name as used professionally' : 'Your full name'} /></div>}
              <div className="grid gap-2"><Label htmlFor="email">Email address</Label><Input className="h-10" id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div>
              {isRegister && <div className="grid gap-2"><Label htmlFor="phone">Mobile number</Label><Input className="h-10" id="phone" type="tel" inputMode="tel" autoComplete="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98765 43210" /><p className="text-xs text-muted-foreground">Indian numbers are normalized to +91; international numbers must use E.164 format.</p></div>}
              <div className="grid gap-2"><div className="flex items-center justify-between"><Label htmlFor="password">Password</Label>{!isRegister && <span className="text-xs text-muted-foreground">At least 8 characters</span>}</div><Input className="h-10" id="password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" /></div>
              <Button type="submit" size="lg" className="mt-2 h-11" disabled={isSubmitting}>{isSubmitting ? 'Please wait…' : isRegister ? `Create ${role} account` : 'Log in'} {!isSubmitting && <ArrowRight className="arrow-nudge" />}</Button>
            </form>
            <div className="mt-5 flex items-center justify-center gap-1 text-sm text-muted-foreground">{isRegister ? 'Already have an account?' : 'New to CaseJeeto?'}<Link className="pressable font-semibold text-foreground hover:underline" to={isRegister ? '/login' : '/register'}>{isRegister ? 'Log in' : 'Create account'}</Link></div>
            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground"><LockKeyhole className="size-3.5" /> Protected account access via CaseJeeto API</p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
