import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Lawyer } from '@/types/api'

const STORAGE_KEY = 'casejeeto.compare.v1'
export const MAX_COMPARE = 4

function isLawyerRecord(value: unknown): value is Lawyer {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record._id === 'string' && typeof record.user === 'object' && record.user !== null &&
    typeof (record.user as Record<string, unknown>).name === 'string' &&
    typeof record.rating === 'number' &&
    typeof record.consultationFee === 'number'
}

function loadStored(): Lawyer[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const unique = new Map<string, Lawyer>()
    for (const item of parsed) {
      if (!isLawyerRecord(item)) continue
      if (!unique.has(item._id)) unique.set(item._id, item)
    }
    return [...unique.values()].slice(0, MAX_COMPARE)
  } catch {
    return []
  }
}

function persist(items: Lawyer[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Storage may be unavailable (private mode / quota). Comparison still
    // works for the current page session without persistence.
  }
}

interface CompareContextValue {
  items: Lawyer[]
  isSelected: (lawyerId: string) => boolean
  toggle: (lawyer: Lawyer) => void
  remove: (lawyerId: string) => void
  clear: () => void
}

const CompareContext = createContext<CompareContextValue | null>(null)

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Lawyer[]>(loadStored)

  useEffect(() => {
    persist(items)
  }, [items])

  const toggle = useCallback((lawyer: Lawyer) => {
    setItems((current) => {
      if (current.some((item) => item._id === lawyer._id)) {
        return current.filter((item) => item._id !== lawyer._id)
      }
      if (current.length >= MAX_COMPARE) return current
      return [...current, lawyer]
    })
  }, [])

  const remove = useCallback((lawyerId: string) => {
    setItems((current) => current.filter((item) => item._id !== lawyerId))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const value = useMemo<CompareContextValue>(() => ({
    items,
    isSelected: (lawyerId) => items.some((item) => item._id === lawyerId),
    toggle,
    remove,
    clear,
  }), [items, toggle, remove, clear])

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
}

export function useCompare() {
  const context = useContext(CompareContext)
  if (!context) throw new Error('useCompare must be used within a CompareProvider')
  return context
}
