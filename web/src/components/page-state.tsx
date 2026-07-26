import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function ErrorState({ title = 'Something went wrong', message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <Card className="border-destructive/30 bg-destructive/5 py-12 text-center">
      <CardContent className="mx-auto max-w-md">
        <AlertCircle className="mx-auto size-8 text-destructive" aria-hidden="true" />
        <h2 className="mt-4 font-heading text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
        {onRetry && <Button className="mt-5" variant="outline" onClick={onRetry}><RefreshCw aria-hidden="true" /> Try again</Button>}
      </CardContent>
    </Card>
  )
}
