import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ApiError,
  api,
  deriveAuthoritativeClientLawyerState,
  isAuthResponse,
  isTokenRefreshResponse,
  parseBookingsResponse,
  parseBlockedLawyersResponse,
  parseLawyerDashboardSummary,
  parseLawyerProfileResponse,
  parseLawyerResponse,
  parseLawyerRankingsResponse,
  parseLawyersResponse,
  parseSavedLawyersResponse,
  parseSavedLawyerMutationResponse,
  shouldUseDemoFallback,
  setAuthRefreshHandler,
  setUnauthorizedHandler,
} from './api.ts'
import { demoLawyers } from '../data/lawyers.ts'
import { lawyerSearchDestination, practiceAreaForSearch } from './discovery.ts'
import { hashTargetId, isUnmodifiedPrimaryActivation, scrollRepeatedHashDestination, scrollToLocationHash, shouldResetScroll } from './navigation.ts'
import { AUTH_STORAGE_KEY, advocateFirstName, clearSession, commitRotatedSession, isStoredAuth, normalizePhoneNumber, privateQueryKey, readStoredAuth, roleFromSearchParams, writeStoredAuth } from './session.ts'

test('clearSession removes auth and clears cached private data', () => {
  let removed = ''
  let cacheCleared = false
  clearSession({ getItem: () => null, setItem: () => undefined, removeItem: (key) => { removed = key } }, { clear: () => { cacheCleared = true } })
  assert.equal(removed, AUTH_STORAGE_KEY)
  assert.equal(cacheCleared, true)
})

test('registration role follows the current query parameters', () => {
  assert.equal(roleFromSearchParams(new URLSearchParams('role=lawyer')), 'lawyer')
  assert.equal(roleFromSearchParams(new URLSearchParams('role=admin')), 'client')
})

test('recognized legal needs map to specialization search', () => {
  assert.equal(practiceAreaForSearch('family'), 'Family Law')
  assert.equal(lawyerSearchDestination('Family Law'), '/lawyers?specialization=Family+Law')
  assert.equal(lawyerSearchDestination('Meera Sethi'), '/lawyers?name=Meera+Sethi')
})

test('demo fallback is restricted to enabled network failures', () => {
  assert.equal(shouldUseDemoFallback(new ApiError('offline', null, 'network'), true), true)
  assert.equal(shouldUseDemoFallback(new ApiError('timed out', null, 'timeout'), true), true)
  assert.equal(shouldUseDemoFallback(new ApiError('server', 500, 'http'), true), false)
  assert.equal(shouldUseDemoFallback(new ApiError('offline', null, 'network'), false), false)
})

test('public lawyer detail never sends a possibly expired access token', async () => {
  const originalFetch = globalThis.fetch
  const demoId = demoLawyers[0]._id
  let requestedUrl = ''
  let authorization = ''

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    authorization = new Headers(init?.headers).get('Authorization') || ''
    return new Response(JSON.stringify({
      success: true,
      data: {
        lawyer: { ...validLawyer, _id: demoId, user: { _id: 'live-user', name: 'Adv. Live Profile' } },
        isSaved: true,
        isBlocked: true,
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const response = await api.getLawyer(demoId)
    assert.match(requestedUrl, new RegExp(`/lawyers/${demoId}$`))
    assert.equal(authorization, '')
    assert.equal(response.data.lawyer.user.name, 'Adv. Live Profile')
    assert.equal(response.data.isSaved, true)
    assert.equal(response.data.isBlocked, true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('stored sessions require a validated user and both rotated tokens', () => {
  const valid = { user: { id: 'u1', name: 'Aarav', email: 'a@example.com', role: 'client' }, accessToken: 'access', refreshToken: 'refresh' }
  assert.equal(isStoredAuth(valid), true)
  assert.equal(isStoredAuth({ ...valid, accessToken: '' }), false)
  assert.equal(isStoredAuth({ ...valid, refreshToken: '' }), false)
  assert.equal(isAuthResponse(valid), true)
  assert.equal(isAuthResponse({ user: valid.user, accessToken: 'access' }), false)
  assert.equal(isTokenRefreshResponse({ accessToken: 'next-access', refreshToken: 'next-refresh' }), true)
  assert.equal(isTokenRefreshResponse({ accessToken: 'next-access' }), false)
})

test('storage failures do not prevent local session clearing or reads', () => {
  const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } }
  assert.equal(readStoredAuth(broken), null)
  assert.equal(writeStoredAuth(broken, { user: { id: 'u1', name: 'A', email: 'a@b.co', role: 'client' }, accessToken: 'x', refreshToken: 'y' }), false)
  assert.doesNotThrow(() => clearSession(broken, { clear: () => undefined }))
})

test('concurrent authenticated 401 responses share one refresh and retry with the rotated access token', async () => {
  const originalFetch = globalThis.fetch
  let refreshCalls = 0
  let unauthorizedCalls = 0
  let staleRequests = 0
  let rotatedRequests = 0

  globalThis.fetch = async (_input, init) => {
    const authorization = new Headers(init?.headers).get('Authorization')
    if (authorization === 'Bearer stale-access') {
      staleRequests += 1
      return new Response(JSON.stringify({ message: 'Expired token.' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }
    if (authorization === 'Bearer rotated-access') {
      rotatedRequests += 1
      return new Response(JSON.stringify({ success: true, data: { bookings: [] }, meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    throw new Error(`Unexpected authorization header: ${authorization}`)
  }

  setAuthRefreshHandler(async (failedAccessToken) => {
    refreshCalls += 1
    assert.equal(failedAccessToken, 'stale-access')
    await Promise.resolve()
    return 'rotated-access'
  })
  setUnauthorizedHandler(() => { unauthorizedCalls += 1 })

  try {
    await Promise.all([api.getClientBookings('stale-access'), api.getClientBookings('stale-access')])
    assert.equal(refreshCalls, 1)
    assert.equal(staleRequests, 2)
    assert.equal(rotatedRequests, 2)
    assert.equal(unauthorizedCalls, 0)
  } finally {
    setAuthRefreshHandler(null)
    setUnauthorizedHandler(null)
    globalThis.fetch = originalFetch
  }
})

test('an account switch during 401 refresh never retries the originating mutation as the new account', async () => {
  const originalFetch = globalThis.fetch
  let activeUserId = 'user-a'
  const authorizations: string[] = []
  let unauthorizedCalls = 0
  globalThis.fetch = async (_input, init) => {
    authorizations.push(new Headers(init?.headers).get('Authorization') || '')
    return new Response(JSON.stringify({ message: 'Expired token.' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }
  setAuthRefreshHandler(async () => {
    activeUserId = 'user-b'
    return 'user-b-access'
  })
  setUnauthorizedHandler(() => { unauthorizedCalls += 1 })

  try {
    await assert.rejects(
      api.updateLawyerProfile({ bio: 'Account A update' }, 'user-a-access', {
        expectedUserId: 'user-a', isCurrentAccount: (expectedUserId) => activeUserId === expectedUserId,
      }),
      (error: unknown) => error instanceof ApiError && error.kind === 'superseded',
    )
    assert.deepEqual(authorizations, ['Bearer user-a-access'])
    assert.equal(unauthorizedCalls, 0)
  } finally {
    setAuthRefreshHandler(null)
    setUnauthorizedHandler(null)
    globalThis.fetch = originalFetch
  }
})

test('a successful response superseded by an account switch cannot reach cache callbacks', async () => {
  const originalFetch = globalThis.fetch
  let activeUserId = 'user-a'
  let cacheWrites = 0
  globalThis.fetch = async () => {
    activeUserId = 'user-b'
    return new Response(JSON.stringify({ lawyer: {
      specialization: [], yearsOfExperience: 0, courtsPracticed: [], languages: [], consultationFee: 0,
    } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    await api.updateLawyerProfile({ bio: 'Account A update' }, 'user-a-access', {
      expectedUserId: 'user-a', isCurrentAccount: (expectedUserId) => activeUserId === expectedUserId,
    }).then(() => { cacheWrites += 1 }).catch((error: unknown) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.kind, 'superseded')
    })
    assert.equal(cacheWrites, 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('logout sends the active refresh token for server-side revocation', async () => {
  const originalFetch = globalThis.fetch
  let requestBody: unknown

  globalThis.fetch = async (input, init) => {
    assert.match(String(input), /\/auth\/logout$/)
    assert.equal(init?.method, 'POST')
    requestBody = JSON.parse(String(init?.body))
    return new Response(JSON.stringify({ message: 'Logged out successfully.' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    await api.logout('refresh-to-revoke')
    assert.deepEqual(requestBody, { refreshToken: 'refresh-to-revoke' })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('logout during an in-flight refresh cannot resurrect the session and revokes the rotated token', async () => {
  const originalSession = { user: { id: 'u1', name: 'Aarav', email: 'a@example.com', role: 'client' as const }, accessToken: 'stale-access', refreshToken: 'old-refresh' }
  let generation = 4
  let currentSession: typeof originalSession | null = originalSession
  let persisted: typeof originalSession | null = null
  const revoked: string[] = []
  let releaseRefresh!: () => void

  const inFlightRefresh = new Promise<{ accessToken: string; refreshToken: string }>((resolve) => {
    releaseRefresh = () => resolve({ accessToken: 'rotated-access', refreshToken: 'rotated-refresh' })
  })

  const completion = inFlightRefresh.then((response) => commitRotatedSession({
    startedGeneration: 4,
    currentGeneration: () => generation,
    currentAuth: () => currentSession,
    sourceRefreshToken: 'old-refresh',
    response,
    persist: (next) => { persisted = next },
    revoke: async (refreshToken) => { revoked.push(refreshToken) },
  }))

  generation += 1
  currentSession = null
  releaseRefresh()

  assert.equal(await completion, null)
  assert.equal(persisted, null)
  assert.deepEqual(revoked, ['rotated-refresh'])
  assert.equal(currentSession, null)
})

test('private query keys are account scoped', () => {
  assert.deepEqual(privateQueryKey('client-bookings', 'client-a'), ['client-bookings', 'client-a'])
  assert.notDeepEqual(privateQueryKey('client-bookings', 'client-a'), privateQueryKey('client-bookings', 'client-b'))
  assert.notDeepEqual(privateQueryKey('lawyer-profile', 'lawyer-a'), privateQueryKey('lawyer-profile', 'lawyer-b'))
})

test('client lawyer state is derived only from authenticated saved and blocked lists', () => {
  const saved = [{ _id: 'lawyer-1', user: { _id: 'user-1', name: 'A' }, specialization: [], consultationFee: 1000, rating: 4, isAvailable: true }]
  const blocked = [{ _id: 'lawyer-2', user: { _id: 'user-2', name: 'B' }, specialization: [] }]
  assert.deepEqual(deriveAuthoritativeClientLawyerState('lawyer-1', saved, blocked), { isSaved: true, isBlocked: false })
  assert.deepEqual(deriveAuthoritativeClientLawyerState('lawyer-2', saved, blocked), { isSaved: false, isBlocked: true })
})

test('advocate greetings remove a leading professional title', () => {
  assert.equal(advocateFirstName('Adv. Meera Sethi'), 'Meera')
  assert.equal(advocateFirstName('  adv. Arjun Malhotra  '), 'Arjun')
  assert.equal(advocateFirstName('Nandita Rao'), 'Nandita')
})

test('lawyer self-profile uses authenticated GET and PATCH requests', async () => {
  const originalFetch = globalThis.fetch
  const calls: Array<{ url: string; method: string; authorization: string; body?: unknown }> = []
  const profile = {
    specialization: ['Family Law'],
    yearsOfExperience: 12,
    courtsPracticed: ['Delhi High Court'],
    languages: ['English', 'Hindi'],
    consultationFee: 2000,
    bio: 'Family law counsel.',
    officeAddress: 'New Delhi',
  }

  globalThis.fetch = async (input, init) => {
    calls.push({
      url: String(input),
      method: init?.method || 'GET',
      authorization: new Headers(init?.headers).get('Authorization') || '',
      ...(init?.body && { body: JSON.parse(String(init.body)) }),
    })
    return new Response(JSON.stringify({ lawyer: profile }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const loaded = await api.getLawyerProfile('lawyer-access')
    const updated = await api.updateLawyerProfile({ bio: 'Updated professional introduction.' }, 'lawyer-access')
    assert.equal(loaded.lawyer.officeAddress, 'New Delhi')
    assert.equal(updated.lawyer.bio, 'Family law counsel.')
    assert.match(calls[0].url, /\/api\/lawyers\/me$/)
    assert.match(calls[1].url, /\/api\/lawyers\/me$/)
    assert.deepEqual(calls.map(({ method, authorization, body }) => ({ method, authorization, body })), [
      { method: 'GET', authorization: 'Bearer lawyer-access', body: undefined },
      { method: 'PATCH', authorization: 'Bearer lawyer-access', body: { bio: 'Updated professional introduction.' } },
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('saved-lawyer client methods use the matching POST and DELETE endpoints', async () => {
  const originalFetch = globalThis.fetch
  const calls: Array<{ url: string; method: string; authorization: string }> = []

  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), method: init?.method || 'GET', authorization: new Headers(init?.headers).get('Authorization') || '' })
    return new Response(JSON.stringify({ success: true, data: { savedLawyers: ['lawyer-1'] } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    await api.saveLawyer('lawyer-1', 'client-access')
    await api.unsaveLawyer('lawyer-1', 'client-access')
    assert.match(calls[0].url, /\/clients\/me\/saved-lawyers\/lawyer-1$/)
    assert.match(calls[1].url, /\/clients\/me\/saved-lawyers\/lawyer-1$/)
    assert.deepEqual(calls.map(({ method, authorization }) => ({ method, authorization })), [
      { method: 'POST', authorization: 'Bearer client-access' },
      { method: 'DELETE', authorization: 'Bearer client-access' },
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('blocked-lawyer state uses the protected client endpoint', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl = ''
  let authorization = ''
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    authorization = new Headers(init?.headers).get('Authorization') || ''
    return new Response(JSON.stringify({ success: true, data: { blockedLawyers: [] } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  try {
    await api.getBlockedLawyers('client-access')
    assert.match(requestedUrl, /\/clients\/me\/blocked-lawyers$/)
    assert.equal(authorization, 'Bearer client-access')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Indian and E.164 phones are normalized and invalid numbers rejected', () => {
  assert.equal(normalizePhoneNumber('98765 43210'), '+919876543210')
  assert.equal(normalizePhoneNumber('+1 415 555 2671'), '+14155552671')
  assert.equal(normalizePhoneNumber('12345'), null)
})

test('cross-route section navigation preserves the hash and scrolls after the home target mounts', () => {
  let requestedId = ''
  let scrollOptions: ScrollIntoViewOptions | undefined
  const didScroll = scrollToLocationHash('#how-it-works', (id) => {
    requestedId = id
    return { scrollIntoView: (options) => { scrollOptions = options } }
  })

  assert.equal(shouldResetScroll('#how-it-works'), false)
  assert.equal(didScroll, true)
  assert.equal(requestedId, 'how-it-works')
  assert.deepEqual(scrollOptions, { behavior: 'instant', block: 'start' })
})

test('same-page activation re-scrolls an out-of-view target when the identical hash is already present', () => {
  let targetTop = -1082
  let requestedId = ''
  const handled = scrollRepeatedHashDestination('/', '#how-it-works', '/#how-it-works', (id) => {
    requestedId = id
    return { scrollIntoView: () => { targetTop = 80 } }
  })

  assert.equal(hashTargetId('#how-it-works'), 'how-it-works')
  assert.equal(handled, true)
  assert.equal(requestedId, 'how-it-works')
  assert.equal(targetTop, 80)
  assert.equal(scrollRepeatedHashDestination('/lawyers', '', '/#how-it-works'), false)
  assert.equal(shouldResetScroll(''), true)
})

test('same-hash interception is limited to unmodified primary link activation', () => {
  const primary = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false }
  assert.equal(isUnmodifiedPrimaryActivation(primary), true)
  assert.equal(isUnmodifiedPrimaryActivation({ ...primary, button: 1 }), false)
  assert.equal(isUnmodifiedPrimaryActivation({ ...primary, metaKey: true }), false)
  assert.equal(isUnmodifiedPrimaryActivation({ ...primary, ctrlKey: true }), false)
  assert.equal(isUnmodifiedPrimaryActivation({ ...primary, shiftKey: true }), false)
  assert.equal(isUnmodifiedPrimaryActivation({ ...primary, altKey: true }), false)
})

const validLawyer = {
  _id: 'lawyer-1',
  user: { _id: 'user-1', name: 'Adv. Meera Sethi' },
  specialization: ['Family Law'],
  yearsOfExperience: 12,
  courtsPracticed: ['Delhi High Court'],
  languages: ['English', 'Hindi'],
  consultationFee: 2000,
  bio: 'Family law counsel.',
  rating: 4.8,
  reviewCount: 42,
  totalConsultations: 160,
}

const validMeta = { total: 1, page: 1, limit: 20, totalPages: 1 }

function assertInvalidContract(action: () => unknown, label: string) {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.kind, 'invalid-response')
    assert.equal(error.status, 200)
    assert.match(error.message, new RegExp(`malformed ${label} data`, 'i'))
    return true
  })
}

test('malformed lawyer list and detail contracts are rejected before rendering', () => {
  assertInvalidContract(() => parseLawyersResponse({
    success: true,
    data: { lawyers: [{ ...validLawyer, rating: '4.8' }] },
    meta: validMeta,
  }), 'lawyer directory')

  assertInvalidContract(() => parseLawyerResponse({
    success: true,
    data: { lawyer: { ...validLawyer, user: { _id: 'user-1' } }, isSaved: false, isBlocked: false },
  }), 'lawyer profile')
})

test('malformed booking contracts are rejected before date and currency formatting', () => {
  assertInvalidContract(() => parseBookingsResponse({
    success: true,
    data: {
      bookings: [{
        _id: 'booking-1',
        lawyerId: { _id: 'lawyer-1', specialization: ['Family Law'], consultationFee: 2000 },
        scheduledAt: 'not-a-date',
        durationMinutes: 30,
        status: 'confirmed',
        createdAt: '2026-07-26T09:00:00.000Z',
      }],
    },
    meta: validMeta,
  }), 'booking')
})

test('malformed saved-lawyer contracts are rejected before nested fields are rendered', () => {
  assertInvalidContract(() => parseSavedLawyersResponse({
    success: true,
    data: {
      savedLawyers: [{
        _id: 'lawyer-1',
        user: { _id: 'user-1', name: 'Adv. Meera Sethi' },
        specialization: ['Family Law'],
        consultationFee: 2000,
        rating: null,
        isAvailable: true,
      }],
    },
  }), 'saved lawyer')
})

test('malformed self-profile and saved mutation contracts are rejected', () => {
  assertInvalidContract(() => parseLawyerProfileResponse({
    lawyer: {
      specialization: ['Family Law'], yearsOfExperience: '12', courtsPracticed: [], languages: ['English'], consultationFee: 2000,
    },
  }), 'lawyer self-profile')

  assertInvalidContract(() => parseSavedLawyerMutationResponse({
    success: true, data: { savedLawyers: [{ _id: 'lawyer-1' }] },
  }), 'saved-lawyer update')

  assertInvalidContract(() => parseBlockedLawyersResponse({
    success: true, data: { blockedLawyers: [{ _id: 'lawyer-1', user: { _id: 'user-1' }, specialization: [] }] },
  }), 'blocked lawyer')
})

test('malformed dashboard contracts are rejected before numeric rendering', () => {
  assertInvalidContract(() => parseLawyerDashboardSummary({
    upcomingBookings: 2,
    earningsThisMonth: 150000,
    rating: 4.7,
    reviewCount: 18,
    verificationStatus: 'unknown',
    unreadMessages: 3,
    isProfileVisible: true,
  }), 'lawyer dashboard')
})

test('malformed lawyer ranking contracts are rejected before the leaderboard renders', () => {
  assertInvalidContract(() => parseLawyerRankingsResponse({
    success: true,
    data: {
      rankings: [{
        rank: 1,
        score: 87.4,
        lawyer: { ...validLawyer, rating: '4.8' },
      }],
    },
    meta: validMeta,
  }), 'lawyer rankings')

  assertInvalidContract(() => parseLawyerRankingsResponse({
    success: true,
    data: {
      rankings: [{
        rank: 0,
        score: 87.4,
        lawyer: validLawyer,
      }],
    },
    meta: validMeta,
  }), 'lawyer rankings')
})

test('well-formed lawyer ranking contracts are accepted', () => {
  const parsed = parseLawyerRankingsResponse({
    success: true,
    data: {
      rankings: [{
        rank: 1,
        score: 87.4,
        lawyer: validLawyer,
      }],
    },
    meta: validMeta,
  })
  assert.equal(parsed.data.rankings[0].rank, 1)
  assert.equal(parsed.data.rankings[0].score, 87.4)
})
