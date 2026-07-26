import { Scale } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Separator } from '@/components/ui/separator'

export function SiteFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.35fr_.75fr_1fr]">
          <div className="max-w-md">
            <Link to="/" className="pressable group inline-flex items-center gap-2.5 font-heading text-lg font-semibold">
              <span className="brand-mark grid size-8 place-items-center rounded-[0.6rem] bg-primary text-primary-foreground"><Scale className="size-4" aria-hidden="true" /></span> CaseJeeto
            </Link>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              A clearer way to compare advocate profiles and prepare for a first legal conversation across India.
            </p>
          </div>
          <div>
            <h2 className="eyebrow text-muted-foreground">Explore</h2>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <Link className="pressable w-fit hover:text-foreground" to="/lawyers">Find a lawyer</Link>
              <Link className="pressable w-fit hover:text-foreground" to="/register?role=lawyer">Join as an advocate</Link>
              <Link className="pressable w-fit hover:text-foreground" to="/login">Log in</Link>
            </div>
          </div>
          <div>
            <h2 className="eyebrow text-muted-foreground">Important</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              CaseJeeto is a technology platform and does not provide legal advice. Lawyer availability and outcomes are never guaranteed.
            </p>
          </div>
        </div>
        <Separator className="my-8" />
        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CaseJeeto. All rights reserved.</p>
          <p>Built for clearer legal journeys in India.</p>
        </div>
      </div>
    </footer>
  )
}
