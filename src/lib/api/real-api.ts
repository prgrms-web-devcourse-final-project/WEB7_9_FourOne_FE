// 실제 백엔드 API 연결
import type {
  ApiResponse,
  BidPayResponseDto,
  BidRequest,
  BoardWriteRequest,
  BoardWriteResponse,
  IdempotencyKey,
  LoginResponse,
  MyPaymentDetail,
  MyPaymentListResponse,
  MyProductsParams,
  PaymentMethodCreateRequest,
  PaymentMethodEditRequest,
  ProductCreateRequest,
  ProductListParams,
  ProductModifyRequest,
  ReviewUpdateRequest,
  ReviewWriteRequest,
  SignupRequest,
  TossBillingAuthParams,
  UserInfo,
  UserInfoUpdate,
  WalletChargeRequest,
  WalletChargeResponse,
} from '@/types/api-types'
import { apiClient } from './api-client'

// API 응답을 표준화하는 헬퍼 함수 (새로운 백엔드 구조: { code, status, message, data })
function normalizeApiResponse<T>(response: any) {
  // 새로운 응답 구조 지원: { code, status, message, data }
  if (response.code !== undefined || response.status !== undefined) {
    const code = String(response.code || '')
    const status = response.status || 0
    const success = status === 200 || code === '200' || code.startsWith('200')

    return {
      data: response.data,
      success,
      resultCode: code || String(status),
      msg: response.message || '',
      // 새로운 구조 필드도 포함 (호환성)
      code: code,
      status: status,
      message: response.message || '',
    }
  }

  // 기존 응답 구조 지원 (하위 호환성): { resultCode, msg, data }
  const resultCode = String(response.resultCode || '')
  const success =
    resultCode === '200' ||
    resultCode === '200-1' ||
    resultCode === '200-2' ||
    resultCode === '201' ||
    resultCode.startsWith('200')

  return {
    data: response.data,
    success,
    resultCode: resultCode,
    msg: response.msg || '',
    // 새로운 구조 필드도 포함 (호환성)
    code: resultCode,
    status: success ? 200 : 400,
    message: response.msg || '',
  }
}

// 인증 관련 API (새로운 백엔드 구조)
export const authApi = {
  // 로그인
  login: async (email: string, password: string) => {
    const response = await fetch('/api/proxy/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw {
        response: {
          status: response.status,
          data: errorData,
        },
      }
    }

    const data = await response.json()
    const normalized = normalizeApiResponse(data)

    // 로그인 성공 시 토큰을 쿠키에 저장
    if (normalized.success && normalized.data?.accessToken) {
      // accessToken을 쿠키에 저장
      document.cookie = `accessToken=${normalized.data.accessToken}; path=/; max-age=86400; SameSite=Lax`

      // refreshToken이 있으면 쿠키에 저장
      if (normalized.data.refreshToken) {
        document.cookie = `refreshToken=${normalized.data.refreshToken}; path=/; max-age=604800; SameSite=Lax`
      }
    }

    return normalized
  },

  // 회원가입 (새로운 엔드포인트: /api/v1/auth/local/signup)
  signup: async (userData: SignupRequest) => {
    const response = await fetch('/api/proxy/api/v1/auth/local/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw {
        response: {
          status: response.status,
          data: errorData,
        },
      }
    }

    const data = await response.json()
    return normalizeApiResponse(data)
  },

  // 로그아웃 (Swagger 스펙: requestBody 없음)
  logout: async () => {
    const response = await apiClient.post<ApiResponse<string>>(
      '/api/v1/auth/logout',
      undefined, // Swagger 스펙에 requestBody가 없으므로 undefined
    )
    return normalizeApiResponse(response.data)
  },

  // 로그인 상태 확인 (새로운 엔드포인트: /api/v1/auth/me)
  check: async () => {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/auth/me')
    return normalizeApiResponse(response.data)
  },

  // 내 정보 조회 (새로운 엔드포인트: /api/v1/auth/me)
  getProfile: async () => {
    const response =
      await apiClient.get<ApiResponse<UserInfo>>('/api/v1/auth/me')
    return normalizeApiResponse(response.data)
  },

  // 내 정보 조회 (별칭)
  getMyInfo: async () => {
    const response =
      await apiClient.get<ApiResponse<UserInfo>>('/api/v1/auth/me')
    return normalizeApiResponse(response.data)
  },

  // 내 정보 수정 (TODO: 새로운 백엔드에서 수정 API 확인 필요)
  updateProfile: async (userData: UserInfoUpdate) => {
    // TODO: 새로운 백엔드의 사용자 정보 수정 API 확인 필요
    // 임시로 기존 엔드포인트 사용
    const response = await apiClient.put<ApiResponse<UserInfo>>(
      '/api/v1/auth/me', // TODO: 실제 수정 엔드포인트 확인 필요
      userData,
    )
    return normalizeApiResponse(response.data)
  },

  // 내 정보 수정 (JSON)
  updateMyInfo: async (userData: any) => {
    // TODO: 새로운 백엔드의 사용자 정보 수정 API 확인 필요
    const response = await apiClient.put<ApiResponse<UserInfo>>(
      '/api/v1/auth/me', // TODO: 실제 수정 엔드포인트 확인 필요
      userData,
    )
    return normalizeApiResponse(response.data)
  },

  // 회원 탈퇴 (Swagger 스펙: POST /api/v1/auth/delete)
  // query: user (User 타입), requestBody: UserDeleteRequest { password: string }
  deleteProfile: async (password: string) => {
    // TODO: Swagger에 query 파라미터 user가 있는데, 실제로 어떻게 사용하는지 확인 필요
    // 현재는 requestBody만 전송
    const response = await apiClient.post<ApiResponse<any>>(
      '/api/v1/auth/delete',
      { password }, // Swagger 스펙: UserDeleteRequest { password: string }
    )
    return normalizeApiResponse(response.data)
  },

  // 로그인 상태 확인 (별칭 - /api/v1/auth/me 사용)
  checkLogin: async () => {
    const response =
      await apiClient.get<ApiResponse<UserInfo>>('/api/v1/auth/me')
    return normalizeApiResponse(response.data)
  },

  // 특정 회원 정보 조회 (TODO: 새로운 백엔드에서 확인 필요)
  getMemberInfo: async (memberId: number) => {
    // TODO: 새로운 백엔드의 특정 회원 정보 조회 API 확인 필요
    const response = await apiClient.get<ApiResponse<UserInfo>>(
      `/api/v1/members/${memberId}`, // TODO: 실제 엔드포인트 확인 필요
    )
    return normalizeApiResponse(response.data)
  },

  // 테스트 API (TODO: 새로운 백엔드에서 확인 필요)
  getTestInfo: async () => {
    // TODO: 테스트 API가 여전히 필요한지 확인 필요
    const response = await apiClient.get<ApiResponse<string>>(
      '/api/v1/members/test', // TODO: 실제 엔드포인트 확인 필요
    )
    return normalizeApiResponse(response.data)
  },

  // 토큰 재발급 (Swagger 스펙: /api/v1/auth/refresh, requestBody 없음)
  reissue: async (refreshToken: string) => {
    const response = await apiClient.post<ApiResponse<LoginResponse>>(
      '/api/v1/auth/refresh',
      undefined, // Swagger 스펙에 requestBody가 없으므로 undefined
      {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      },
    )
    return normalizeApiResponse(response.data)
  },

  // 이메일 인증 코드 전송 (새로운 API)
  sendVerificationCode: async (email: string) => {
    const response = await apiClient.post<ApiResponse<any>>(
      '/api/v1/auth/email/send-code',
      { email },
    )
    return normalizeApiResponse(response.data)
  },

  // 이메일 인증 코드 확인 (새로운 API)
  verifyCode: async (email: string, code: string) => {
    const response = await apiClient.post<ApiResponse<any>>(
      '/api/v1/auth/email/verify-code',
      { email, code },
    )
    return normalizeApiResponse(response.data)
  },
}

// 상품 관련 API (새로운 백엔드 구조)
export const productApi = {
  // 상품 목록 조회
  // TODO: 새로운 백엔드에서 GET /api/v1/products 엔드포인트 확인 필요 (현재 Swagger에 없음)
  getProducts: async (params?: ProductListParams) => {
    // TODO: 새로운 백엔드의 상품 목록 조회 API 확인 필요
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/products', {
      params,
    })
    return normalizeApiResponse(response.data)
  },

  // 상품 검색 (Elasticsearch)
  // TODO: 새로운 백엔드에서 Elasticsearch 검색 API 확인 필요
  searchProducts: async (params?: ProductListParams) => {
    // TODO: 새로운 백엔드의 Elasticsearch 검색 API 확인 필요
    const response = await apiClient.get<ApiResponse<any>>(
      '/api/v1/products/es', // TODO: 실제 엔드포인트 확인 필요
      {
        params,
      },
    )
    return normalizeApiResponse(response.data)
  },

  // 상품 상세 조회
  // TODO: 새로운 백엔드에서 GET /api/v1/products/{productId} 엔드포인트 확인 필요 (현재 Swagger에 없음)
  getProduct: async (productId: number) => {
    // TODO: 새로운 백엔드의 상품 상세 조회 API 확인 필요
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/products/${productId}`,
    )
    return normalizeApiResponse(response.data)
  },

  // 상품 등록 (새로운 백엔드: POST /api/v1/products)
  // Swagger 스펙: application/json, ProductCreateRequest { name, description, category, subCategory, imagesFiles: string[] }
  createProduct: async (
    productData: ProductCreateRequest,
    images: File[], // 임시로 유지 (실제 업로드 방식 확인 후 수정)
    productType?: string, // Swagger에 없음, 제거 고려
  ) => {
    // Swagger 스펙에 따르면 JSON만 전송
    // imagesFiles는 이미 업로드된 파일 URL 배열이어야 함
    // TODO: 이미지 업로드 API가 별도로 있다면 먼저 업로드하고 URL을 받아야 함
    const response = await apiClient.post<ApiResponse<any>>(
      '/api/v1/products',
      productData, // Swagger 스펙에 맞게 JSON만 전송
    )

    return normalizeApiResponse(response.data)
  },

  // 상품 수정 (새로운 백엔드: PUT /api/v1/products/{productId})
  // Swagger 스펙: application/json, ProductCreateRequest { name, description, category, subCategory, imagesFiles: string[] }
  // 주의: Swagger에는 ProductModifyRequest가 없고 ProductCreateRequest를 사용함
  updateProduct: async (
    productId: number,
    productData: ProductModifyRequest, // 실제로는 ProductCreateRequest 구조 사용
    images?: File[], // Swagger에 없음, 제거 고려
    deleteImageIds?: number[], // Swagger에 없음, 제거 고려
  ) => {
    // Swagger 스펙에 따르면 JSON만 전송
    // imagesFiles는 이미 업로드된 파일 URL 배열이어야 함
    // TODO: 이미지 업로드 API가 별도로 있다면 먼저 업로드하고 URL을 받아야 함
    const response = await apiClient.put<ApiResponse<any>>(
      `/api/v1/products/${productId}`,
      productData as any, // Swagger 스펙에 맞게 JSON만 전송 (ProductCreateRequest 구조)
    )

    return normalizeApiResponse(response.data)
  },

  // 내 상품 목록 조회
  // TODO: 새로운 백엔드에서 내 상품 목록 조회 API 확인 필요
  getMyProducts: async (params?: MyProductsParams) => {
    // TODO: 새로운 백엔드의 내 상품 목록 조회 API 확인 필요
    const response = await apiClient.get<ApiResponse<any>>(
      '/api/v1/products/me', // TODO: 실제 엔드포인트 확인 필요
      {
        params,
      },
    )
    return normalizeApiResponse(response.data)
  },

  // 특정 회원의 상품 목록 조회
  // TODO: 새로운 백엔드에서 특정 회원의 상품 목록 조회 API 확인 필요
  getProductsByMember: async (memberId: number, params?: ProductListParams) => {
    // TODO: 새로운 백엔드의 특정 회원 상품 목록 조회 API 확인 필요
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/products/members/${memberId}`, // TODO: 실제 엔드포인트 확인 필요
      {
        params,
      },
    )
    return normalizeApiResponse(response.data)
  },

  // 상품 삭제 (새로운 백엔드: DELETE /api/v1/products/{productId})
  deleteProduct: async (productId: number) => {
    const response = await apiClient.delete<ApiResponse<any>>(
      `/api/v1/products/${productId}`,
    )
    return normalizeApiResponse(response.data)
  },

  // QnA 목록 조회 (새로운 API: GET /api/v1/products/{productId}/qna)
  getQna: async (
    productId: number,
    params?: { page?: number; size?: number },
  ) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.size) searchParams.append('size', params.size.toString())

    const queryString = searchParams.toString()
    const endpoint = queryString
      ? `/api/v1/products/${productId}/qna?${queryString}`
      : `/api/v1/products/${productId}/qna`

    const response = await apiClient.get<ApiResponse<any>>(endpoint)
    return normalizeApiResponse(response.data)
  },

  // QnA 등록 (새로운 API: POST /api/v1/products/{productId}/qna)
  addQna: async (productId: number, question: string) => {
    const response = await apiClient.post<ApiResponse<any>>(
      `/api/v1/products/${productId}/qna`,
      { question },
    )
    return normalizeApiResponse(response.data)
  },

  // QnA 답변 등록 (새로운 API: POST /api/v1/products/{productId}/qna/{qnaId})
  addAnswer: async (productId: number, qnaId: number, answer: string) => {
    const response = await apiClient.post<ApiResponse<any>>(
      `/api/v1/products/${productId}/qna/${qnaId}`,
      { answer },
    )
    return normalizeApiResponse(response.data)
  },

  // QnA 답변 삭제 (새로운 API: DELETE /api/v1/products/{productId}/qna/{qnaId})
  deleteAnswer: async (productId: number, qnaId: number) => {
    const response = await apiClient.delete<ApiResponse<any>>(
      `/api/v1/products/${productId}/qna/${qnaId}`,
    )
    return normalizeApiResponse(response.data)
  },

  // 북마크 추가 (Swagger 스펙: POST /api/v1/products/{productId}/bookmarks, requestBody 없음)
  addBookmark: async (productId: number) => {
    const response = await apiClient.post<ApiResponse<any>>(
      `/api/v1/products/${productId}/bookmarks`,
      undefined, // Swagger 스펙에 requestBody가 없으므로 undefined
    )
    return normalizeApiResponse(response.data)
  },

  // 북마크 삭제 (새로운 API: DELETE /api/v1/products/{productId}/bookmarks)
  deleteBookmark: async (productId: number) => {
    const response = await apiClient.delete<ApiResponse<any>>(
      `/api/v1/products/${productId}/bookmarks`,
    )
    return normalizeApiResponse(response.data)
  },
}

// 입찰 관련 API
// TODO: 새로운 백엔드에서 입찰 관련 API 확인 필요 (현재 Swagger에 없음)
export const bidApi = {
  // 입찰하기
  // TODO: 새로운 백엔드의 입찰 생성 API 확인 필요
  createBid: async (productId: number, bidData: BidRequest) => {
    // TODO: 새로운 백엔드의 입찰 생성 엔드포인트 확인 필요
    const response = await apiClient.post<ApiResponse<any>>(
      `/api/v1/bids/products/${productId}`, // TODO: 실제 엔드포인트 확인 필요
      bidData,
    )
    return normalizeApiResponse(response.data)
  },

  // 내 입찰 현황 조회
  // TODO: 새로운 백엔드의 내 입찰 현황 조회 API 확인 필요
  getMyBids: async (params?: {
    page?: number
    size?: number
    status?: string
  }) => {
    // TODO: 새로운 백엔드의 내 입찰 현황 조회 엔드포인트 확인 필요
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.size) searchParams.append('size', params.size.toString())
    if (params?.status) searchParams.append('status', params.status)

    const queryString = searchParams.toString()
    const endpoint = queryString
      ? `/api/v1/bids/me?${queryString}` // TODO: 실제 엔드포인트 확인 필요
      : '/api/v1/bids/me' // TODO: 실제 엔드포인트 확인 필요

    const response = await apiClient.get<ApiResponse<any>>(endpoint)
    return normalizeApiResponse(response.data)
  },

  // 특정 상품의 입찰 현황 조회
  // TODO: 새로운 백엔드의 특정 상품 입찰 현황 조회 API 확인 필요
  getBidStatus: async (productId: number) => {
    // TODO: 새로운 백엔드의 특정 상품 입찰 현황 조회 엔드포인트 확인 필요
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/bids/products/${productId}`, // TODO: 실제 엔드포인트 확인 필요
    )
    return normalizeApiResponse(response.data)
  },

  // 입찰 취소
  // TODO: 새로운 백엔드의 입찰 취소 API 확인 필요
  cancelBid: async (bidId: number) => {
    // TODO: 새로운 백엔드의 입찰 취소 엔드포인트 확인 필요
    const response = await apiClient.delete<ApiResponse<any>>(
      `/api/v1/bids/${bidId}`, // TODO: 실제 엔드포인트 확인 필요
    )
    return normalizeApiResponse(response.data)
  },

  // 낙찰 결제
  // TODO: 새로운 백엔드의 낙찰 결제 API 확인 필요
  payBid: async (bidId: number) => {
    // TODO: 새로운 백엔드의 낙찰 결제 엔드포인트 확인 필요
    const response = await apiClient.post<ApiResponse<BidPayResponseDto>>(
      `/api/v1/bids/${bidId}/pay`, // TODO: 실제 엔드포인트 확인 필요
    )
    return normalizeApiResponse(response.data)
  },
}

// 리뷰 관련 API
// TODO: 새로운 백엔드에서 리뷰 관련 API 확인 필요 (현재 Swagger에 없음)
export const reviewApi = {
  // 리뷰 작성
  // TODO: 새로운 백엔드의 리뷰 작성 API 확인 필요
  createReview: async (data: ReviewWriteRequest) => {
    // TODO: 새로운 백엔드의 리뷰 작성 엔드포인트 확인 필요
    const response = await apiClient.post<ApiResponse<any>>(
      '/api/v1/reviews', // TODO: 실제 엔드포인트 확인 필요
      data,
    )
    return normalizeApiResponse(response.data)
  },

  // 리뷰 조회
  // TODO: 새로운 백엔드의 리뷰 조회 API 확인 필요
  getReview: async (reviewId: number) => {
    // TODO: 새로운 백엔드의 리뷰 조회 엔드포인트 확인 필요
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/reviews/${reviewId}`, // TODO: 실제 엔드포인트 확인 필요
    )
    return normalizeApiResponse(response.data)
  },

  // 리뷰 수정
  // TODO: 새로운 백엔드의 리뷰 수정 API 확인 필요
  updateReview: async (reviewId: number, data: ReviewUpdateRequest) => {
    // TODO: 새로운 백엔드의 리뷰 수정 엔드포인트 확인 필요
    const response = await apiClient.put<ApiResponse<any>>(
      `/api/v1/reviews/${reviewId}`, // TODO: 실제 엔드포인트 확인 필요
      data,
    )
    return normalizeApiResponse(response.data)
  },

  // 리뷰 삭제
  // TODO: 새로운 백엔드의 리뷰 삭제 API 확인 필요
  deleteReview: async (reviewId: number) => {
    // TODO: 새로운 백엔드의 리뷰 삭제 엔드포인트 확인 필요
    const response = await apiClient.delete<ApiResponse<any>>(
      `/api/v1/reviews/${reviewId}`, // TODO: 실제 엔드포인트 확인 필요
    )
    return normalizeApiResponse(response.data)
  },

  // 상품별 리뷰 목록 조회
  // TODO: 새로운 백엔드의 상품별 리뷰 목록 조회 API 확인 필요
  getReviewsByProduct: async (productId: number) => {
    // TODO: 새로운 백엔드의 상품별 리뷰 목록 조회 엔드포인트 확인 필요
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/reviews/products/${productId}`, // TODO: 실제 엔드포인트 확인 필요
    )
    return normalizeApiResponse(response.data)
  },
}

// 알림 관련 API
// TODO: 새로운 백엔드에서 알림 관련 API 확인 필요 (현재 Swagger에 일부만 있음)
export const notificationApi = {
  // 알림 목록 조회
  // TODO: 새로운 백엔드의 알림 목록 조회 API 확인 필요
  getNotifications: async (params?: { page?: number; size?: number }) => {
    // TODO: 새로운 백엔드의 알림 목록 조회 엔드포인트 확인 필요
    const response = await apiClient.get<ApiResponse<any>>('/notifications', {
      params,
    })
    return normalizeApiResponse(response.data)
  },

  // 읽지 않은 알림 개수 조회
  // TODO: 새로운 백엔드의 읽지 않은 알림 개수 조회 API 확인 필요
  getUnreadCount: async () => {
    // TODO: 새로운 백엔드의 읽지 않은 알림 개수 조회 엔드포인트 확인 필요
    const response = await apiClient.get<ApiResponse<any>>(
      '/notifications/unread-count', // TODO: 실제 엔드포인트 확인 필요
    )
    return normalizeApiResponse(response.data)
  },

  // 모든 알림 읽음 처리 (새로운 백엔드: PUT /notifications/read-all)
  markAllAsRead: async () => {
    const response = await apiClient.put<ApiResponse<any>>(
      '/notifications/read-all',
    )
    return normalizeApiResponse(response.data)
  },

  // 특정 알림 읽음 처리 (새로운 백엔드: PUT /notifications/{id}/read)
  markAsRead: async (notificationId: number) => {
    const response = await apiClient.put<ApiResponse<any>>(
      `/notifications/${notificationId}/read`,
    )
    return normalizeApiResponse(response.data)
  },
}

// 결제 수단 관련 API
// TODO: 새로운 백엔드에서 결제 수단 관련 API 확인 필요 (현재 Swagger에 없음)
export const paymentMethodApi = {
  // 결제 수단 등록
  // TODO: 새로운 백엔드의 결제 수단 등록 API 확인 필요
  createPaymentMethod: async (data: PaymentMethodCreateRequest) => {
    // TODO: 새로운 백엔드의 결제 수단 등록 엔드포인트 확인 필요
    const response = await apiClient.post<ApiResponse<any>>(
      '/api/v1/paymentMethods', // TODO: 실제 엔드포인트 확인 필요
      data,
    )
    return normalizeApiResponse(response.data)
  },

  // 결제 수단 목록 조회
  // TODO: 새로운 백엔드의 결제 수단 목록 조회 API 확인 필요
  getPaymentMethods: async () => {
    // TODO: 새로운 백엔드의 결제 수단 목록 조회 엔드포인트 확인 필요
    const response = await apiClient.get<ApiResponse<any>>(
      '/api/v1/paymentMethods', // TODO: 실제 엔드포인트 확인 필요
    )
    return normalizeApiResponse(response.data)
  },

  // 결제 수단 수정
  // TODO: 새로운 백엔드의 결제 수단 수정 API 확인 필요
  updatePaymentMethod: async (
    paymentMethodId: number,
    data: PaymentMethodEditRequest,
  ) => {
    // TODO: 새로운 백엔드의 결제 수단 수정 엔드포인트 확인 필요
    const response = await apiClient.put<ApiResponse<any>>(
      `/api/v1/paymentMethods/${paymentMethodId}`, // TODO: 실제 엔드포인트 확인 필요
      data,
    )
    return normalizeApiResponse(response.data)
  },

  // 결제 수단 삭제
  // TODO: 새로운 백엔드의 결제 수단 삭제 API 확인 필요
  deletePaymentMethod: async (paymentMethodId: number) => {
    // TODO: 새로운 백엔드의 결제 수단 삭제 엔드포인트 확인 필요
    const response = await apiClient.delete<ApiResponse<any>>(
      `/api/v1/paymentMethods/${paymentMethodId}`, // TODO: 실제 엔드포인트 확인 필요
    )
    return normalizeApiResponse(response.data)
  },
}

// 캐시/지갑 관련 API
// TODO: 새로운 백엔드에서 지갑 관련 API 확인 필요 (현재 Swagger에 없음)
export const cashApi = {
  // 지갑 잔액 조회
  // TODO: 새로운 백엔드의 지갑 잔액 조회 API 확인 필요
  getMyCash: async () => {
    // TODO: 새로운 백엔드의 지갑 잔액 조회 엔드포인트 확인 필요
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/cash') // TODO: 실제 엔드포인트 확인 필요
    return normalizeApiResponse(response.data)
  },

  // 거래 내역 조회
  // TODO: 새로운 백엔드의 거래 내역 조회 API 확인 필요
  getCashTransactions: async (params?: { page?: number; size?: number }) => {
    // TODO: 새로운 백엔드의 거래 내역 조회 엔드포인트 확인 필요
    const response = await apiClient.get<ApiResponse<any>>(
      '/api/v1/cash/transactions', // TODO: 실제 엔드포인트 확인 필요
      {
        params,
      },
    )
    return normalizeApiResponse(response.data)
  },

  // 거래 상세 조회
  // TODO: 새로운 백엔드의 거래 상세 조회 API 확인 필요
  getTransactionDetail: async (transactionId: number) => {
    // TODO: 새로운 백엔드의 거래 상세 조회 엔드포인트 확인 필요
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/cash/transactions/${transactionId}`, // TODO: 실제 엔드포인트 확인 필요
    )
    return normalizeApiResponse(response.data)
  },
}

// 토스 결제 관련 API
// TODO: 새로운 백엔드에서 토스 결제 관련 API 확인 필요 (현재 Swagger에 없음)
export const tossApi = {
  // 토스 빌링 인증 파라미터 조회
  // TODO: 새로운 백엔드의 토스 빌링 인증 파라미터 조회 API 확인 필요
  getBillingAuthParams: async () => {
    // TODO: 새로운 백엔드의 토스 빌링 인증 파라미터 조회 엔드포인트 확인 필요
    const response = await apiClient.get<TossBillingAuthParams>(
      '/api/v1/payments/toss/billing-auth-params', // TODO: 실제 엔드포인트 확인 필요
    )
    return normalizeApiResponse(response.data)
  },

  // 토스 빌링키 발급
  // TODO: 새로운 백엔드의 토스 빌링키 발급 API 확인 필요
  issueBillingKey: async (authKey: string) => {
    // TODO: 새로운 백엔드의 토스 빌링키 발급 엔드포인트 확인 필요
    const response = await apiClient.post<ApiResponse<any>>(
      '/api/v1/payments/toss/issue-billing-key', // TODO: 실제 엔드포인트 확인 필요
      { authKey },
    )
    return normalizeApiResponse(response.data)
  },

  // 멱등키 발급
  // TODO: 새로운 백엔드의 멱등키 발급 API 확인 필요
  getIdempotencyKey: async () => {
    // TODO: 새로운 백엔드의 멱등키 발급 엔드포인트 확인 필요
    const response = await apiClient.get<IdempotencyKey>(
      '/api/v1/payments/idempotency-key', // TODO: 실제 엔드포인트 확인 필요
    )
    return normalizeApiResponse(response.data)
  },

  // 지갑 충전 (토스 결제)
  // TODO: 새로운 백엔드의 지갑 충전 API 확인 필요
  chargeWallet: async (data: WalletChargeRequest) => {
    // TODO: 새로운 백엔드의 지갑 충전 엔드포인트 확인 필요
    const response = await apiClient.post<WalletChargeResponse>(
      '/api/v1/payments', // TODO: 실제 엔드포인트 확인 필요
      data,
    )
    return normalizeApiResponse(response.data)
  },
}

// 결제 내역 API
// TODO: 새로운 백엔드에서 결제 내역 관련 API 확인 필요 (현재 Swagger에 없음)
export const paymentApi = {
  // 내 결제 내역 목록 조회
  // TODO: 새로운 백엔드의 결제 내역 목록 조회 API 확인 필요
  getMyPayments: async (params?: { page?: number; size?: number }) => {
    // TODO: 새로운 백엔드의 결제 내역 목록 조회 엔드포인트 확인 필요
    const response = await apiClient.get<MyPaymentListResponse>(
      '/api/v1/payments/me', // TODO: 실제 엔드포인트 확인 필요
      {
        params,
      },
    )
    return normalizeApiResponse(response.data)
  },

  // 결제 상세 정보 조회
  // TODO: 새로운 백엔드의 결제 상세 정보 조회 API 확인 필요
  getPaymentDetail: async (paymentId: number) => {
    // TODO: 새로운 백엔드의 결제 상세 정보 조회 엔드포인트 확인 필요
    const response = await apiClient.get<MyPaymentDetail>(
      `/api/v1/payments/me/${paymentId}`, // TODO: 실제 엔드포인트 확인 필요
    )
    return normalizeApiResponse(response.data)
  },
}

// 게시판 관련 API
// TODO: 새로운 백엔드에서 게시판 관련 API 확인 필요 (현재 Swagger에 없음)
export const boardApi = {
  // 게시글 작성
  // TODO: 새로운 백엔드의 게시글 작성 API 확인 필요
  createPost: async (data: BoardWriteRequest) => {
    // TODO: 새로운 백엔드의 게시글 작성 엔드포인트 확인 필요
    const response = await apiClient.post<ApiResponse<BoardWriteResponse>>(
      '/api/v1/boards', // TODO: 실제 엔드포인트 확인 필요
      data,
    )
    return normalizeApiResponse(response.data)
  },

  // ❌ 제거된 API들 (백엔드에 구현되지 않음)
  // getPosts: async (params?: { page?: number; size?: number; category?: string }) => { ... }
  // getPost: async (postId: number) => { ... }
  // updatePost: async (postId: number, data: BoardWriteRequest) => { ... }
  // deletePost: async (postId: number) => { ... }
}
