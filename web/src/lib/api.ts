import type {
  AuthResponse,
  AvailabilityDay,
  Booking,
  BookingResponse,
  BookingsResponse,
  ChatMessage,
  ClientConversationPreview,
  ClientConversationsResponse,
  ClientMessagesResponse,
  Conversation,
  ConversationResponse,
  CreateBookingInput,
  CreateOrderResponse,
  EarningsSummary,
  Invoice,
  InvoiceResponse,
  Lawyer,
  LawyerAvailabilityResponse,
  LawyerAvailabilityDay,
  LawyerAvailabilitySlot,
  LawyerBooking,
  LawyerBookingActionResponse,
  LawyerBookingsResponse,
  LawyerConversationPreview,
  LawyerConversationsResponse,
  LawyerDashboardSummary,
  LawyerFilters,
  LawyerMessagesResponse,
  LawyerOwnReviewsResponse,
  LawyerProfileInput,
  LawyerRanking,
  LawyerRankingFilters,
  LawyerRankingsResponse,
  LawyerResponse,
  LawyersResponse,
  MyAvailabilityDayResponse,
  MyAvailabilityListResponse,
  PaginationMeta,
  Payment,
  PaymentResponse,
  Payout,
  PayoutHistoryResponse,
  RazorpayOrderSummary,
  Refund,
  RefundReason,
  RefundResponse,
  RefundsResponse,
  Review,
  ReviewResponse,
  ReviewWithClient,
  ReviewsForLawyerResponse,
  SavedLawyer,
  SavedLawyersResponse,
  SetAvailabilityInput,
  TokenRefreshResponse,
  UserRole,
  VerifyPaymentInput,
  VerifyPaymentResponse,
  VideoTokenResponse,
} from '@/types/api'

const defaultApiUrl = import.meta.env?.DEV ? 'http://localhost:5000/api' : '/api'
export const API_URL = (import.meta.env?.VITE_API_URL || defaultApiUrl).replace(/\/$/, '')
export const DEMO_DATA_ENABLED = Boolean(import.meta.env?.DEV) || import.meta.env?.VITE_ENABLE_DEMO_DATA === 'true'

export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'aborted' | 'invalid-response'

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

function isIsoDateString(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
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

function isBookingLawyerRef(value: unknown): value is Booking['lawyerId'] {
  return isRecord(value) && isNonEmptyString(value._id) && isStringArray(value.specialization) && isFiniteNonNegative(value.consultationFee)
}

function isBooking(value: unknown): value is Booking {
  if (!isRecord(value) || !isBookingLawyerRef(value.lawyerId)) return false
  return isNonEmptyString(value._id) &&
    isIsoDateString(value.scheduledAt) &&
    isNonNegativeInteger(value.durationMinutes) && value.durationMinutes > 0 &&
    ['pending', 'confirmed', 'completed', 'cancelled'].includes(String(value.status)) &&
    isIsoDateString(value.createdAt)
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

function isLawyersResponse(value: unknown): value is LawyersResponse {
  return hasDataObject(value) && Array.isArray(value.data.lawyers) &&
    value.data.lawyers.every(isLawyer) && isPaginationMeta(value.meta)
}

function isLawyerResponse(value: unknown): value is LawyerResponse {
  return hasDataObject(value) && isLawyer(value.data.lawyer) &&
    typeof value.data.isSaved === 'boolean' && typeof value.data.isBlocked === 'boolean'
}

function isLawyerRanking(value: unknown): value is LawyerRanking {
  return isRecord(value) &&
    isNonNegativeInteger(value.rank) && value.rank >= 1 &&
    isFiniteNonNegative(value.score) && value.score <= 100 &&
    isLawyer(value.lawyer)
}

function isLawyerRankingsResponse(value: unknown): value is LawyerRankingsResponse {
  return hasDataObject(value) && Array.isArray(value.data.rankings) &&
    value.data.rankings.every(isLawyerRanking) && isPaginationMeta(value.meta)
}

function isBookingsResponse(value: unknown): value is BookingsResponse {
  return hasDataObject(value) && Array.isArray(value.data.bookings) &&
    value.data.bookings.every(isBooking) && isPaginationMeta(value.meta)
}

function isBookingResponse(value: unknown): value is BookingResponse {
  return hasDataObject(value) && isBooking(value.data.booking)
}

function isSavedLawyersResponse(value: unknown): value is SavedLawyersResponse {
  return hasDataObject(value) && Array.isArray(value.data.savedLawyers) &&
    value.data.savedLawyers.every(isSavedLawyer)
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

// ---- Availability + booking creation (client-facing) -------------------

function isAvailabilitySlot(value: unknown): value is { slotId: string; startTime: string; endTime: string } {
  return isRecord(value) && isNonEmptyString(value.slotId) && isIsoDateString(value.startTime) && isIsoDateString(value.endTime)
}

function isAvailabilityDay(value: unknown): value is AvailabilityDay {
  return isRecord(value) && isNonEmptyString(value.availabilityId) && isIsoDateString(value.date) &&
    Array.isArray(value.slots) && value.slots.every(isAvailabilitySlot)
}

function isLawyerAvailabilityResponse(value: unknown): value is LawyerAvailabilityResponse {
  return hasDataObject(value) && Array.isArray(value.data.availability) && value.data.availability.every(isAvailabilityDay)
}

// ---- Availability management (lawyer-self) ------------------------------

function isLawyerAvailabilitySlot(value: unknown): value is LawyerAvailabilitySlot {
  return isRecord(value) && isNonEmptyString(value._id) && isIsoDateString(value.startTime) && isIsoDateString(value.endTime) &&
    typeof value.isBooked === 'boolean' && (value.bookingId === null || isNonEmptyString(value.bookingId))
}

function isLawyerAvailabilityDay(value: unknown): value is LawyerAvailabilityDay {
  return isRecord(value) && isNonEmptyString(value._id) && isNonEmptyString(value.lawyerId) && isIsoDateString(value.date) &&
    Array.isArray(value.slots) && value.slots.every(isLawyerAvailabilitySlot)
}

function isMyAvailabilityListResponse(value: unknown): value is MyAvailabilityListResponse {
  return hasDataObject(value) && Array.isArray(value.data.availability) && value.data.availability.every(isLawyerAvailabilityDay)
}

function isMyAvailabilityDayResponse(value: unknown): value is MyAvailabilityDayResponse {
  return hasDataObject(value) && isLawyerAvailabilityDay(value.data.availability)
}

// ---- Lawyer bookings management -----------------------------------------

function isLawyerBooking(value: unknown): value is LawyerBooking {
  if (!isRecord(value) || !isRecord(value.clientId)) return false
  return isNonEmptyString(value._id) &&
    isNonEmptyString(value.clientId._id) &&
    isNonEmptyString(value.clientId.name) &&
    isNonEmptyString(value.clientId.email) &&
    isIsoDateString(value.scheduledAt) &&
    isNonNegativeInteger(value.durationMinutes) && value.durationMinutes > 0 &&
    ['pending', 'confirmed', 'completed', 'cancelled'].includes(String(value.status)) &&
    isIsoDateString(value.createdAt)
}

function isLawyerBookingsResponse(value: unknown): value is LawyerBookingsResponse {
  return hasDataObject(value) && Array.isArray(value.data.bookings) && value.data.bookings.every(isLawyerBooking) && isPaginationMeta(value.meta)
}

function isLawyerBookingActionResponse(value: unknown): value is LawyerBookingActionResponse {
  return hasDataObject(value) && isLawyerBooking(value.data.booking)
}

// ---- Payments / Razorpay -------------------------------------------------

function isRazorpayOrderSummary(value: unknown): value is RazorpayOrderSummary {
  return isRecord(value) && isNonEmptyString(value.id) && isFiniteNonNegative(value.amount) &&
    isNonEmptyString(value.currency) && typeof value.receipt === 'string'
}

function isPayment(value: unknown): value is Payment {
  return isRecord(value) &&
    isNonEmptyString(value._id) &&
    isNonEmptyString(value.bookingId) &&
    isFiniteNonNegative(value.consultationFee) &&
    isFiniteNonNegative(value.consultationFeeInRupees) &&
    ['creating', 'created', 'paid', 'failed', 'cancelled', 'refunded'].includes(String(value.paymentStatus))
}

function isCreateOrderResponse(value: unknown): value is CreateOrderResponse {
  return hasDataObject(value) && isRazorpayOrderSummary(value.data.order) &&
    isPayment(value.data.payment) && isNonEmptyString(value.data.keyId)
}

function isVerifyPaymentResponse(value: unknown): value is VerifyPaymentResponse {
  return hasDataObject(value) && isPayment(value.data.payment) && isBooking(value.data.booking)
}

function isPaymentResponse(value: unknown): value is PaymentResponse {
  return hasDataObject(value) && isPayment(value.data.payment)
}

// ---- Invoices -----------------------------------------------------------

function isPersonRef(value: unknown): value is { _id: string; name: string; email: string } {
  return isRecord(value) && isNonEmptyString(value._id) && isNonEmptyString(value.name) && isNonEmptyString(value.email)
}

function isBookingSummaryRef(value: unknown): value is { _id: string; scheduledAt: string; durationMinutes: number } {
  return isRecord(value) && isNonEmptyString(value._id) && isIsoDateString(value.scheduledAt) && isNonNegativeInteger(value.durationMinutes)
}

function isInvoicePayment(value: unknown): value is Invoice['payment'] {
  return isRecord(value) &&
    isNonEmptyString(value._id) &&
    isBookingSummaryRef(value.bookingId) &&
    isPersonRef(value.lawyerId) &&
    isFiniteNonNegative(value.consultationFee) &&
    isFiniteNonNegative(value.consultationFeeInRupees) &&
    ['creating', 'created', 'paid', 'failed', 'cancelled', 'refunded'].includes(String(value.paymentStatus))
}

function isInvoice(value: unknown): value is Invoice {
  return isRecord(value) &&
    isNonEmptyString(value.invoiceId) &&
    isIsoDateString(value.date) &&
    isInvoicePayment(value.payment) &&
    isBookingSummaryRef(value.booking) &&
    isPersonRef(value.lawyer)
}

function isInvoiceResponse(value: unknown): value is InvoiceResponse {
  return hasDataObject(value) && isInvoice(value.data.invoice)
}

// ---- Reviews ---------------------------------------------------------

function isReview(value: unknown): value is Review {
  return isRecord(value) &&
    isNonEmptyString(value._id) &&
    isNonEmptyString(value.lawyerId) &&
    isNonEmptyString(value.clientId) &&
    isNonEmptyString(value.bookingId) &&
    typeof value.rating === 'number' && value.rating >= 1 && value.rating <= 5 &&
    typeof value.comment === 'string' &&
    isIsoDateString(value.createdAt)
}

function isReviewResponse(value: unknown): value is ReviewResponse {
  return hasDataObject(value) && isReview(value.data.review)
}

function isReviewWithClient(value: unknown): value is ReviewWithClient {
  if (!isRecord(value) || !isRecord(value.clientId)) return false
  return isNonEmptyString(value._id) &&
    isNonEmptyString(value.lawyerId) &&
    isNonEmptyString(value.clientId._id) &&
    isNonEmptyString(value.clientId.name) &&
    isNonEmptyString(value.bookingId) &&
    typeof value.rating === 'number' && value.rating >= 1 && value.rating <= 5 &&
    typeof value.comment === 'string' &&
    isIsoDateString(value.createdAt)
}

function isReviewsForLawyerResponse(value: unknown): value is ReviewsForLawyerResponse {
  return hasDataObject(value) && Array.isArray(value.data.reviews) && value.data.reviews.every(isReviewWithClient) && isPaginationMeta(value.meta)
}

function isLawyerOwnReviewsResponse(value: unknown): value is LawyerOwnReviewsResponse {
  return isRecord(value) && Array.isArray(value.reviews) && value.reviews.every(isReviewWithClient) &&
    isNonNegativeInteger(value.page) && isNonNegativeInteger(value.limit) && isNonNegativeInteger(value.total)
}

// ---- Refunds ---------------------------------------------------------

const REFUND_REASONS = [
  'CLIENT_CANCELLED_WITHIN_POLICY',
  'CLIENT_CANCELLED_OUTSIDE_POLICY',
  'LAWYER_CANCELLED',
  'LAWYER_NO_SHOW',
  'TECHNICAL_FAILURE',
  'DUPLICATE_PAYMENT',
  'OTHER',
]

const REFUND_STATUSES = ['requested', 'under_review', 'approved', 'rejected', 'processing', 'completed', 'failed']

function isBookingRef(value: unknown): value is { _id: string; scheduledAt: string } {
  return isRecord(value) && isNonEmptyString(value._id) && isNonEmptyString(value.scheduledAt)
}

function isRefund(value: unknown): value is Refund {
  if (!isRecord(value)) return false
  return isNonEmptyString(value._id) &&
    isNonEmptyString(value.paymentId) &&
    isBookingRef(value.bookingId) &&
    isFiniteNonNegative(value.refundAmount) &&
    REFUND_REASONS.includes(String(value.refundReason)) &&
    REFUND_STATUSES.includes(String(value.refundStatus)) &&
    isIsoDateString(value.createdAt)
}

function isRefundResponse(value: unknown): value is RefundResponse {
  return hasDataObject(value) && isRefund(value.data.refund)
}

function isRefundsResponse(value: unknown): value is RefundsResponse {
  return hasDataObject(value) && Array.isArray(value.data.refunds) &&
    value.data.refunds.every(isRefund) && isPaginationMeta(value.meta)
}

// ---- Video consultation token --------------------------------------------

function isVideoTokenResponse(value: unknown): value is VideoTokenResponse {
  if (!hasDataObject(value)) return false
  const data = value.data
  return isNonEmptyString(data.roomUrl) && isNonEmptyString(data.token) &&
    isIsoDateString(data.accessClosesAt) && isNonNegativeInteger(data.maxCallMinutes)
}

// ---- Earnings + payouts (no envelope) -----------------------------------

function isEarningsSummary(value: unknown): value is EarningsSummary {
  if (!isRecord(value) || !isRecord(value.allTime) || !isRecord(value.thisMonth)) return false
  return isFiniteNonNegative(value.allTime.totalEarned) &&
    isFiniteNonNegative(value.allTime.totalPaidOut) &&
    isFiniteNonNegative(value.allTime.totalPending) &&
    isNonNegativeInteger(value.allTime.consultationCount) &&
    isFiniteNonNegative(value.thisMonth.amount) &&
    isNonNegativeInteger(value.thisMonth.count)
}

function isPayout(value: unknown): value is Payout {
  if (!isRecord(value)) return false
  const bookingRef = value.bookingId
  const clientRef = value.clientId
  const bookingRefValid = bookingRef === null || isNonEmptyString(bookingRef) || (isRecord(bookingRef) && isIsoDateString(bookingRef.scheduledAt))
  const clientRefValid = clientRef === null || isNonEmptyString(clientRef) || (isRecord(clientRef) && isNonEmptyString(clientRef.name))
  return isNonEmptyString(value._id) &&
    isFiniteNonNegative(value.lawyerPayout) &&
    isFiniteNonNegative(value.lawyerPayoutInRupees) &&
    ['pending', 'processing', 'completed', 'failed'].includes(String(value.payoutStatus)) &&
    isIsoDateString(value.createdAt) &&
    bookingRefValid && clientRefValid
}

function isPayoutHistoryResponse(value: unknown): value is PayoutHistoryResponse {
  return isRecord(value) && Array.isArray(value.payments) && value.payments.every(isPayout) &&
    isNonNegativeInteger(value.page) && isNonNegativeInteger(value.limit) && isNonNegativeInteger(value.total)
}

// ---- Conversations / chat ----------------------------------------------

function isChatMessage(value: unknown): value is ChatMessage {
  return isRecord(value) && isNonEmptyString(value._id) && isNonEmptyString(value.senderId) &&
    typeof value.text === 'string' && isIsoDateString(value.sentAt) && Array.isArray(value.readBy)
}

function isConversation(value: unknown): value is Conversation {
  return isRecord(value) && isNonEmptyString(value._id) && isNonEmptyString(value.clientId) &&
    isNonEmptyString(value.lawyerId) && Array.isArray(value.messages) && value.messages.every(isChatMessage)
}

function isConversationResponse(value: unknown): value is ConversationResponse {
  return hasDataObject(value) && isConversation(value.data.conversation)
}

function isClientConversationPreview(value: unknown): value is ClientConversationPreview {
  if (!isRecord(value) || !isRecord(value.lawyerId)) return false
  return isNonEmptyString(value._id) && isNonEmptyString(value.lawyerId._id) && isNonEmptyString(value.lawyerId.name) &&
    Array.isArray(value.messages) && value.messages.every(isChatMessage) && isIsoDateString(value.updatedAt)
}

function isClientConversationsResponse(value: unknown): value is ClientConversationsResponse {
  return hasDataObject(value) && Array.isArray(value.data.conversations) &&
    value.data.conversations.every(isClientConversationPreview) && isPaginationMeta(value.meta)
}

function isClientMessagesResponse(value: unknown): value is ClientMessagesResponse {
  return hasDataObject(value) && Array.isArray(value.data.messages) && value.data.messages.every(isChatMessage) && isPaginationMeta(value.meta)
}

function isLawyerConversationPreview(value: unknown): value is LawyerConversationPreview {
  if (!isRecord(value) || !isRecord(value.client)) return false
  return isNonEmptyString(value._id) && isNonEmptyString(value.client._id) && isNonEmptyString(value.client.name) &&
    (value.lastMessage === null || isChatMessage(value.lastMessage)) &&
    isNonNegativeInteger(value.unreadCount) && isIsoDateString(value.updatedAt)
}

function isLawyerConversationsResponse(value: unknown): value is LawyerConversationsResponse {
  return isRecord(value) && Array.isArray(value.conversations) && value.conversations.every(isLawyerConversationPreview)
}

function isLawyerMessagesResponse(value: unknown): value is LawyerMessagesResponse {
  return isRecord(value) && isNonEmptyString(value.conversationId) && Array.isArray(value.messages) &&
    value.messages.every(isChatMessage) && isNonNegativeInteger(value.page) && isNonNegativeInteger(value.limit) && isNonNegativeInteger(value.total)
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
export function parseLawyerRankingsResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'lawyer rankings', isLawyerRankingsResponse)
}
export function parseBookingsResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'booking', isBookingsResponse)
}
export function parseBookingResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'booking', isBookingResponse)
}
export function parseCreateBookingResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'booking creation', isBookingResponse)
}
export function parseSavedLawyersResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'saved lawyer', isSavedLawyersResponse)
}
export function parseLawyerDashboardSummary(value: unknown, status = 200) {
  return parseResponse(value, status, 'lawyer dashboard', isLawyerDashboardSummary)
}
export function parseLawyerAvailabilityResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'lawyer availability', isLawyerAvailabilityResponse)
}
export function parseMyAvailabilityListResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'availability list', isMyAvailabilityListResponse)
}
export function parseMyAvailabilityDayResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'availability update', isMyAvailabilityDayResponse)
}
export function parseLawyerBookingsResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'lawyer booking', isLawyerBookingsResponse)
}
export function parseLawyerBookingActionResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'lawyer booking update', isLawyerBookingActionResponse)
}
export function parseCreateOrderResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'payment order', isCreateOrderResponse)
}
export function parseVerifyPaymentResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'payment verification', isVerifyPaymentResponse)
}
export function parsePaymentResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'payment', isPaymentResponse)
}
export function parseInvoiceResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'invoice', isInvoiceResponse)
}
export function parseVideoTokenResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'video consultation token', isVideoTokenResponse)
}
export function parseReviewResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'review', isReviewResponse)
}
export function parseReviewsForLawyerResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'lawyer review', isReviewsForLawyerResponse)
}
export function parseLawyerOwnReviewsResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'my reviews', isLawyerOwnReviewsResponse)
}
export function parseRefundResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'refund', isRefundResponse)
}
export function parseRefundsResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'refund', isRefundsResponse)
}
export function parseEarningsSummary(value: unknown, status = 200) {
  return parseResponse(value, status, 'earnings summary', isEarningsSummary)
}
export function parsePayoutHistoryResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'payout history', isPayoutHistoryResponse)
}
export function parseConversationResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'conversation', isConversationResponse)
}
export function parseClientConversationsResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'conversation list', isClientConversationsResponse)
}
export function parseClientMessagesResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'message', isClientMessagesResponse)
}
export function parseLawyerConversationsResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'conversation list', isLawyerConversationsResponse)
}
export function parseLawyerMessagesResponse(value: unknown, status = 200) {
  return parseResponse(value, status, 'message', isLawyerMessagesResponse)
}

async function request<T>(path: string, init: RequestInit = {}, options: RequestOptions = {}): Promise<T> {
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
  getLawyer(id: string, accessToken?: string, signal?: AbortSignal) {
    return request<LawyerResponse>(`/lawyers/${encodeURIComponent(id)}`, {
      signal,
      headers: accessToken ? bearer(accessToken) : undefined,
    }, { authenticated: Boolean(accessToken), parser: parseLawyerResponse })
  },
  getLawyerRankings(filters: LawyerRankingFilters = {}, signal?: AbortSignal) {
    const query = new URLSearchParams()
    if (filters.specialization) query.set('specialization', filters.specialization)
    if (filters.page) query.set('page', String(filters.page))
    if (filters.limit) query.set('limit', String(filters.limit))
    const qs = query.toString()
    return request<LawyerRankingsResponse>(`/lawyers/rankings${qs ? `?${qs}` : ''}`, { signal }, { parser: parseLawyerRankingsResponse })
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
  updateLawyerProfile(input: Partial<LawyerProfileInput>, accessToken: string) {
    return request<{ lawyer: unknown }>('/lawyers/me', {
      method: 'PATCH', headers: bearer(accessToken), body: JSON.stringify(input),
    }, { authenticated: true, parser: (value, status) => parseResponse(value, status, 'lawyer profile update', (input): input is { lawyer: unknown } => isRecord(input) && isRecord(input.lawyer)) })
  },
  getLawyerDashboard(accessToken: string, signal?: AbortSignal) {
    return request<LawyerDashboardSummary>('/lawyers/me/dashboard', { headers: bearer(accessToken), signal }, { authenticated: true, parser: parseLawyerDashboardSummary })
  },
  getClientBookings(accessToken: string, signal?: AbortSignal) {
    return request<BookingsResponse>('/bookings?limit=20', { headers: bearer(accessToken), signal }, { authenticated: true, parser: parseBookingsResponse })
  },
  getBookingById(id: string, accessToken: string, signal?: AbortSignal) {
    return request<BookingResponse>(`/bookings/${encodeURIComponent(id)}`, { headers: bearer(accessToken), signal }, { authenticated: true, parser: parseBookingResponse })
  },
  getSavedLawyers(accessToken: string, signal?: AbortSignal) {
    return request<SavedLawyersResponse>('/clients/me/saved-lawyers', { headers: bearer(accessToken), signal }, { authenticated: true, parser: parseSavedLawyersResponse })
  },

  // ---- Booking + availability (client-facing) -----------------------
  getLawyerAvailability(lawyerId: string, params: { from?: string; to?: string } = {}, signal?: AbortSignal) {
    const query = new URLSearchParams()
    if (params.from) query.set('from', params.from)
    if (params.to) query.set('to', params.to)
    const qs = query.toString()
    return request<LawyerAvailabilityResponse>(`/lawyers/${encodeURIComponent(lawyerId)}/availability${qs ? `?${qs}` : ''}`, { signal }, { parser: parseLawyerAvailabilityResponse })
  },
  createBooking(input: CreateBookingInput, accessToken: string) {
    return request<BookingResponse>('/bookings', {
      method: 'POST', headers: bearer(accessToken), body: JSON.stringify(input),
    }, { authenticated: true, parser: parseBookingResponse })
  },
  cancelBooking(bookingId: string, accessToken: string, reason?: string) {
    return request<BookingResponse>(`/bookings/${encodeURIComponent(bookingId)}/cancel`, {
      method: 'POST', headers: bearer(accessToken), body: JSON.stringify({ reason }),
    }, { authenticated: true, parser: parseBookingResponse })
  },

  // ---- Availability management (lawyer-self) -------------------------
  getMyAvailability(accessToken: string, params: { from?: string; to?: string } = {}, signal?: AbortSignal) {
    const query = new URLSearchParams()
    if (params.from) query.set('from', params.from)
    if (params.to) query.set('to', params.to)
    const qs = query.toString()
    return request<MyAvailabilityListResponse>(`/lawyers/me/availability${qs ? `?${qs}` : ''}`, { headers: bearer(accessToken), signal }, { authenticated: true, parser: parseMyAvailabilityListResponse })
  },
  setMyAvailability(input: SetAvailabilityInput, accessToken: string) {
    return request<MyAvailabilityDayResponse>('/lawyers/me/availability', {
      method: 'POST', headers: bearer(accessToken), body: JSON.stringify(input),
    }, { authenticated: true, parser: parseMyAvailabilityDayResponse })
  },
  deleteAvailabilitySlot(availabilityId: string, slotId: string, accessToken: string) {
    return request<MyAvailabilityDayResponse>(`/lawyers/me/availability/${encodeURIComponent(availabilityId)}/slots/${encodeURIComponent(slotId)}`, {
      method: 'DELETE', headers: bearer(accessToken),
    }, { authenticated: true, parser: parseMyAvailabilityDayResponse })
  },

  // ---- Bookings management (lawyer-self) ------------------------------
  getMyLawyerBookings(accessToken: string, params: { status?: string } = {}, signal?: AbortSignal) {
    const query = new URLSearchParams()
    if (params.status) query.set('status', params.status)
    const qs = query.toString()
    return request<LawyerBookingsResponse>(`/lawyers/me/bookings${qs ? `?${qs}` : ''}`, { headers: bearer(accessToken), signal }, { authenticated: true, parser: parseLawyerBookingsResponse })
  },
  getLawyerBookingById(bookingId: string, accessToken: string, signal?: AbortSignal) {
    return request<LawyerBookingActionResponse>(`/lawyers/me/bookings/${encodeURIComponent(bookingId)}`, { headers: bearer(accessToken), signal }, { authenticated: true, parser: parseLawyerBookingActionResponse })
  },
  markBookingCompleted(bookingId: string, accessToken: string) {
    return request<LawyerBookingActionResponse>(`/lawyers/me/bookings/${encodeURIComponent(bookingId)}/complete`, {
      method: 'PATCH', headers: bearer(accessToken),
    }, { authenticated: true, parser: parseLawyerBookingActionResponse })
  },
  cancelLawyerBooking(bookingId: string, accessToken: string, reason?: string) {
    return request<LawyerBookingActionResponse>(`/lawyers/me/bookings/${encodeURIComponent(bookingId)}/cancel`, {
      method: 'POST', headers: bearer(accessToken), body: JSON.stringify({ reason }),
    }, { authenticated: true, parser: parseLawyerBookingActionResponse })
  },

  // ---- Payments / Razorpay checkout -----------------------------------
  createPaymentOrder(bookingId: string, accessToken: string) {
    return request<CreateOrderResponse>('/payments/orders', {
      method: 'POST', headers: bearer(accessToken), body: JSON.stringify({ bookingId }),
    }, { authenticated: true, parser: parseCreateOrderResponse })
  },
  verifyPayment(input: VerifyPaymentInput, accessToken: string) {
    return request<VerifyPaymentResponse>('/payments/verify', {
      method: 'POST', headers: bearer(accessToken), body: JSON.stringify(input),
    }, { authenticated: true, parser: parseVerifyPaymentResponse })
  },
  getPaymentByBooking(bookingId: string, accessToken: string, signal?: AbortSignal) {
    return request<PaymentResponse>(`/payments/booking/${encodeURIComponent(bookingId)}`, { headers: bearer(accessToken), signal }, { authenticated: true, parser: parsePaymentResponse })
  },
  getInvoice(paymentId: string, accessToken: string, signal?: AbortSignal) {
    return request<InvoiceResponse>(`/payments/${encodeURIComponent(paymentId)}/invoice`, { headers: bearer(accessToken), signal }, { authenticated: true, parser: parseInvoiceResponse })
  },

  // ---- Video consultation -------------------------------------------
  // Same handler serves both roles (consultationController.getVideoToken
  // checks booking.clientId / booking.lawyerId internally) — one method
  // works for either side, no role branching needed here.
  getVideoToken(bookingId: string, accessToken: string, signal?: AbortSignal) {
    return request<VideoTokenResponse>(`/bookings/${encodeURIComponent(bookingId)}/video-token`, { headers: bearer(accessToken), signal }, { authenticated: true, parser: parseVideoTokenResponse })
  },

  // ---- Reviews -----------------------------------------------------------
  createReview(input: { bookingId: string; rating: number; comment?: string }, accessToken: string) {
    return request<ReviewResponse>('/reviews', {
      method: 'POST', headers: bearer(accessToken), body: JSON.stringify(input),
    }, { authenticated: true, parser: parseReviewResponse })
  },
  updateReview(id: string, input: { rating?: number; comment?: string }, accessToken: string) {
    return request<ReviewResponse>(`/reviews/${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: bearer(accessToken), body: JSON.stringify(input),
    }, { authenticated: true, parser: parseReviewResponse })
  },
  deleteReview(id: string, accessToken: string) {
    return request<{ message: string }>(`/reviews/${encodeURIComponent(id)}`, {
      method: 'DELETE', headers: bearer(accessToken),
    }, { authenticated: true, parser: (value, status) => parseResponse(value, status, 'review deletion', (input): input is { message: string } => isRecord(input) && typeof input.message === 'string') })
  },
  getLawyerReviews(lawyerId: string, params: { page?: number; limit?: number } = {}, signal?: AbortSignal) {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    const qs = query.toString()
    return request<ReviewsForLawyerResponse>(`/reviews/lawyer/${encodeURIComponent(lawyerId)}${qs ? `?${qs}` : ''}`, { signal }, { parser: parseReviewsForLawyerResponse })
  },
  getMyLawyerReviews(accessToken: string, params: { page?: number; limit?: number } = {}, signal?: AbortSignal) {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    const qs = query.toString()
    return request<LawyerOwnReviewsResponse>(`/lawyers/me/reviews${qs ? `?${qs}` : ''}`, { headers: bearer(accessToken), signal }, { authenticated: true, parser: parseLawyerOwnReviewsResponse })
  },

  // ---- Refunds -----------------------------------------------------------
  requestRefund(input: { bookingId: string; refundReason: RefundReason; refundNote?: string; evidence: string }, accessToken: string) {
    return request<RefundResponse>('/refunds', {
      method: 'POST', headers: bearer(accessToken), body: JSON.stringify(input),
    }, { authenticated: true, parser: parseRefundResponse })
  },
  getMyRefunds(accessToken: string, signal?: AbortSignal) {
    return request<RefundsResponse>('/refunds/me?limit=20', { headers: bearer(accessToken), signal }, { authenticated: true, parser: parseRefundsResponse })
  },

  // ---- Lawyer earnings & payouts ------------------------------------------
  getLawyerEarnings(accessToken: string, signal?: AbortSignal) {
    return request<EarningsSummary>('/lawyers/me/earnings', { headers: bearer(accessToken), signal }, { authenticated: true, parser: parseEarningsSummary })
  },
  getPayoutHistory(accessToken: string, params: { status?: string; page?: number; limit?: number } = {}, signal?: AbortSignal) {
    const query = new URLSearchParams()
    if (params.status) query.set('status', params.status)
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    const qs = query.toString()
    return request<PayoutHistoryResponse>(`/lawyers/me/payouts${qs ? `?${qs}` : ''}`, { headers: bearer(accessToken), signal }, { authenticated: true, parser: parsePayoutHistoryResponse })
  },

  // ---- Chat / conversations --------------------------------------------
  getOrCreateConversation(lawyerId: string, accessToken: string) {
    return request<ConversationResponse>(`/conversations/with/${encodeURIComponent(lawyerId)}`, {
      method: 'POST', headers: bearer(accessToken),
    }, { authenticated: true, parser: parseConversationResponse })
  },
  getClientConversations(accessToken: string, signal?: AbortSignal) {
    return request<ClientConversationsResponse>('/conversations?limit=30', { headers: bearer(accessToken), signal }, { authenticated: true, parser: parseClientConversationsResponse })
  },
  getClientConversationMessages(conversationId: string, accessToken: string, signal?: AbortSignal, page = 1, limit = 50) {
    return request<ClientMessagesResponse>(`/conversations/${encodeURIComponent(conversationId)}/messages?page=${page}&limit=${limit}`, {
      headers: bearer(accessToken), signal,
    }, { authenticated: true, parser: parseClientMessagesResponse })
  },
  getLawyerConversations(accessToken: string, signal?: AbortSignal) {
    return request<LawyerConversationsResponse>('/lawyers/me/conversations', { headers: bearer(accessToken), signal }, { authenticated: true, parser: parseLawyerConversationsResponse })
  },
  getLawyerConversationMessages(conversationId: string, accessToken: string, signal?: AbortSignal, page = 1, limit = 50) {
    return request<LawyerMessagesResponse>(`/lawyers/me/conversations/${encodeURIComponent(conversationId)}/messages?page=${page}&limit=${limit}`, {
      headers: bearer(accessToken), signal,
    }, { authenticated: true, parser: parseLawyerMessagesResponse })
  },
  markLawyerConversationRead(conversationId: string, accessToken: string) {
    return request<{ message: string }>(`/lawyers/me/conversations/${encodeURIComponent(conversationId)}/read`, {
      method: 'PATCH', headers: bearer(accessToken),
    }, { authenticated: true, parser: (value, status) => parseResponse(value, status, 'read receipt', (input): input is { message: string } => isRecord(input) && typeof input.message === 'string') })
  },
}

export { ApiError }
