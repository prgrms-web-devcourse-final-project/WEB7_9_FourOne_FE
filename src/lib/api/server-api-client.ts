// 서버 컴포넌트용 API 클라이언트 (Next.js cookies() 사용)
import { cookies } from 'next/headers'

// API 응답을 표준화하는 헬퍼 함수 (새로운 백엔드 구조 지원)
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
    }
  }

  // 기존 응답 구조 지원 (하위 호환성): { resultCode, msg, data }
  return {
    data: response.data,
    success:
      response.resultCode === '200' ||
      response.resultCode === '200-1' ||
      response.resultCode === '200-2' ||
      response.resultCode === '201',
    resultCode: response.resultCode || '',
    msg: response.msg || '',
  }
}

// 서버용 API 클라이언트
class ServerApiClient {
  private baseURL = `${process.env.API_BASE_URL || 'https://api.p-14626.khee.store'}/api/v1`

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<{ data: T; success: boolean; resultCode: string; msg: string }> {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('accessToken')?.value

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return normalizeApiResponse(data)
  }

  // 상품 상세 조회 (GET /api/v1/products/{productId}) - Swagger 스펙
  async getProduct(productId: number) {
    return this.makeRequest(`/products/${productId}`)
  }

  // ❌ Swagger에 없음 - API 호출 비활성화 (UI는 유지)
  async getProducts(params?: {
    page?: number
    size?: number
    category?: number
    status?: string
    location?: string
    isDelivery?: boolean
    sort?: string
    search?: string
  }) {
    throw new Error(
      'GET /api/v1/products는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  }

  // 내가 등록한 상품 조회 (GET /api/v1/me/products)
  // Swagger 스펙: 쿼리 파라미터 없음
  async getMyProducts() {
    return this.makeRequest('/me/products')
  }

  // 사용자 정보 API (GET /api/v1/user/me)
  async getMyInfo() {
    return this.makeRequest('/user/me')
  }

  // 북마크 목록 조회 (GET /api/v1/user/me/bookmarks)
  async getBookmarks(params?: { page?: number; size?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.page !== undefined) {
      searchParams.append('page', params.page.toString())
    }
    if (params?.size !== undefined) {
      searchParams.append('size', params.size.toString())
    }

    const queryString = searchParams.toString()
    const endpoint = queryString
      ? `/user/me/bookmarks?${queryString}`
      : `/user/me/bookmarks`

    return this.makeRequest(endpoint)
  }

  // 참여한 경매 목록 조회 (GET /api/v1/me/bids)
  async getMyBids(params?: { page?: number; size?: number; status?: string }) {
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
    const endpoint = queryString ? `/me/bids?${queryString}` : `/me/bids`

    return this.makeRequest(endpoint)
  }

  // ❌ Swagger에 없음 - API 호출 비활성화 (UI는 유지)
  async getBidStatus(productId: number) {
    throw new Error(
      '입찰 현황 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  }

  // ❌ Swagger에 없음 - API 호출 비활성화 (UI는 유지)
  async getNotifications(params?: { page?: number; size?: number }) {
    throw new Error(
      '알림 목록 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  }

  // ❌ Swagger에 없음 - API 호출 비활성화 (UI는 유지)
  async getUnreadCount() {
    throw new Error(
      '읽지 않은 알림 개수 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  }

  // ❌ Swagger에 없음 - API 호출 비활성화 (UI는 유지)
  async getPaymentMethods() {
    throw new Error(
      '결제 수단 목록 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  }

  // ❌ Swagger에 없음 - API 호출 비활성화 (UI는 유지)
  async getPaymentHistory() {
    throw new Error(
      '결제 내역 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  }

  // ❌ Swagger에 없음 - API 호출 비활성화 (UI는 유지)
  async getReviews(params?: {
    page?: number
    size?: number
    productId?: number
  }) {
    throw new Error(
      '리뷰 관련 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  }
}

// 서버용 API 클라이언트 인스턴스
export const serverApiClient = new ServerApiClient()

// 서버용 API 함수들
export const serverApi = {
  // 상품 관련
  getProduct: (productId: number) => serverApiClient.getProduct(productId),
  getProducts: (params?: any) => serverApiClient.getProducts(params),
  getMyProducts: () => serverApiClient.getMyProducts(),

  // 사용자 관련
  getMyInfo: () => serverApiClient.getMyInfo(),
  getBookmarks: (params?: any) => serverApiClient.getBookmarks(params),

  // 입찰 관련
  getMyBids: (params?: any) => serverApiClient.getMyBids(params),
  getBidStatus: (productId: number) => serverApiClient.getBidStatus(productId),

  // 알림 관련
  getNotifications: (params?: any) => serverApiClient.getNotifications(params),
  getUnreadCount: () => serverApiClient.getUnreadCount(),

  // 결제수단 관련
  getPaymentMethods: () => serverApiClient.getPaymentMethods(),
  getPaymentHistory: () => serverApiClient.getPaymentHistory(),

  // 리뷰 관련
  getReviews: (params?: any) => serverApiClient.getReviews(params),
}
