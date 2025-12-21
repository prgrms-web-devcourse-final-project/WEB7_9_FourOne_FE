// 실제 백엔드 API 연결
import type {
  ApiResponse,
  BoardWriteRequest,
  MyProductsParams,
  PaymentMethodCreateRequest,
  PaymentMethodEditRequest,
  ProductCreateRequest,
  ProductListParams,
  ProductModifyRequest,
  ReviewUpdateRequest,
  ReviewWriteRequest,
  SignupRequest,
  UserInfo,
  UserInfoUpdate,
  WalletChargeRequest,
} from '@/types/api-types'
import { apiClient } from './api-client'

// API 응답을 표준화하는 헬퍼 함수 (새로운 백엔드 구조: { code, status, message, data })
function normalizeApiResponse<T>(response: any) {
  // 새로운 응답 구조 지원: { code, status/httpStatus, message, data }
  if (
    response.code !== undefined ||
    response.status !== undefined ||
    response.httpStatus !== undefined
  ) {
    const code = String(response.code || '')
    const status = response.status || response.httpStatus || 0
    // HTTP 상태 코드가 2xx 범위이고, code가 SUCCESS이거나 에러 코드가 아닌 경우 성공으로 처리
    const isHttpSuccess = status >= 200 && status < 300
    const isCodeSuccess =
      code === 'SUCCESS' ||
      (!code.includes('FAILED') && !code.includes('ERROR'))
    const success = isHttpSuccess && isCodeSuccess

    return {
      data: response.data,
      success,
      resultCode: code || String(status),
      msg: response.message || '',
      // 새로운 구조 필드도 포함 (호환성)
      code: code,
      status: status,
      httpStatus: response.httpStatus || status,
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
    // Swagger 스펙: LocalLoginResponse에는 accessToken만 있고 refreshToken은 없음
    const loginData = normalized.data as any
    const accessToken = loginData?.accessToken

    // JWT 토큰 디코딩하여 만료 시간 확인
    let tokenExpired = false
    if (accessToken) {
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]))
        const now = Math.floor(Date.now() / 1000)
        const exp = payload.exp
        tokenExpired = exp && exp <= now
      } catch (e) {
        // 토큰 디코딩 실패 시 만료된 것으로 간주
        tokenExpired = true
      }
    }

    if (
      normalized.success &&
      accessToken &&
      accessToken !== 'temp-token' &&
      !tokenExpired
    ) {
      // 기존 쿠키 제거 후 새로 설정
      document.cookie =
        'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie =
        'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'

      // accessToken을 쿠키에 저장
      document.cookie = `accessToken=${accessToken}; path=/; max-age=86400; SameSite=Lax`

      // Swagger 스펙: LocalLoginResponse에는 refreshToken이 없음
      // 백엔드가 쿠키에 refreshToken을 자동으로 설정했는지 확인
      // 단, accessToken과 같은 값이면 무시 (잘못된 값)
      const allCookies = document.cookie.split(';')
      const refreshTokenFromCookie = allCookies
        .find((cookie) => cookie.trim().startsWith('refreshToken='))
        ?.split('=')[1]
        ?.trim()

      if (refreshTokenFromCookie && refreshTokenFromCookie !== accessToken) {
        localStorage.setItem('refreshToken', refreshTokenFromCookie)
      }

      // localStorage에도 저장
      localStorage.setItem('accessToken', accessToken)
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

  // 내 정보 조회 (별칭 - check와 동일)
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
  // TokenRefreshResponse: { accessToken, expiresIn } - refreshToken은 응답에 없음
  // refreshToken은 HttpOnly 쿠키로 자동 전송되므로 파라미터 불필요
  reissue: async () => {
    const response = await apiClient.post<ApiResponse<any>>(
      '/api/v1/auth/refresh',
      undefined,
      // refreshToken은 쿠키에서 자동으로 전송되므로 헤더 불필요
    )
    const normalized = normalizeApiResponse(response.data)

    // TokenRefreshResponse에는 accessToken만 있음
    if (normalized.success && normalized.data?.accessToken) {
      const newAccessToken = normalized.data.accessToken

      // 새 토큰 저장
      if (typeof document !== 'undefined') {
        document.cookie = `accessToken=${newAccessToken}; path=/; max-age=86400; SameSite=Lax`
        localStorage.setItem('accessToken', newAccessToken)
        // refreshToken은 재발급 응답에 없으므로 기존 refreshToken 유지
      }
    }

    return normalized
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
  // ❌ Swagger에 없음 - API 호출 비활성화 (UI는 유지)
  getProducts: async (params?: ProductListParams) => {
    throw new Error(
      'GET /api/v1/products는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
    // const response = await apiClient.get<ApiResponse<any>>('/api/v1/products', {
    //   params,
    // })
    // return normalizeApiResponse(response.data)
  },

  // ❌ Swagger에 없음 - API 호출 비활성화 (UI는 유지)
  searchProducts: async (params?: ProductListParams) => {
    throw new Error(
      'GET /api/v1/products/es는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
    // const response = await apiClient.get<ApiResponse<any>>(
    //   '/api/v1/products/es',
    //   {
    //     params,
    //   },
    // )
    // return normalizeApiResponse(response.data)
  },

  // ❌ Swagger에 없음 - API 호출 비활성화 (UI는 유지)
  getProduct: async (productId: number) => {
    throw new Error(
      'GET /api/v1/products/{productId}는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
    // const response = await apiClient.get<ApiResponse<any>>(
    //   `/api/v1/products/${productId}`,
    // )
    // return normalizeApiResponse(response.data)
  },

  // 상품 등록 (새로운 백엔드: POST /api/v1/products)
  // JSON 형식: { name, description, category, subCategory, imagesFiles: string[] }
  // imagesFiles는 이미 업로드된 이미지 URL 배열이어야 함
  // TODO: 이미지 업로드 API가 별도로 있다면 먼저 업로드하고 URL을 받아야 함
  createProduct: async (
    productData: ProductCreateRequest,
    images: File[], // File 객체 배열 (현재는 사용하지 않음, 추후 이미지 업로드 API 연동 필요)
  ) => {
    // JSON 형식으로 전송
    // imagesFiles는 String 배열 (이미지 URL 배열)
    const requestData = {
      name: productData.name,
      description: productData.description,
      category: productData.category,
      subCategory: productData.subCategory,
      imagesFiles: productData.imagesFiles || [], // 이미지 URL 배열
    }

    const response = await apiClient.post<ApiResponse<any>>(
      '/api/v1/products',
      requestData, // JSON으로 전송
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

  // 내가 등록한 상품 조회 (GET /api/v1/users/me/products)
  // TODO: 아직 백엔드 개발 안됨 - API가 준비되면 활성화
  getMyProducts: async (params?: MyProductsParams) => {
    const searchParams = new URLSearchParams()
    if (params?.page !== undefined) {
      searchParams.append('page', params.page.toString())
    }
    if (params?.size !== undefined) {
      searchParams.append('size', params.size.toString())
    }
    if (params?.status) {
      searchParams.append('status', params.status)
    }
    if (params?.sort) {
      searchParams.append('sort', params.sort)
    }

    const queryString = searchParams.toString()
    const endpoint = queryString
      ? `/api/v1/users/me/products?${queryString}`
      : `/api/v1/users/me/products`

    const response = await apiClient.get<ApiResponse<any>>(endpoint)
    return normalizeApiResponse(response.data)
  },

  // ❌ Swagger에 없음 - API 호출 비활성화 (UI는 유지)
  getProductsByMember: async (memberId: number, params?: ProductListParams) => {
    throw new Error(
      'GET /api/v1/products/members/{memberId}는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
    // const response = await apiClient.get<ApiResponse<any>>(
    //   `/api/v1/products/members/${memberId}`,
    //   {
    //     params,
    //   },
    // )
    // return normalizeApiResponse(response.data)
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

  // 찜 목록 조회 (GET /api/v1/users/me/bookmarks)
  // TODO: 아직 백엔드 개발 안됨 - API가 준비되면 활성화
  getBookmarks: async (params?: { page?: number; size?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.page !== undefined) {
      searchParams.append('page', params.page.toString())
    }
    if (params?.size !== undefined) {
      searchParams.append('size', params.size.toString())
    }

    const queryString = searchParams.toString()
    const endpoint = queryString
      ? `/api/v1/users/me/bookmarks?${queryString}`
      : `/api/v1/users/me/bookmarks`

    const response = await apiClient.get<ApiResponse<any>>(endpoint)
    return normalizeApiResponse(response.data)
  },
}

// 경매 관련 API
export const auctionApi = {
  // 경매 목록 조회 (홈 화면 - 커서 기반 무한 스크롤)
  // GET /api/v1/auctions?sort={newest|closing|popular}&cursor={cursor}
  // 또는
  // GET /api/v1/auctions?category={category}&subCategory={subCategory}&status={status}&cursor={cursor}
  // TODO: 곧 배포 예정 - API가 준비되면 활성화
  getAuctions: async (params?: {
    // 정렬 관련
    sort?: 'newest' | 'closing' | 'popular' // 기본값: newest
    // 카테고리 필터
    category?: 'ALL' | 'STARGOODS' | 'FIGURE' | 'CDLP' | 'GAME'
    subCategory?:
      | 'ALL'
      | 'ACC'
      | 'STATIONARY'
      | 'DAILY'
      | 'ELECTRONICS'
      | 'GAME'
      | 'ETC'
    status?: 'ALL' | 'SCHEDULED' | 'LIVE' | 'ENDED'
    // 페이징
    cursor?: string
    limit?: number // 선택적, 기본값은 백엔드에서 결정
  }) => {
    const searchParams = new URLSearchParams()

    // 정렬 파라미터
    if (params?.sort) {
      searchParams.append('sort', params.sort)
    }

    // 카테고리 필터 파라미터
    if (params?.category && params.category !== 'ALL') {
      searchParams.append('category', params.category)
    }
    if (params?.subCategory && params.subCategory !== 'ALL') {
      searchParams.append('subCategory', params.subCategory)
    }
    if (params?.status && params.status !== 'ALL') {
      searchParams.append('status', params.status)
    }

    // 페이징 파라미터
    if (params?.cursor) {
      searchParams.append('cursor', params.cursor)
    }
    if (params?.limit !== undefined) {
      searchParams.append('limit', params.limit.toString())
    }

    const queryString = searchParams.toString()
    const endpoint = queryString
      ? `/api/v1/auctions?${queryString}`
      : `/api/v1/auctions`

    const response = await apiClient.get<ApiResponse<any>>(endpoint)
    return normalizeApiResponse(response.data)
  },

  // 경매 목록 조회 (키워드 검색)
  // GET /api/v1/auctions?search={keyword}&cursor={cursor}
  // TODO: 곧 배포 예정 - API가 준비되면 활성화
  // 검색어 최소 2자 ~ 20자, 공백 기준 검색: and
  searchAuctions: async (params?: {
    search: string // 검색어 (2~20자)
    cursor?: string
    limit?: number // 선택적, 기본값은 백엔드에서 결정
  }) => {
    const searchParams = new URLSearchParams()

    // 검색어는 필수 (클라이언트에서 2~20자 검증 권장)
    if (params?.search) {
      searchParams.append('search', params.search)
    }

    // 페이징 파라미터
    if (params?.cursor) {
      searchParams.append('cursor', params.cursor)
    }
    if (params?.limit !== undefined) {
      searchParams.append('limit', params.limit.toString())
    }

    const queryString = searchParams.toString()
    const endpoint = queryString
      ? `/api/v1/auctions?${queryString}`
      : `/api/v1/auctions`

    const response = await apiClient.get<ApiResponse<any>>(endpoint)
    return normalizeApiResponse(response.data)
  },

  // 경매 등록 (Swagger 스펙: POST /api/v1/auctions)
  // AuctionCreateRequest: { product_id, startPrice, buyNowPrice, midBidStep, startAt, endAt }
  createAuction: async (auctionData: {
    product_id: number
    startPrice: number
    buyNowPrice: number
    midBidStep: number // Swagger에서는 midBidStep이지만 사용자가 minBidStep으로 언급
    startAt: string // ISO 8601 형식
    endAt: string // ISO 8601 형식
  }) => {
    const response = await apiClient.post<ApiResponse<any>>(
      '/api/v1/auctions',
      {
        product_id: auctionData.product_id,
        startPrice: auctionData.startPrice,
        buyNowPrice: auctionData.buyNowPrice,
        midBidStep: auctionData.midBidStep,
        startAt: auctionData.startAt,
        endAt: auctionData.endAt,
      },
    )
    return normalizeApiResponse(response.data)
  },

  // 경매 입찰 내역 조회 (GET /api/v1/auctions/{auctionId}/bids)
  // TODO: 아직 백엔드 개발 안됨 - API가 준비되면 활성화
  getAuctionBids: async (
    auctionId: number,
    params?: { page?: number; size?: number },
  ) => {
    const searchParams = new URLSearchParams()
    if (params?.page !== undefined) {
      searchParams.append('page', params.page.toString())
    }
    if (params?.size !== undefined) {
      searchParams.append('size', params.size.toString())
    }

    const queryString = searchParams.toString()
    const endpoint = queryString
      ? `/api/v1/auctions/${auctionId}/bids?${queryString}`
      : `/api/v1/auctions/${auctionId}/bids`

    const response = await apiClient.get<ApiResponse<any>>(endpoint)
    return normalizeApiResponse(response.data)
  },

  // 실시간 최고가 조회 (GET /api/v1/auctions/{auctionId}/highest-bid)
  // TODO: 아직 백엔드 개발 안됨 - API가 준비되면 활성화
  getHighestBid: async (
    auctionId: number,
    params?: { page?: number; size?: number },
  ) => {
    const searchParams = new URLSearchParams()
    if (params?.page !== undefined) {
      searchParams.append('page', params.page.toString())
    }
    if (params?.size !== undefined) {
      searchParams.append('size', params.size.toString())
    }

    const queryString = searchParams.toString()
    const endpoint = queryString
      ? `/api/v1/auctions/${auctionId}/highest-bid?${queryString}`
      : `/api/v1/auctions/${auctionId}/highest-bid`

    const response = await apiClient.get<ApiResponse<any>>(endpoint)
    return normalizeApiResponse(response.data)
  },

  // 즉시 구매 (POST /api/v1/auctions/{auctionId}/buy-now)
  // TODO: 곧 배포 예정 - API가 준비되면 활성화
  buyNow: async (
    auctionId: number,
    buyNowData: { amount: number; methodId: number },
  ) => {
    const response = await apiClient.post<ApiResponse<any>>(
      `/api/v1/auctions/${auctionId}/buy-now`,
      {
        amount: buyNowData.amount,
        methodId: buyNowData.methodId,
      },
    )
    return normalizeApiResponse(response.data)
  },
}

// 입찰 관련 API
export const bidApi = {
  // 경매 입찰 (POST /api/v1/auctions/{auctionId}/bids)
  // TODO: 곧 배포 예정 - API가 준비되면 활성화
  createBid: async (auctionId: number, bidData: { bidAmount: number }) => {
    const response = await apiClient.post<ApiResponse<any>>(
      `/api/v1/auctions/${auctionId}/bids`,
      {
        bidAmount: bidData.bidAmount,
      },
    )
    return normalizeApiResponse(response.data)
  },

  // 참여한 경매 목록 조회 (GET /api/v1/users/me/bids)
  // TODO: 아직 백엔드 개발 안됨 - API가 준비되면 활성화
  getMyBids: async (params?: {
    page?: number
    size?: number
    status?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.page !== undefined) {
      searchParams.append('page', params.page.toString())
    }
    if (params?.size !== undefined) {
      searchParams.append('size', params.size.toString())
    }
    if (params?.status) {
      searchParams.append('status', params.status)
    }

    const queryString = searchParams.toString()
    const endpoint = queryString
      ? `/api/v1/users/me/bids?${queryString}`
      : `/api/v1/users/me/bids`

    const response = await apiClient.get<ApiResponse<any>>(endpoint)
    return normalizeApiResponse(response.data)
  },

  // ❌ Swagger에 없음
  getBidStatus: async (productId: number) => {
    throw new Error(
      '입찰 현황 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  },

  // ❌ Swagger에 없음
  cancelBid: async (bidId: number) => {
    throw new Error(
      '입찰 취소 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  },

  // ❌ Swagger에 없음
  payBid: async (bidId: number) => {
    throw new Error(
      '낙찰 결제 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  },
}

// ❌ 리뷰 관련 API - Swagger에 없음 (UI는 유지)
export const reviewApi = {
  // ❌ Swagger에 없음
  createReview: async (data: ReviewWriteRequest) => {
    throw new Error(
      '리뷰 작성 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  },

  // ❌ Swagger에 없음
  getReview: async (reviewId: number) => {
    throw new Error(
      '리뷰 조회 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  },

  // ❌ Swagger에 없음
  updateReview: async (reviewId: number, data: ReviewUpdateRequest) => {
    throw new Error(
      '리뷰 수정 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  },

  // ❌ Swagger에 없음
  deleteReview: async (reviewId: number) => {
    throw new Error(
      '리뷰 삭제 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  },

  // ❌ Swagger에 없음
  getReviewsByProduct: async (productId: number) => {
    throw new Error(
      '상품별 리뷰 목록 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  },
}

// ❌ 알림 관련 API - Swagger에 없음 (UI는 유지)
export const notificationApi = {
  // ❌ Swagger에 없음
  getNotifications: async (params?: { page?: number; size?: number }) => {
    throw new Error(
      '알림 목록 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  },

  // ❌ Swagger에 없음
  getUnreadCount: async () => {
    throw new Error(
      '읽지 않은 알림 개수 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  },

  // ❌ Swagger에 없음
  markAllAsRead: async () => {
    throw new Error(
      '모든 알림 읽음 처리 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  },

  // ❌ Swagger에 없음
  markAsRead: async (notificationId: number) => {
    throw new Error(
      '알림 읽음 처리 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  },
}

// ❌ 결제 수단 관련 API - Swagger에 없음 (UI는 유지)
export const paymentMethodApi = {
  // ❌ Swagger에 없음
  createPaymentMethod: async (data: PaymentMethodCreateRequest) => {
    // TODO: 결제 수단 등록 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.
    return {
      success: false,
      data: null,
      resultCode: 'NOT_IMPLEMENTED',
      msg: '결제 수단 등록 API는 아직 구현되지 않았습니다.',
      code: 'NOT_IMPLEMENTED',
      status: 501,
      httpStatus: 501,
      message: '결제 수단 등록 API는 아직 구현되지 않았습니다.',
    }
  },

  // ❌ Swagger에 없음
  getPaymentMethods: async () => {
    // TODO: 결제 수단 목록 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.
    return {
      success: true,
      data: [],
      resultCode: 'SUCCESS',
      msg: '',
      code: 'SUCCESS',
      status: 200,
      httpStatus: 200,
      message: '',
    }
  },

  // ❌ Swagger에 없음
  updatePaymentMethod: async (
    paymentMethodId: number,
    data: PaymentMethodEditRequest,
  ) => {
    // TODO: 결제 수단 수정 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.
    return {
      success: false,
      data: null,
      resultCode: 'NOT_IMPLEMENTED',
      msg: '결제 수단 수정 API는 아직 구현되지 않았습니다.',
      code: 'NOT_IMPLEMENTED',
      status: 501,
      httpStatus: 501,
      message: '결제 수단 수정 API는 아직 구현되지 않았습니다.',
    }
  },

  // ❌ Swagger에 없음
  deletePaymentMethod: async (paymentMethodId: number) => {
    // TODO: 결제 수단 삭제 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.
    return {
      success: false,
      data: null,
      resultCode: 'NOT_IMPLEMENTED',
      msg: '결제 수단 삭제 API는 아직 구현되지 않았습니다.',
      code: 'NOT_IMPLEMENTED',
      status: 501,
      httpStatus: 501,
      message: '결제 수단 삭제 API는 아직 구현되지 않았습니다.',
    }
  },
}

// ❌ 캐시/지갑 관련 API - Swagger에 없음 (UI는 유지)
export const cashApi = {
  // ❌ Swagger에 없음
  getMyCash: async () => {
    // TODO: 지갑 잔액 조회 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.
    return {
      success: false,
      data: null,
      resultCode: 'NOT_IMPLEMENTED',
      msg: '지갑 잔액 조회 API는 아직 구현되지 않았습니다.',
      code: 'NOT_IMPLEMENTED',
      status: 501,
      httpStatus: 501,
      message: '지갑 잔액 조회 API는 아직 구현되지 않았습니다.',
    }
  },

  // ❌ Swagger에 없음
  getCashTransactions: async (params?: { page?: number; size?: number }) => {
    // TODO: 거래 내역 조회 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.
    return {
      success: true,
      data: { items: [] },
      resultCode: 'SUCCESS',
      msg: '',
      code: 'SUCCESS',
      status: 200,
      httpStatus: 200,
      message: '',
    }
  },

  // ❌ Swagger에 없음
  getTransactionDetail: async (transactionId: number) => {
    // TODO: 거래 상세 조회 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.
    return {
      success: false,
      data: null,
      resultCode: 'NOT_IMPLEMENTED',
      msg: '거래 상세 조회 API는 아직 구현되지 않았습니다.',
      code: 'NOT_IMPLEMENTED',
      status: 501,
      httpStatus: 501,
      message: '거래 상세 조회 API는 아직 구현되지 않았습니다.',
    }
  },
}

// ❌ 토스 결제 관련 API - Swagger에 없음 (UI는 유지)
export const tossApi = {
  // ❌ Swagger에 없음
  getBillingAuthParams: async () => {
    // TODO: 토스 빌링 인증 파라미터 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.
    return {
      success: false,
      data: null,
      resultCode: 'NOT_IMPLEMENTED',
      msg: '토스 빌링 인증 파라미터 API는 아직 구현되지 않았습니다.',
      code: 'NOT_IMPLEMENTED',
      status: 501,
      httpStatus: 501,
      message: '토스 빌링 인증 파라미터 API는 아직 구현되지 않았습니다.',
    }
  },

  // ❌ Swagger에 없음
  issueBillingKey: async (authKey: string) => {
    throw new Error(
      '토스 빌링키 발급 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  },

  // ❌ Swagger에 없음
  getIdempotencyKey: async () => {
    throw new Error(
      '멱등키 발급 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  },

  // ❌ Swagger에 없음
  chargeWallet: async (data: WalletChargeRequest) => {
    throw new Error(
      '지갑 충전 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  },
}

// ❌ 결제 내역 API - Swagger에 없음 (UI는 유지)
export const paymentApi = {
  // ❌ Swagger에 없음
  getMyPayments: async (params?: { page?: number; size?: number }) => {
    // TODO: 결제 내역 목록 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.
    return {
      success: true,
      data: { items: [] },
      resultCode: 'SUCCESS',
      msg: '',
      code: 'SUCCESS',
      status: 200,
      httpStatus: 200,
      message: '',
    }
  },

  // ❌ Swagger에 없음
  getPaymentDetail: async (paymentId: number) => {
    // TODO: 결제 상세 정보 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.
    return {
      success: false,
      data: null,
      resultCode: 'NOT_IMPLEMENTED',
      msg: '결제 상세 정보 API는 아직 구현되지 않았습니다.',
      code: 'NOT_IMPLEMENTED',
      status: 501,
      httpStatus: 501,
      message: '결제 상세 정보 API는 아직 구현되지 않았습니다.',
    }
  },
}

// ❌ 게시판 관련 API - Swagger에 없음 (UI는 유지)
// 관리자 관련 API
export const adminApi = {
  // 관리자 도움말 조회 (GET /api/v1/admin/help)
  getHelp: async () => {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/admin/help')
    return normalizeApiResponse(response.data)
  },
}

export const boardApi = {
  // ❌ Swagger에 없음
  createPost: async (data: BoardWriteRequest) => {
    throw new Error('게시글 작성 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.')
  },
}
