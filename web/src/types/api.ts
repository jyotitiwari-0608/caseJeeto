export type UserRole = 'client' | 'lawyer' | 'admin'

export interface Lawyer {
  _id: string
  user: {
    _id: string
    name: string
  }
  specialization: string[]
  yearsOfExperience: number
  courtsPracticed: string[]
  languages: string[]
  consultationFee: number
  bio?: string
  profilePhoto?: string
  officeAddress?: string
  rating: number
  reviewCount: number
  totalConsultations: number
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface LawyersResponse {
  success: true
  data: {
    lawyers: Lawyer[]
  }
  meta: PaginationMeta
}

export interface LawyerResponse {
  success: true
  data: {
    lawyer: Lawyer
    isSaved: boolean
    isBlocked: boolean
  }
}

export interface LawyerRanking {
  rank: number
  score: number
  lawyer: Lawyer
}

export interface LawyerRankingsResponse {
  success: true
  data: {
    rankings: LawyerRanking[]
  }
  meta: PaginationMeta
}

export interface LawyerRankingFilters {
  specialization?: string
  page?: number
  limit?: number
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface AuthResponse {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

export interface TokenRefreshResponse {
  accessToken: string
  refreshToken: string
}

export interface LawyerFilters {
  name?: string
  specialization?: string
  language?: string
  court?: string
  maxFee?: number
  minExperience?: number
  minRating?: number
  sortBy?: 'rating' | 'fee' | 'experience' | 'consultations'
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface LawyerProfileWriteInput {
  specialization: string[]
  yearsOfExperience: number
  courtsPracticed: string[]
  languages: string[]
  consultationFee: number
  bio: string
  officeAddress: string
}

export interface LawyerProfile {
  specialization: string[]
  yearsOfExperience: number
  courtsPracticed: string[]
  languages: string[]
  consultationFee: number
  bio?: string
  officeAddress?: string
  profilePhoto?: string
}

export interface LawyerProfileResponse {
  lawyer: LawyerProfile
}

// ---------------------------------------------------------------------------
// Bookings (client-facing)
// lawyerId arrives enriched (see server/utils/bookingResponse.js) on
// createBooking/getBookingById/cancelBooking/getBookings. clientId,
// paymentId, and dailyRoomUrl are only present once a booking has
// progressed past creation, so they're optional here rather than assumed.
// ---------------------------------------------------------------------------

export interface Booking {
  _id: string
  lawyerId: {
    _id: string
    specialization: string[]
    consultationFee: number
    name?: string
    email?: string
    profileId?: string | null
    yearsOfExperience?: number
    courtsPracticed?: string[]
    languages?: string[]
  }
  clientId?: string | { _id: string; name?: string; email?: string }
  scheduledAt: string
  durationMinutes: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  paymentId?: string | null
  dailyRoomUrl?: string | null
  createdAt: string
}

export interface BookingsResponse {
  success: true
  data: { bookings: Booking[] }
  meta: PaginationMeta
}

export interface BookingResponse {
  success: true
  data: { booking: Booking }
}

// Booking creation/cancellation both return the same enriched booking
// shape as GET /api/bookings.
export type CreateBookingResponse = BookingResponse

export interface SavedLawyer {
  _id: string
  user: { _id: string; name: string }
  specialization: string[]
  consultationFee: number
  rating: number
  isAvailable: boolean
}

export interface SavedLawyersResponse {
  success: true
  data: { savedLawyers: SavedLawyer[] }
}

export interface SavedLawyerMutationResponse {
  success: true
  data: { savedLawyers: string[] }
}

export interface BlockedLawyer {
  _id: string
  user: { _id: string; name: string }
  specialization: string[]
}

export interface BlockedLawyersResponse {
  success: true
  data: { blockedLawyers: BlockedLawyer[] }
}

export interface LawyerDashboardSummary {
  upcomingBookings: number
  earningsThisMonth: number
  rating: number
  reviewCount: number
  verificationStatus: 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended'
  unreadMessages: number
  isProfileVisible: boolean
}

// ---------------------------------------------------------------------------
// Availability + booking creation (client-facing read of open slots)
// ---------------------------------------------------------------------------

export interface AvailabilitySlot {
  slotId: string
  startTime: string
  endTime: string
}

export interface AvailabilityDay {
  availabilityId: string
  date: string
  slots: AvailabilitySlot[]
}

export interface LawyerAvailabilityResponse {
  success: true
  data: { availability: AvailabilityDay[] }
}

export interface CreateBookingInput {
  lawyerId: string
  availabilityId: string
  slotId: string
  durationMinutes: number
}

// ---------------------------------------------------------------------------
// Availability management (lawyer-self)
// ---------------------------------------------------------------------------

export interface LawyerAvailabilitySlot {
  _id: string
  startTime: string
  endTime: string
  isBooked: boolean
  bookingId: string | null
}

export interface LawyerAvailabilityDay {
  _id: string
  lawyerId: string
  date: string
  slots: LawyerAvailabilitySlot[]
}

export interface MyAvailabilityListResponse {
  success: true
  data: { availability: LawyerAvailabilityDay[] }
}

export interface MyAvailabilityDayResponse {
  success: true
  data: { availability: LawyerAvailabilityDay }
}

export interface SetAvailabilityInput {
  date: string
  slots: Array<{ startTime: string; endTime: string }>
}

// ---------------------------------------------------------------------------
// Bookings management (lawyer-self) — clientId is populated here instead of
// an enriched lawyerId, the mirror image of the client-facing Booking type.
// ---------------------------------------------------------------------------

export interface LawyerBooking {
  _id: string
  clientId: { _id: string; name: string; email: string }
  scheduledAt: string
  durationMinutes: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  createdAt: string
}

export interface LawyerBookingsResponse {
  success: true
  data: { bookings: LawyerBooking[] }
  meta: PaginationMeta
}

export interface LawyerBookingActionResponse {
  success: true
  data: { booking: LawyerBooking }
}

// ---------------------------------------------------------------------------
// Payments / Razorpay checkout
// ---------------------------------------------------------------------------

export type PaymentStatus = 'creating' | 'created' | 'paid' | 'failed' | 'cancelled' | 'refunded'

// Mirrors the Payment model's toJSON transform: paise fields plus the
// *InRupees mirrors the server adds automatically for display.
export interface Payment {
  _id: string
  bookingId: string
  clientId: string
  lawyerId: string
  consultationFee: number
  platformFee: number
  lawyerPayout: number
  consultationFeeInRupees: number
  platformFeeInRupees: number
  lawyerPayoutInRupees: number
  currency: string
  razorpayOrderId: string | null
  razorpayPaymentId: string | null
  paymentStatus: PaymentStatus
  payoutStatus: 'pending' | 'processing' | 'completed' | 'failed'
  refundAmount: number
  refundAmountInRupees: number
  refundReason: string | null
  failureReason: string | null
  createdAt: string
  updatedAt: string
}

export interface RazorpayOrderSummary {
  id: string
  amount: number
  currency: string
  receipt: string
}

export interface CreateOrderResponse {
  success: true
  data: {
    order: RazorpayOrderSummary
    payment: Payment
    keyId: string
  }
}

export interface VerifyPaymentInput {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

export interface VerifyPaymentResponse {
  success: true
  data: {
    payment: Payment
    booking: Booking
  }
}

export interface PaymentResponse {
  success: true
  data: { payment: Payment }
}

// ---------------------------------------------------------------------------
// Invoices
// GET /api/payments/:paymentId/invoice populates Payment.bookingId and
// Payment.lawyerId with summary fields, which is a different shape than the
// plain Payment type used everywhere else (there bookingId/lawyerId are
// plain string ids) — hence the dedicated InvoicePayment type below rather
// than reusing Payment directly.
// ---------------------------------------------------------------------------

export interface PersonRef {
  _id: string
  name: string
  email: string
}

export interface BookingSummaryRef {
  _id: string
  scheduledAt: string
  durationMinutes: number
}

export interface InvoicePayment extends Omit<Payment, 'bookingId' | 'lawyerId'> {
  bookingId: BookingSummaryRef
  lawyerId: PersonRef
}

export interface Invoice {
  invoiceId: string
  date: string
  payment: InvoicePayment
  booking: BookingSummaryRef
  lawyer: PersonRef
}

export interface InvoiceResponse {
  success: true
  data: { invoice: Invoice }
}

// ---------------------------------------------------------------------------
// Reviews
// reviewController.getReviewsForLawyer and lawyerReviewController.getMyReviews
// both populate clientId with just `name`, so list views use ReviewWithClient
// rather than the plain Review returned by create/update/delete.
// ---------------------------------------------------------------------------

export interface Review {
  _id: string
  lawyerId: string
  clientId: string
  bookingId: string
  rating: number
  comment: string
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export interface ReviewResponse {
  success: true
  data: { review: Review }
}

export interface ReviewWithClient {
  _id: string
  lawyerId: string
  clientId: { _id: string; name: string }
  bookingId: string
  rating: number
  comment: string
  createdAt: string
}

export interface ReviewsForLawyerResponse {
  success: true
  data: { reviews: ReviewWithClient[] }
  meta: PaginationMeta
}

// lawyerReviewController.getMyReviews — like payoutController, NOT wrapped
// in { success, data }. Read-only by design: a lawyer can view but never
// edit or delete a client's review.
export interface LawyerOwnReviewsResponse {
  reviews: ReviewWithClient[]
  page: number
  limit: number
  total: number
}

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

export type RefundReason =
  | 'CLIENT_CANCELLED_WITHIN_POLICY'
  | 'CLIENT_CANCELLED_OUTSIDE_POLICY'
  | 'LAWYER_CANCELLED'
  | 'LAWYER_NO_SHOW'
  | 'TECHNICAL_FAILURE'
  | 'DUPLICATE_PAYMENT'
  | 'OTHER'

export type RefundStatus = 'requested' | 'under_review' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed'

export interface Refund {
  _id: string
  paymentId: string
  bookingId: { _id: string; scheduledAt: string }
  refundAmount: number
  refundReason: RefundReason
  refundNote: string | null
  refundStatus: RefundStatus
  razorpayRefundId: string | null
  refundedAt: string | null
  failureReason: string | null
  createdAt: string
  updatedAt: string
}

export interface RefundResponse {
  success: true
  data: { refund: Refund }
}

export interface RefundsResponse {
  success: true
  data: { refunds: Refund[] }
  meta: PaginationMeta
}

// ---------------------------------------------------------------------------
// Video consultation token (Daily.co)
// The access window and meeting-token expiry are capped server-side to
// maxCallMinutes from the scheduled start (see server/config/videoCallRules.js)
// regardless of the booking's paid durationMinutes — see
// consultationController.getVideoToken for why.
// ---------------------------------------------------------------------------

export interface VideoTokenData {
  roomUrl: string
  token: string
  accessClosesAt: string
  maxCallMinutes: number
}

export interface VideoTokenResponse {
  success: true
  data: VideoTokenData
}

// ---------------------------------------------------------------------------
// Lawyer earnings & payouts
// payoutController.js is NOT wrapped in sendSuccess — these two endpoints
// return the raw payload directly, unlike almost everything else in the API.
// getPayoutHistory populates bookingId (scheduledAt) and clientId (name).
// ---------------------------------------------------------------------------

export interface EarningsSummary {
  allTime: {
    totalEarned: number
    totalPaidOut: number
    totalPending: number
    consultationCount: number
  }
  thisMonth: { amount: number; count: number }
}

export interface Payout {
  _id: string
  consultationFee: number
  platformFee: number
  lawyerPayout: number
  lawyerPayoutInRupees: number
  paymentStatus: PaymentStatus
  payoutStatus: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  bookingId: { scheduledAt: string } | string | null
  clientId: { name: string } | string | null
}

export interface PayoutHistoryResponse {
  payments: Payout[]
  page: number
  limit: number
  total: number
}

// ---------------------------------------------------------------------------
// Chat / Socket.IO conversations
// ---------------------------------------------------------------------------

export interface ChatMessage {
  _id: string
  senderId: string
  text: string
  sentAt: string
  readBy: string[]
}

export interface Conversation {
  _id: string
  clientId: string
  lawyerId: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface ConversationResponse {
  success: true
  data: { conversation: Conversation }
}

export interface ClientConversationPreview {
  _id: string
  clientId: string
  lawyerId: { _id: string; name: string }
  messages: ChatMessage[] // sliced to the single most recent message
  createdAt: string
  updatedAt: string
}

export interface ClientConversationsResponse {
  success: true
  data: { conversations: ClientConversationPreview[] }
  meta: PaginationMeta
}

export interface ClientMessagesResponse {
  success: true
  data: { messages: ChatMessage[] }
  meta: PaginationMeta
}

// Lawyer-side inbox: NOT wrapped in { success, data } — see
// lawyerMessageController.js, unlike the client-side conversation routes.
export interface LawyerConversationPreview {
  _id: string
  client: { _id: string; name: string }
  lastMessage: ChatMessage | null
  unreadCount: number
  updatedAt: string
}

export interface LawyerConversationsResponse {
  conversations: LawyerConversationPreview[]
}

export interface LawyerMessagesResponse {
  conversationId: string
  client: { _id: string; name: string }
  messages: ChatMessage[]
  page: number
  limit: number
  total: number
}
