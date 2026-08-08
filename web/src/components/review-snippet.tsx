import { useQuery } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface ReviewSnippetProps {
  lawyerId: string
}

export function ReviewSnippet({ lawyerId }: ReviewSnippetProps) {
  const query = useQuery({
    queryKey: ['lawyer-reviews', lawyerId],
    queryFn: ({ signal }) => api.getLawyerReviews(lawyerId, { limit: 10 }, signal),
    enabled: Boolean(lawyerId),
    retry: false,
  })
  const review = query.data?.data.reviews[0]

  if (query.isLoading || query.isError || !review) return null

  return (
    <blockquote className="mt-7 max-w-2xl rounded-xl border bg-card p-4 shadow-[var(--shadow-hairline)]">
      <div className="flex items-center gap-1 text-rating" aria-label={`Rated ${review.rating} out of 5`}>
        {Array.from({ length: 5 }, (_, index) => <Star key={index} className={cn('size-3.5', index < review.rating ? 'fill-current' : 'text-muted-foreground/30')} />)}
        <span className="ml-2 text-xs font-medium text-muted-foreground">Latest client feedback</span>
      </div>
      {review.comment && <p className="mt-2 text-sm leading-6 text-foreground/90">“{review.comment}”</p>}
      <footer className="mt-2 text-xs text-muted-foreground">— {review.clientId.name}</footer>
    </blockquote>
  )
}
