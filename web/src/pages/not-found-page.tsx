import { ArrowLeft, Scale } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[65svh] max-w-2xl flex-col items-start justify-center px-4 py-16 sm:px-6">
      <Scale className="size-10 text-primary" />
      <p className="mt-8 text-sm font-semibold text-primary">404 · Page not found</p>
      <h1 className="mt-3 font-heading text-5xl font-semibold tracking-tight">This page is not on the docket.</h1>
      <p className="mt-4 max-w-lg text-lg leading-7 text-muted-foreground">The address may have changed, or the page may no longer be available.</p>
      <Link to="/" className={`${buttonVariants()} mt-7 gap-2`}><ArrowLeft /> Return home</Link>
    </div>
  )
}
