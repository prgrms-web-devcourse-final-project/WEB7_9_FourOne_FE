// API 명세에 맞는 타입 정의
import type { components } from './swagger-generated'

// API 응답 타입 (새로운 백엔드 구조와 기존 구조 모두 지원)
export type ApiResponse<T> = {
  // 새로운 구조
  code?: string
  status?: number
  message?: string
  // 기존 구조 (하위 호환성)
  resultCode: string
  msg: string
  data?: T
  success?: boolean
}

// 새로운 백엔드 응답 구조
export type RsData<T> = {
  code?: string
  status?: number
  message?: string
  data?: T
}

// 인증 관련 타입 (새로운 백엔드 구조)
export type LoginRequest = components['schemas']['LocalLoginRequest']
export type LoginResponse = components['schemas']['LocalLoginResponse']
export type SignupRequest = components['schemas']['LocalSignUpRequest']
export type SignupResponse = components['schemas']['LocalSignUpResponse']
export type LogoutResponse = components['schemas']['RsDataVoid']
export type GetCurrentUserInfoResponse =
  components['schemas']['GetCurrentUserInfoResponse']

// 사용자 관련 타입 (새로운 백엔드 구조)
export type UserInfo = components['schemas']['GetCurrentUserInfoResponse']
export type UserInfoUpdate = components['schemas']['GetCurrentUserInfoResponse'] // TODO: 실제 수정 요청 타입 확인 필요
export type UserInfoResponse =
  components['schemas']['RsDataGetCurrentUserInfoResponse']

// 상품 관련 타입
export type ProductCreateRequest = components['schemas']['ProductCreateRequest']
export type ProductModifyRequest = components['schemas']['ProductModifyRequest']

// Swagger 스펙 기반 타입들
export type ProductCreateFormData =
  components['schemas']['ProductCreateRequest']
export type ProductModifyFormData =
  components['schemas']['ProductModifyRequest']
export type MemberSignUpFormData =
  components['schemas']['MemberSignUpRequestDto']
export type MemberModifyFormData =
  components['schemas']['MemberModifyRequestDto']
export type LoginFormData = components['schemas']['LoginRequestDto']

// 입찰 관련 타입
export type BidRequest = components['schemas']['BidRequestDto']

// 낙찰 결제 관련 타입
export type BidPayResponseDto = {
  bidId: number
  productId: number
  amount: number
  paidAt: string
  cashTransactionId: number | null
  balanceAfter: number | null
}

// 알림 관련 타입
export type NotificationListResponse = {
  content: Notification[]
  totalElements: number
  totalPages: number
  currentPage: number
  pageSize: number
  hasNext: boolean
  unreadCount: number
}

export type Notification = {
  id: number
  title: string
  content: string
  isRead: boolean
  createdAt: string
  type: string
}

export type NotificationUnreadCountResponse = number
export type BidResponse = components['schemas']['RsData']
export type MyBidsParams = {
  page?: number
  size?: number
  status?: 'ACTIVE' | 'WON' | 'LOST'
  sort?: 'LATEST' | 'PRICE_HIGH' | 'PRICE_LOW' | 'ENDING_SOON'
}

// 결제수단 관련 타입 (Swagger 스펙 기반)
export type PaymentMethodCreateRequest =
  components['schemas']['PaymentMethodCreateRequest']
export type PaymentMethodEditRequest =
  components['schemas']['PaymentMethodEditRequest']
export type PaymentMethodListResponse = components['schemas']['RsData']
export type PaymentMethodDetailResponse = components['schemas']['RsData']

// 결제수단 객체 타입 (API 응답에서 사용)
export interface PaymentMethod {
  id: number
  type: string
  methodType: string
  alias?: string
  isDefault: boolean
  brand?: string
  last4?: string
  expMonth?: number
  expYear?: number
  bankCode?: string
  bankName?: string
  createdAt: string
}

// 결제 관련 타입
export type PaymentRequest = components['schemas']['PaymentRequest']
export type PaymentResponse = components['schemas']['RsData']
export type MyPaymentsResponse = components['schemas']['RsData']
export type MyPaymentDetailResponse = components['schemas']['RsData']

// 토스 빌링키 관련 타입
export type TossIssueBillingKeyRequest =
  components['schemas']['TossIssueBillingKeyRequest']
export type TossIssueBillingKeyResponse = components['schemas']['RsData']

// 토스 결제 관련 타입
export type TossBillingAuthParamsResponse = {
  clientKey: string
  customerKey: string
  successUrl: string
  failUrl: string
}

export type TossBillingAuthParams = {
  resultCode: string
  msg: string
  data: TossBillingAuthParamsResponse
}

export type IdempotencyKeyResponse = {
  idempotencyKey: string
}

export type IdempotencyKey = {
  resultCode: string
  msg: string
  data: IdempotencyKeyResponse
}

export type WalletChargeRequest = {
  paymentMethodId: number
  amount: number
  idempotencyKey: string
}

export type WalletChargeResponse = {
  resultCode: string
  msg: string
  data?: any
}

// 결제 내역 관련 타입 (Swagger RsData와 호환)
export type MyPaymentListItemResponse = {
  paymentId: number
  status: string
  amount: number
  provider: string
  methodType: string
  createdAt: string
  cashTransactionId?: number
  balanceAfter?: number
}

export type MyPaymentListResponse = {
  resultCode: string
  msg: string
  data: {
    page: number
    size: number
    total: number
    items: MyPaymentListItemResponse[]
  }
}

export type MyPaymentDetail = {
  resultCode: string
  msg: string
  data: any // Swagger의 RsData 타입과 호환
}

// 지갑 관련 타입 (Swagger 스펙 기반)
export type CashResponse = components['schemas']['RsData']
export type CashTransactionsResponse = components['schemas']['RsData']
export type CashTransactionDetailResponse = components['schemas']['RsData']

// 게시판 관련 타입
export type BoardWriteRequest = components['schemas']['BoardWriteRequest']
export type BoardWriteResponse =
  components['schemas']['RsDataBoardWriteResponse']

// 리뷰 관련 타입
export type ReviewWriteRequest = components['schemas']['ReviewRequest']
export type ReviewUpdateRequest = {
  productId: number
  comment: string
  isSatisfied: boolean
}
export type ReviewWriteResponse = components['schemas']['RsDataReviewResponse']
export type ReviewEditResponse = components['schemas']['RsDataReviewResponse']
export type ReviewResponse = components['schemas']['RsDataReviewResponse']

// 리뷰 API 타입들 (사용되지 않음 - Swagger 타입 사용)

// 상품 목록 조회 파라미터
// 새로운 백엔드는 카테고리를 enum (string)으로 받음
import type { CategoryValue } from '@/lib/constants/categories'

export interface ProductListParams {
  page?: number
  size?: number
  keyword?: string
  category?: CategoryValue[] | number[] // 하위 호환성을 위해 number[]도 허용
  location?: string[]
  isDelivery?: boolean
  status?:
    | 'BEFORE_START'
    | 'BIDDING'
    | 'SUCCESSFUL'
    | 'FAILED'
    | 'SELLING'
    | 'SOLD'
  sort?: 'LATEST' | 'PRICE_HIGH' | 'PRICE_LOW' | 'ENDING_SOON' | 'POPULAR'
}

// 내 상품 조회 파라미터
export interface MyProductsParams {
  page?: number
  size?: number
  status?: 'BEFORE_START' | 'SELLING' | 'SOLD' | 'FAILED'
  sort?: 'LATEST' | 'PRICE_HIGH' | 'PRICE_LOW' | 'ENDING_SOON' | 'POPULAR'
}

// 알림 조회 파라미터 (사용되지 않음)
export interface NotificationParams {
  page?: number
  size?: number
  isRead?: boolean
}

// 결제 내역 조회 파라미터 (사용되지 않음)
export interface PaymentHistoryParams {
  page?: number
  size?: number
}

// 지갑 거래 내역 조회 파라미터 (사용되지 않음)
export interface CashTransactionParams {
  page?: number
  size?: number
}
