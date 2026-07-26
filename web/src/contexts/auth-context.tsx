import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, setAuthRefreshHandler, setUnauthorizedHandler } from '@/lib/api'
import { AUTH_STORAGE_KEY, clearSession, commitRotatedSession, getBrowserStorage, readStoredAuth, writeStoredAuth, type StoredAuth } from '@/lib/session'
import type { AuthUser, UserRole } from '@/types/api'

interface AuthContextValue {
  user: AuthUser | null
  accessToken: string | null
  login: (email: string, password: string) => Promise<AuthUser>
  register: (input: { name: string; email: string; phone: string; password: string; role: Exclude<UserRole, 'admin'> }) => Promise<AuthUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const storage = useMemo(getBrowserStorage, [])
  const [auth, setAuth] = useState<StoredAuth | null>(() => readStoredAuth(storage))
  const authRef = useRef<StoredAuth | null>(auth)
  const sessionGenerationRef = useRef(0)

  const clearLocalSession = useCallback(() => {
    clearSession(storage, queryClient)
    sessionGenerationRef.current += 1
    authRef.current = null
    setAuth(null)
  }, [queryClient, storage])

  const persist = useCallback((next: StoredAuth) => {
    queryClient.clear()
    sessionGenerationRef.current += 1
    writeStoredAuth(storage, next)
    authRef.current = next
    setAuth(next)
    return next.user
  }, [queryClient, storage])

  const refreshAccessToken = useCallback(async (failedAccessToken: string | null) => {
    const current = readStoredAuth(storage) || authRef.current
    if (!current) return null
    if (failedAccessToken && current.accessToken !== failedAccessToken) return current.accessToken
    const startedGeneration = sessionGenerationRef.current

    try {
      const response = await api.refreshToken(current.refreshToken)
      return await commitRotatedSession({
        startedGeneration,
        currentGeneration: () => sessionGenerationRef.current,
        currentAuth: () => readStoredAuth(storage) || authRef.current,
        sourceRefreshToken: current.refreshToken,
        response,
        persist: (next) => {
          writeStoredAuth(storage, next)
          authRef.current = next
          setAuth(next)
        },
        revoke: (refreshToken) => api.logout(refreshToken),
      })
    } catch {
      clearLocalSession()
      return null
    }
  }, [clearLocalSession, storage])

  useEffect(() => {
    setUnauthorizedHandler(clearLocalSession)
    setAuthRefreshHandler(refreshAccessToken)
    return () => {
      setUnauthorizedHandler(null)
      setAuthRefreshHandler(null)
    }
  }, [clearLocalSession, refreshAccessToken])

  useEffect(() => {
    function syncSession(event: StorageEvent) {
      if (event.key !== AUTH_STORAGE_KEY) return
      queryClient.clear()
      sessionGenerationRef.current += 1
      const next = readStoredAuth(storage)
      authRef.current = next
      setAuth(next)
    }
    window.addEventListener('storage', syncSession)
    return () => window.removeEventListener('storage', syncSession)
  }, [queryClient, storage])

  const value = useMemo<AuthContextValue>(() => ({
    user: auth?.user ?? null,
    accessToken: auth?.accessToken ?? null,
    async login(email, password) {
      const response = await api.login(email, password)
      return persist({ user: response.user, accessToken: response.accessToken, refreshToken: response.refreshToken })
    },
    async register(input) {
      const response = await api.register(input)
      return persist({ user: response.user, accessToken: response.accessToken, refreshToken: response.refreshToken })
    },
    async logout() {
      const refreshToken = authRef.current?.refreshToken
      clearLocalSession()
      if (!refreshToken) return
      try {
        await api.logout(refreshToken)
      } catch {
        // Local sign-out is authoritative when the API is unavailable.
      }
    },
  }), [auth, clearLocalSession, persist])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
