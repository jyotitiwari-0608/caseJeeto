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

export interface Booking {
  _id: string
  lawyerId: {
    _id: string
    specialization: string[]
    consultationFee: number
  }
  scheduledAt: string
  durationMinutes: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  createdAt: string
}

export interface BookingsResponse {
  success: true
  data: { bookings: Booking[] }
  meta: PaginationMeta
}

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
