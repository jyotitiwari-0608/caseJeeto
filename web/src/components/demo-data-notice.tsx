import { DatabaseZap } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function DemoDataNotice() {
  return (
    <Alert className="border-primary/30 bg-primary/5">
      <DatabaseZap aria-hidden="true" />
      <AlertTitle>Previewing demo lawyer profiles</AlertTitle>
      <AlertDescription>
        The CaseJeeto API is not reachable, so these clearly marked sample profiles are shown to keep discovery usable. Sign-in and booking still require the server.
      </AlertDescription>
    </Alert>
  )
}
