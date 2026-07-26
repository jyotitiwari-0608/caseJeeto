import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

export function UnsupportedAccountPage() {
  const { user, logout } = useAuth()
  return <div className="mx-auto flex min-h-[65svh] max-w-xl flex-col items-start justify-center px-4 py-16 sm:px-6"><ShieldAlert className="size-9 text-primary" /><p className="mt-7 text-sm font-semibold text-primary">Unsupported account</p><h1 className="mt-2 font-heading text-4xl font-semibold">This frontend has no administrator workspace.</h1><p className="mt-4 leading-7 text-muted-foreground">{user?.role === 'admin' ? 'Your administrator account was recognised, but client and advocate pages are intentionally unavailable for this role.' : 'This account role does not have a workspace in the current frontend.'}</p><Button className="mt-7" variant="outline" onClick={logout}>Log out safely</Button></div>
}
