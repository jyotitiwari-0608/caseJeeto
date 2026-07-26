import type { AuthUser, TokenRefreshResponse, UserRole } from '@/types/api'

export interface StoredAuth {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

export const AUTH_STORAGE_KEY = 'casejeeto.auth'

export interface SessionStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface CacheController { clear(): void }

const unavailableStorage: SessionStorageLike = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
}

export function getBrowserStorage(): SessionStorageLike {
  try {
    return window.localStorage
  } catch {
    return unavailableStorage
  }
}

export function isStoredAuth(value: unknown): value is StoredAuth {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<StoredAuth>
  return typeof candidate.accessToken === 'string' && candidate.accessToken.length > 0 &&
    typeof candidate.refreshToken === 'string' && candidate.refreshToken.length > 0 &&
    Boolean(candidate.user) && typeof candidate.user?.id === 'string' && typeof candidate.user?.name === 'string' &&
    typeof candidate.user?.email === 'string' && ['client', 'lawyer', 'admin'].includes(candidate.user?.role || '')
}

export function readStoredAuth(storage: SessionStorageLike): StoredAuth | null {
  try {
    const raw = storage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (isStoredAuth(parsed)) return parsed
  } catch {
    // Invalid or unavailable storage is treated as a signed-out session.
  }
  try { storage.removeItem(AUTH_STORAGE_KEY) } catch { /* Storage can be unavailable. */ }
  return null
}

export function clearSession(storage: SessionStorageLike, cache: CacheController) {
  try { storage.removeItem(AUTH_STORAGE_KEY) } catch { /* In-memory signout still proceeds. */ }
  cache.clear()
}

export function writeStoredAuth(storage: SessionStorageLike, auth: StoredAuth) {
  try {
    storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
    return true
  } catch {
    return false
  }
}

interface CommitRotatedSessionOptions {
  startedGeneration: number
  currentGeneration: () => number
  currentAuth: () => StoredAuth | null
  sourceRefreshToken: string
  response: TokenRefreshResponse
  persist: (auth: StoredAuth) => void
  revoke: (refreshToken: string) => Promise<unknown>
}

export async function commitRotatedSession({
  startedGeneration,
  currentGeneration,
  currentAuth,
  sourceRefreshToken,
  response,
  persist,
  revoke,
}: CommitRotatedSessionOptions) {
  const current = currentAuth()
  const sessionWasSuperseded = currentGeneration() !== startedGeneration || !current || current.refreshToken !== sourceRefreshToken

  if (sessionWasSuperseded) {
    try { await revoke(response.refreshToken) } catch { /* Revocation is best-effort after local logout. */ }
    return null
  }

  const next = { ...current, accessToken: response.accessToken, refreshToken: response.refreshToken }
  persist(next)
  return next.accessToken
}

export function privateQueryKey(scope: string, userId: string, ...parts: string[]) {
  return [scope, userId, ...parts] as const
}

export function roleFromSearchParams(params: URLSearchParams): Exclude<UserRole, 'admin'> {
  return params.get('role') === 'lawyer' ? 'lawyer' : 'client'
}

export function accountDestination(role: UserRole) {
  if (role === 'lawyer') return '/lawyer/dashboard'
  if (role === 'client') return '/workspace'
  return '/unsupported-account'
}

export function normalizePhoneNumber(input: string) {
  const compact = input.trim().replace(/[\s()-]/g, '')
  if (/^[6-9]\d{9}$/.test(compact)) return `+91${compact}`
  if (/^91[6-9]\d{9}$/.test(compact)) return `+${compact}`
  if (/^\+91[6-9]\d{9}$/.test(compact)) return compact
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact
  return null
}
