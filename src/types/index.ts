// 사용자 관련 타입

export interface User {
  id: number
  email: string
  nickname: string
  profileImageUrl?: string
  createdAt?: string
}

export interface UserInfo {
  id: string
  email: string
  name: string
  phone: string
  profileImage?: string
  creditScore: number
  reviewCount: number
  joinDate: string
  isVerified: boolean
}

// 상품 관련 타입
export interface Product {
  productId: number
  name: string
  description: string
  category: ProductCategory
  images: (string | { imageUrl: string; id?: number; productId?: number })[]
  initialPrice: number
  currentPrice: number
  seller: {
    id: string
    nickname: string
    profileImage: string
    creditScore: number
    reviewCount: number
  }
  status: ProductStatus
  location: string
  createDate: string
  modifyDate: string
  auctionStartTime: string
  auctionEndTime: string
  deliveryMethod: 'DELIVERY' | 'TRADE' | 'BOTH'
  bidderCount: number
  thumbnailUrl: string
}

export type ProductCategory =
  | 'digital'
  | 'fashion'
  | 'beauty'
  | 'home'
  | 'sports'
  | 'books'
  | 'other'

export type ProductStatus = '경매 시작 전' | '경매 중' | '낙찰' | '유찰'

// 경매 상세 조회 응답 타입 (새로운 구조)
export interface AuctionDetail {
  auctionId: number
  productId: number
  sellerId: number
  sellerNickname: string
  name: string
  description: string
  category: string
  status: 'SCHEDULED' | 'LIVE' | 'ENDED'
  startPrice: number
  buyNowPrice: number
  minBidStep: number
  startAt: string
  endAt: string
  createdAt: string
  currentHighestBid: number
  totalBidCount: number
  remainingTimeSeconds: number
  imageUrls: string[]
  isBookmarked: boolean
}

// 입찰 관련 타입
export interface Bid {
  id: number
  productId: number
  userId: number
  amount: number
  createdAt: string
  isWinning: boolean
}

export interface BidHistory {
  id: number
  product: Product
  bidAmount: number
  status: BidStatus
  bidTime: string
  auctionEndTime: string
  currentPrice: number
}

export type BidStatus = 'active' | 'won' | 'lost' | 'cancelled'

// 찜(북마크) 관련 타입
export interface BookmarkItem {
  id: number
  productId: number
  title: string
  productImagelUrl: string
  bookmarkedAt: string
}

export interface BookmarksResponse {
  page: number
  total: number
  bookmarks: BookmarkItem[]
}

// 내가 등록한 상품 타입
export interface MyProductItem {
  auctionId: number
  productId: number
  name: string
  imageUrl: string
  status: 'SCHEDULED' | 'LIVE' | 'ENDED'
  currentHighestBid: number
  startPrice: number
  endAt: string
  bookmarkCount: number
  bidCount: number
  remainingTimeSeconds: number
}

// 참여한 경매 목록 타입
export interface MyBidItem {
  auctionId: number
  productId: number
  productName: string
  productImageUrl: string
  myBid: number
  finalBid: number | null // 낙찰 시 금액, 실패 또는 진행중이면 null
  status: 'WIN' | 'LOSE'
  endAt: string
}

// 경매 목록 아이템 타입
export interface AuctionListItem {
  auctionId: number
  productId: number
  name: string
  imageUrl: string
  status: 'SCHEDULED' | 'LIVE' | 'ENDED'
  currentHighestBid: number
  startPrice: number
  endAt: string
  bookmarkCount: number
  bidCount: number
  remainingTimeSeconds: number
}

// 경매 목록 응답 타입 (커서 기반 페이징)
export interface AuctionListResponse {
  cursor?: string // 다음 페이지 커서 (있으면)
  items: AuctionListItem[]
}

// 경매 입찰 내역 타입 (새로운 API 구조)
export interface AuctionBidItem {
  bidId: number
  bidderNickname: string
  bidAmount: number
  bidTime: string
  isAuto: boolean
}

export interface AuctionBidsResponse {
  page: number
  size: number
  totalCount: number
  hasNext: boolean
  items: AuctionBidItem[]
}

// 경매 입찰 요청 타입
export interface BidCreateRequest {
  bidAmount: number // 입찰 금액 (현재 최고가 + 최소입찰단위 이상)
}

// 경매 입찰 응답 타입
export interface BidCreateResponse {
  auctionId: number
  isHighestBidder: boolean
  currentHighestBid: number
  bidTime: string
}

// 즉시 구매 요청 타입
export interface BuyNowRequest {
  amount: number // 총 결제 금액 (buyNowPrice와 일치)
  methodId: number // 결제 수단 ID (자동 결제를 위한 등록된 카드 ID)
}

// 즉시 구매 응답 타입
export interface BuyNowResponse {
  auctionId: number
  auctionStatus: 'ENDED'
  winnerId: number
  finalPrice: number
  winTime: string
  paymentRequestId: number
  paymentStatus: 'REQUESTED'
}

// 알림 관련 타입
export interface Notification {
  id: number
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  createdAt: string
  productId?: number
  bidId?: number
}

export type NotificationType = 'bid' | 'win' | 'payment' | 'system'

// 게시판 관련 타입
export interface Post {
  id: number
  title: string
  content: string
  author: string
  category: PostCategory
  createdAt: string
  isImportant: boolean
  isPinned: boolean
  viewCount: number
  commentCount: number
}

export type PostCategory = 'notice' | 'qna' | 'faq'

export interface QnA extends Post {
  status: QnAStatus
  answers: Answer[]
}

export type QnAStatus = 'pending' | 'answered'

export interface Answer {
  id: string
  content: string
  author: string
  createdAt: string
}

// 통계 관련 타입
export interface UserStats {
  totalSales: number
  totalPurchases: number
  totalAmount: number
  successRate: number
  activeBids: number
  completedSales: number
  failedBids: number
}

export interface ProductStats {
  totalProducts: number
  activeProducts: number
  completedSales: number
  cancelledProducts: number
  totalRevenue: number
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// 폼 관련 타입
export interface LoginForm {
  email: string
  password: string
  rememberMe: boolean
}

export interface SignupForm {
  name: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  agreeToTerms: boolean
  agreeToPrivacy: boolean
}

export interface ProductForm {
  name: string
  description: string
  categoryId: number
  images: File[]
  initialPrice: number
  auctionStartTime: string
  auctionDuration: string
  deliveryMethod: ('TRADE' | 'DELIVERY' | 'BOTH')[]
  location: string
}

// 필터 관련 타입
export interface ProductFilters {
  category?: ProductCategory
  status?: ProductStatus
  minPrice?: number
  maxPrice?: number
  location?: string
  search?: string
}

export interface BidFilters {
  status?: BidStatus
  dateRange?: {
    start: string
    end: string
  }
}

// 검색 관련 타입
export interface SearchResult {
  products: Product[]
  users: User[]
  posts: Post[]
  total: number
}

// 결제 관련 타입
export interface Payment {
  id: string
  productId: string
  amount: number
  status: PaymentStatus
  method: PaymentMethod
  createdAt: string
  completedAt?: string
}

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled'

export type PaymentMethod = 'card' | 'bank' | 'kakao' | 'naver'

// 리뷰 관련 타입
export interface Review {
  reviewId: number
  reviewerNickname: string
  comment: string
  isSatisfied: boolean
  createdAt: string
}

export interface ReviewRequest {
  productId: number
  comment: string
  isSatisfied: boolean
}

export interface ReviewResponse {
  reviewId: number
  reviewerNickname: string
  comment: string
  isSatisfied: boolean
  createdAt: string
}
