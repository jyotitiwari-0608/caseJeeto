import { practiceAreas } from '../data/lawyers.ts'

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('en-IN').replace(/\s+/g, ' ')
}

export function practiceAreaForSearch(query: string) {
  const normalized = normalize(query)
  return practiceAreas.find((area) => {
    const normalizedArea = normalize(area)
    return normalized === normalizedArea || normalized === normalizedArea.replace(/ law$/, '')
  })
}

export function lawyerSearchDestination(query: string) {
  const trimmed = query.trim().slice(0, 100)
  if (!trimmed) return '/lawyers'
  const practiceArea = practiceAreaForSearch(trimmed)
  const params = new URLSearchParams(practiceArea ? { specialization: practiceArea } : { name: trimmed })
  return `/lawyers?${params.toString()}`
}
