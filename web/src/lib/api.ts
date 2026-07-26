import type {
  AuthResponse,
  Booking,
  BookingsResponse,
  BlockedLawyer,
  BlockedLawyersResponse,
  Lawyer,
  LawyerDashboardSummary,
  LawyerFilters,
  LawyerProfileResponse,
  LawyerProfileWriteInput,
  LawyerResponse,
  LawyersResponse,
  PaginationMeta,
  SavedLawyer,
  SavedLawyerMutationResponse,
  SavedLawyersResponse,
  TokenRefreshResponse,
  UserRole,
} from '@/types/api'

const defaultApiUrl = import.meta.env?.DEV ? 'http://localhost:5000/api' : '/api'
export const API_URL = (import.meta.env?.VITE_API_URL || defaultApiUrl).replace(/\/$/, '')
export const DEMO_DATA_ENABLED = Boolean(import.meta.env?.DEV) || import.meta.env?.VITE_ENABLE_DEMO_DATA === 'true'

export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'aborted' | 'invalid-response' | 'superseded'

export interface AuthenticatedRequestScope {
  expectedUserId: string
  isCurrentAccount: (expectedUserId: string) => boolean
}

class ApiError extends Error {
  status: number | null
  kind: ApiErrorKind

  constructor(message: string, status: number | null, kind: ApiErrorKind = 'http') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.kind = kind
  }
}

type UnauthorizedHandler = () => void
type AuthRefreshHandler = (failedAccessToken: string | null) => Promise<string | null>
let unauthorizedHandler: UnauthorizedHandler | null = null
let authRefreshHandler: AuthRefreshHandler | null = null
let authRefreshPromise: Promise<string | null> | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler
}

export function setAuthRefreshHandler(handler: AuthRefreshHandler | null) {
  authRefreshHandler = handler
  if (!handler) authRefreshPromise = null
}

function refreshAccessTokenOnce(failedAccessToken: string | null) {
  if (!authRefreshHandler) return Promise.resolve(null)
  if (!authRefreshPromise) {
    authRefreshPromise = authRefreshHandler(failedAccessToken).finally(() => { authRefreshPromise = null })
  }
  return authRefreshPromise
}

export function shouldUseDemoFallback(error: unknown, enabled = DEMO_DATA_ENABLED) {
  return enabled && error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout')
}

interface RequestOptions {
  authenticated?: boolean
  authRetry?: boolean
  timeoutMs?: number
  parser?: (value: unknown, status: number) => unknown
  authScope?: AuthenticatedRequestScope
}

function assertCurrentRequestAccount(scope?: AuthenticatedRequestScope) {
  if (scope && !scope.isCurrentAccount(scope.expectedUserId)) {
    throw new ApiError('This request belongs to a superseded account session.', null, 'superseded')
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

export function isAuthResponse(value: unknown): value is AuthResponse {
  if (!isRecord(value) || !isRecord(value.user)) return false
  return typeof value.accessToken === 'string' && value.accessToken.length > 0 && typeof value.refreshToken === 'string' && value.refreshToken.length > 0 &&
    typeof value.user.id === 'string' && typeof value.user.name === 'string' && typeof value.user.email === 'string' &&
    ['client', 'lawyer', 'admin'].includes(String(value.user.role))
}

export function isTokenRefreshResponse(value: unknown): value is TokenRefreshResponse {
  return isRecord(value) && isNonEmptyString(value.accessToken) && isNonEmptyString(value.refreshToken)
}

function hasDataObject(value: unknown): value is Record<string, unknown> & { data: Record<string, unknown> } {
  return isRecord(value) && value.success === true && isRecord(value.data)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === 'string'
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString)
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNonNegative(value) && Number.isInteger(value)
}

function isRating(value: unknown): value is number {
  return isFiniteNonNegative(value) && value <= 5
}

function isPaginationMeta(value: unknown): value is PaginationMeta {
  return isRecord(value) && isNonNegativeInteger(value.total) &&
    isNonNegativeInteger(value.page) && value.page >= 1 &&
    isNonNegativeInteger(value.limit) && value.limit >= 1 &&
    isNonNegativeInteger(value.totalPages)
}

function isLawyer(value: unknown): value is Lawyer {
  if (!isRecord(value) || !isRecord(value.user)) return false
  return isNonEmptyString(value._id) &&
    isNonEmptyString(value.user._id) &&
    isNonEmptyString(value.user.name) &&
    isStringArray(value.specialization) &&
    isNonNegativeInteger(value.yearsOfExperience) &&
    isStringArray(value.courtsPracticed) &&
    isStringArray(value.languages) &&
    isFiniteNonNegative(value.consultationFee) &&
    isOptionalString(value.bio) &&
    isOptionalString(value.profilePhoto) &&
    isOptionalString(value.officeAddress) &&
    isRating(value.rating) &&
    isNonNegativeInteger(value.reviewCount) &&
    isNonNegativeInteger(value.totalConsultations)
}

function isBooking(value: unknown): value is Booking {
  if (!isRecord(value) || !isRecord(value.lawyerId)) return false
  return isNonEmptyString(value._id) &&
    isNonEmptyString(value.lawyerId._id) &&
    isStringArray(value.lawyerId.specialization) &&
    isFiniteNonNegative(value.lawyerId.consultationFee) &&
    isNonEmptyString(value.scheduledAt) && Number.isFinite(Date.parse(value.scheduledAt)) &&
    isNonNegativeInteger(value.durationMinutes) && value.durationMinutes > 0 &&
    ['pending', 'confirmed', 'completed', 'cancelled'].includes(String(value.status)) &&
    isNonEmptyString(value.createdAt) && Number.isFinite(Date.parse(value.createdAt))
}

function isSavedLawyer(value: unknown): value is SavedLawyer {
  if (!isRecord(value) || !isRecord(value.user)) return false
  return isNonEmptyString(value._id) &&
    isNonEmptyString(value.user._id) &&
    isNonEmptyString(value.user.name) &&
    isStringArray(value.specialization) &&
    isFiniteNonNegative(value.consultationFee) &&
    isRating(value.rating) &&
    typeof value.isAvailable === 'boolean'
}

function isBlockedLawyer(value: unknown): value is BlockedLawyer {
  if (!isRecord(value) || !isRecord(value.user)) return false
  return isNonEmptyString(value._id) &&
    isNonEmptyString(value.user._id) &&
    isNonEmptyString(value.user.name) &&
    isStringArray(value.specialization)
}

function isLawyersResponse(value: unknown): value is LawyersResponse {
  return hasDataObject(value) && Array.isArray(value.data.lawyers) &&
    value.data.lawyers.every(isLawyer) && isPaginationMeta(value.meta)
}

function isLawyerResponse(value: unknown): value is LawyerResponse {
  return hasDataObject(value) && isLawyer(value.data.lawyer) &&
    typeof value.data.isSaved === 'boolean' && typeof value.data.isBlocked === 'boolean'
}

function isLawyerProfileResponse(value: unknown): value is LawyerProfileResponse {
  if (!isRecord(value) || !isRecord(value.lawyer)) return false
  const lawyer = value.lawyer
  return isStringArray(lawyer.specialization) &&
    isFiniteNonNegative(lawyer.yearsOfExperience) &&
    isStringArray(lawyer.courtsPracticed) &&
    isStringArray(lawyer.languages) &&
    isFiniteNonNegative(lawyer.consultationFee) &&
    isOptionalString(lawyer.bio) &&
    isOptionalString(lawyer.officeAddress) &&
    isOptionalString(lawyer.profilePhoto)
}

function isBookingsResponse(value: unknown): value is BookingsResponse {
  return hasDataObject(value) && Array.isArray(value.data.bookings) &&
    value.data.bookings.every(isBooking) && isPaginationMeta(value.meta)
}

function isSavedLawyersResponse(value: unknown): value is SavedLawyersResponse {
  return hasDataObject(value) && Array.isArray(value.data.savedLawyers) &&
    value.data.savedLawyers.every(isSavedLawyer)
}

function isSavedLawyerMutationResponse(value: unknown): value is SavedLawyerMutationResponse {
  return hasDataObject(value) && isStringArray(value.data.savedLawyers)
}

function isBlockedLawyersResponse(value: unknown): value is BlockedLawyersResponse {
  return hasDataObject(value) && Array.isArray(value.data.blockedLawyers) &&
    value.data.blockedLawyers.every(isBlockedLawyer)
}

function isLawyerDashboardSummary(value: unknown): value is LawyerDashboardSummary {
  return isRecord(value) &&
    isNonNegativeInteger(value.upcomingBookings) &&
    isFiniteNonNegative(value.earningsThisMonth) &&
    isRating(value.rating) &&
    isNonNegativeInteger(value.reviewCount) &&
    ['pending', 'under_review', 'approved', 'rejected', 'suspended'].includes(String(value.verificationStatus)) &&
    isNonNegativeInteger(value.unreadMessages) &&
    typeof value.isProfileVisible === 'boolean'
}

function parseResponse<T>(value: unknown, status: number, label: string, guard: (input: unknown) => input is T): T {
  if (!guard(value)) {
    throw new ApiError(`The server returned malformed ${label} data.`, status, 'invalid-response')
  }
  return value
}

export function parseLawyersResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'lawyer directory', isLawyersResponse)
}

export function parseLawyerResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'lawyer profile', isLawyerResponse)
}

export function parseLawyerProfileResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'lawyer self-profile', isLawyerProfileResponse)
}

export function parseBookingsResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'booking', isBookingsResponse)
}

export function parseSavedLawyersResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'saved lawyer', isSavedLawyersResponse)
}

export function parseSavedLawyerMutationResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'saved-lawyer update', isSavedLawyerMutationResponse)
}

export function parseBlockedLawyersResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'blocked lawyer', isBlockedLawyersResponse)
}

export function deriveAuthoritativeClientLawyerState(
  lawyerId: string,
  savedLawyers: SavedLawyer[] = [],
  blockedLawyers: BlockedLawyer[] = [],
) {
  return {
    isSaved: savedLawyers.some((lawyer) => lawyer._id === lawyerId),
    isBlocked: blockedLawyers.some((lawyer) => lawyer._id === lawyerId),
  }
}

export function parseLawyerDashboardSummary(value: unknown, status = 200) {
  return parseResponse(value, status, 'lawyer dashboard', isLawyerDashboardSummary)
}

async function request<T>(path: string, init: RequestInit = {}, options: RequestOptions = {}): Promise<T> {
  assertCurrentRequestAccount(options.authScope)
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const controller = new AbortController()
  let timedOut = false
  const abortFromCaller = () => controller.abort(init.signal?.reason)
  init.signal?.addEventListener('abort', abortFromCaller, { once: true })
  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, options.timeoutMs ?? 8_000)

  try {
    const response = await fetch(`${API_URL}${path}`, { ...init, headers, signal: controller.signal })
    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      if (response.status === 401 && options.authenticated && options.authRetry !== false) {
        const authorization = headers.get('Authorization')
        const failedAccessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null
        const refreshedAccessToken = await refreshAccessTokenOnce(failedAccessToken)
        assertCurrentRequestAccount(options.authScope)
        if (refreshedAccessToken) {
          const retryHeaders = new Headers(headers)
          retryHeaders.set('Authorization', `Bearer ${refreshedAccessToken}`)
          return request<T>(path, { ...init, headers: retryHeaders }, { ...options, authRetry: false })
        }
        unauthorizedHandler?.()
      } else if (response.status === 401 && options.authenticated) {
        unauthorizedHandler?.()
      }
      const message = typeof body === 'object' && body && 'message' in body && typeof body.message === 'string'
        ? body.message
        : 'The request could not be completed.'
      throw new ApiError(message, response.status)
    }
    assertCurrentRequestAccount(options.authScope)
    if (body === null) throw new ApiError('The server returned an unreadable response.', response.status, 'invalid-response')
    return options.parser ? options.parser(body, response.status) as T : body as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (timedOut) throw new ApiError('The request timed out.', null, 'timeout')
    if (init.signal?.aborted) throw new ApiError('The request was cancelled.', null, 'aborted')
    throw new ApiError('The CaseJeeto API is not reachable.', null, 'network')
  } finally {
    globalThis.clearTimeout(timeoutId)
    init.signal?.removeEventListener('abort', abortFromCaller)
  }
}

function queryString(filters: LawyerFilters) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  return params.toString()
}

function bearer(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` }
}

export const api = {
  getLawyers(filters: LawyerFilters = {}, signal?: AbortSignal) {
    const query = queryString(filters)
    return request<LawyersResponse>(`/lawyers${query ? `?${query}` : ''}`, { signal }, { parser: parseLawyersResponse })
  },
  getLawyer(id: string, signal?: AbortSignal) {
    return request<LawyerResponse>(`/lawyers/${encodeURIComponent(id)}`, { signal }, { parser: parseLawyerResponse })
  },
  login(email: string, password: string) {
    return request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, { parser: (value, status) => parseResponse(value, status, 'authentication', isAuthResponse) })
  },
  register(input: { name: string; email: string; phone: string; password: string; role: Exclude<UserRole, 'admin'> }) {
    return request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) }, { parser: (value, status) => parseResponse(value, status, 'authentication', isAuthResponse) })
  },
  refreshToken(refreshToken: string) {
    return request<TokenRefreshResponse>('/auth/refresh-token', {
      method: 'POST', body: JSON.stringify({ refreshToken }),
    }, { parser: (value, status) => parseResponse(value, status, 'token refresh', isTokenRefreshResponse) })
  },
  logout(refreshToken: string) {
    return request<{ message: string }>('/auth/logout', {
      method: 'POST', body: JSON.stringify({ refreshToken }),
    }, { parser: (value, status) => parseResponse(value, status, 'logout', (input): input is { message: string } => isRecord(input) && typeof input.message === 'string') })
  },
  updateLawyerProfile(input: Partial<LawyerProfileWriteInput>, accessToken: string, authScope?: AuthenticatedRequestScope) {
    return request<LawyerProfileResponse>('/lawyers/me', {
      method: 'PATCH', headers: bearer(accessToken), body: JSON.stringify(input),
    }, { authenticated: true, parser: parseLawyerProfileResponse, authScope })
  },
  getLawyerProfile(accessToken: string, signal?: AbortSignal, authScope?: AuthenticatedRequestScope) {
    return request<LawyerProfileResponse>('/lawyers/me', { headers: bearer(accessToken), signal }, { authenticated: true, parser: parseLawyerProfileResponse, authScope })
  },
  getLawyerDashboard(accessToken: string, signal?: AbortSignal) {
    return request<LawyerDashboardSummary>('/lawyers/me/dashboard', { headers: bearer(accessToken), signal }, { authenticated: true, parser: parseLawyerDashboardSummary })
  },
  getClientBookings(accessToken: string, signal?: AbortSignal) {
    return request<BookingsResponse>('/bookings?limit=20', { headers: bearer(accessToken), signal }, { authenticated: true, parser: parseBookingsResponse })
  },
  getSavedLawyers(accessToken: string, signal?: AbortSignal, authScope?: AuthenticatedRequestScope) {
    return request<SavedLawyersResponse>('/clients/me/saved-lawyers', { headers: bearer(accessToken), signal }, { authenticated: true, parser: parseSavedLawyersResponse, authScope })
  },
  getBlockedLawyers(accessToken: string, signal?: AbortSignal, authScope?: AuthenticatedRequestScope) {
    return request<BlockedLawyersResponse>('/clients/me/blocked-lawyers', { headers: bearer(accessToken), signal }, { authenticated: true, parser: parseBlockedLawyersResponse, authScope })
  },
  saveLawyer(lawyerId: string, accessToken: string, authScope?: AuthenticatedRequestScope) {
    return request<SavedLawyerMutationResponse>(`/clients/me/saved-lawyers/${encodeURIComponent(lawyerId)}`, {
      method: 'POST', headers: bearer(accessToken),
    }, { authenticated: true, parser: parseSavedLawyerMutationResponse, authScope })
  },
  unsaveLawyer(lawyerId: string, accessToken: string, authScope?: AuthenticatedRequestScope) {
    return request<SavedLawyerMutationResponse>(`/clients/me/saved-lawyers/${encodeURIComponent(lawyerId)}`, {
      method: 'DELETE', headers: bearer(accessToken),
    }, { authenticated: true, parser: parseSavedLawyerMutationResponse, authScope })
  },
}

export { ApiError }
