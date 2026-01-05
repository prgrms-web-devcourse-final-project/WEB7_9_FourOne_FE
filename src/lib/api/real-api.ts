// 실제 백엔드 API 연결
import type {
  ApiResponse,
  BoardWriteRequest,
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

// 인증 관련 API
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

  // 로그인 상태 확인 (새로운 엔드포인트: /api/v1/auth/me 또는 /api/v1/user/me)
  check: async () => {
    // Swagger에 /api/v1/user/me도 있으므로 우선 /api/v1/auth/me 사용
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/auth/me')
    return normalizeApiResponse(response.data)
  },

  // 내 정보 조회 (별칭 - check와 동일)
  getMyInfo: async () => {
    const response =
      await apiClient.get<ApiResponse<UserInfo>>('/api/v1/auth/me')
    return normalizeApiResponse(response.data)
  },

  // 내 정보 조회 (GET /api/v1/user/me)
  getMyInfoV2: async () => {
    const response =
      await apiClient.get<ApiResponse<UserInfo>>('/api/v1/user/me')
    return normalizeApiResponse(response.data)
  },

  // 내 정보 수정 (Swagger 스펙: PATCH /api/v1/user/me/profile)
  updateProfile: async (userData: UserInfoUpdate) => {
    const response = await apiClient.patch<ApiResponse<UserInfo>>(
      '/api/v1/user/me/profile',
      userData,
    )
    return normalizeApiResponse(response.data)
  },

  // 내 정보 수정 (JSON) - 별칭
  updateMyInfo: async (userData: any) => {
    return authApi.updateProfile(userData)
  },

  // 프로필 이미지 업로드 (POST /api/v1/user/me/profile/img) - PreSigned URL 방식
  // 1. PreSigned URL 요청 → 2. S3에 이미지 업로드 → 3. 최종 이미지 URL 반환
  uploadProfileImage: async (imageFile: File) => {
    // 1. PreSigned URL 요청
    const preSignedUrlRequest = [
      {
        contentType: imageFile.type || 'image/jpeg',
        contentLength: imageFile.size,
      },
    ]

    // Swagger 스펙에 맞게 requests 객체로 감싸서 전송
    const axiosResponse = await apiClient.post<ApiResponse<string[]>>(
      '/api/v1/user/me/profile/img',
      { requests: preSignedUrlRequest },
    )
    const preSignedResponse = normalizeApiResponse(axiosResponse.data)

    if (!preSignedResponse.success || !preSignedResponse.data?.[0]) {
      throw new Error(
        preSignedResponse.msg ||
          preSignedResponse.message ||
          'PreSigned URL 요청 실패',
      )
    }

    const preSignedUrl = preSignedResponse.data[0]

    // 2. PreSigned URL에서 S3 object key 추출
    // URL 형식: https://{bucket}.s3.{region}.amazonaws.com/{key}?X-Amz-...
    const urlObj = new URL(preSignedUrl)
    const objectKey = urlObj.pathname.startsWith('/')
      ? urlObj.pathname.slice(1)
      : urlObj.pathname
    const fileName = objectKey.split('/').pop() || ''

    if (!objectKey || !fileName) {
      throw new Error('PreSigned URL에서 object key를 추출할 수 없습니다.')
    }

    // 3. PreSigned URL로 S3에 이미지 업로드
    const s3Response = await fetch(preSignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': imageFile.type || 'image/jpeg', // PreSigned URL 요청 시 전달한 contentType과 일치
        'Content-Length': imageFile.size.toString(), // PreSigned URL 요청 시 전달한 contentLength와 일치
        'x-amz-tagging': 'status=pending', // 필수 헤더
      },
      body: imageFile,
    })

    if (!s3Response.ok) {
      throw new Error('S3 이미지 업로드 실패')
    }

    // S3 PUT 응답 본문을 읽을 필요 없음 (성공 여부는 상태 코드로만 확인)
    // 응답 본문을 읽으려고 하면 에러가 발생할 수 있음

    // 4. S3 object key 반환 (프로필 업데이트 API에 key를 전달)
    return {
      success: true,
      data: {
        profileImageUrl: objectKey, // 전체 key (ex. image/profile/xxx.png)
        url: objectKey,
        imageUrl: objectKey,
        fileName: fileName,
      },
      resultCode: 'SUCCESS',
      msg: '',
      code: 'SUCCESS',
      status: 200,
      httpStatus: 200,
      message: '',
    } as ApiResponse<any>
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

// 상품 관련 API
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

  // 상품 상세 조회 (GET /api/v1/products/{productId}) - Swagger 스펙
  getProduct: async (productId: number) => {
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/products/${productId}`,
    )
    return normalizeApiResponse(response.data)
  },

  // 상품 이미지 PreSigned URL 요청 (POST /api/v1/products/img) - 여러 이미지
  // PreSigned URL 방식: 1. PreSigned URL 요청 → 2. 파일명 추출 → 3. S3에 이미지 업로드 → 4. 파일명 반환
  uploadProductImages: async (imageFiles: File[]) => {
    if (imageFiles.length === 0) {
      throw new Error('이미지 파일이 없습니다.')
    }

    if (imageFiles.length > 10) {
      throw new Error('이미지는 최대 10개까지 등록 가능합니다.')
    }

    // 1. PreSigned URL 요청 (여러 이미지)
    const preSignedUrlRequests = imageFiles.map((file) => ({
      contentType: file.type || 'image/jpeg',
      contentLength: file.size,
    }))

    // Swagger 스펙에 맞게 requests 객체로 감싸서 전송
    const axiosResponse = await apiClient.post<ApiResponse<string[]>>(
      '/api/v1/products/img',
      { requests: preSignedUrlRequests },
    )
    const preSignedResponse = normalizeApiResponse(axiosResponse.data)

    if (!preSignedResponse.success || !preSignedResponse.data) {
      throw new Error(
        preSignedResponse.msg ||
          preSignedResponse.message ||
          'PreSigned URL 요청 실패',
      )
    }

    const preSignedUrls = preSignedResponse.data

    if (preSignedUrls.length !== imageFiles.length) {
      throw new Error(
        'PreSigned URL 개수가 이미지 파일 개수와 일치하지 않습니다.',
      )
    }

    // 2. 각 PreSigned URL에서 S3 경로 추출 (예: image/product/abc.png)
    const imagePaths = preSignedUrls.map((url: string) => {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname.replace(/^\//, '') // 선행 슬래시 제거
      if (!pathname) {
        throw new Error('PreSigned URL에서 경로를 추출할 수 없습니다.')
      }
      return pathname
    })

    // 3. S3에 각 이미지 업로드
    const uploadPromises = imageFiles.map(async (file, index) => {
      const preSignedUrl = preSignedUrls[index]

      const s3Response = await fetch(preSignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'image/jpeg', // PreSigned URL 요청 시 전달한 contentType과 일치
          'Content-Length': file.size.toString(), // PreSigned URL 요청 시 전달한 contentLength와 일치
          'x-amz-tagging': 'status=pending', // 필수 헤더
        },
        body: file,
      })

      if (!s3Response.ok) {
        throw new Error(`이미지 업로드 실패: ${index + 1}번째 이미지`)
      }
    })

    await Promise.all(uploadPromises)

    // 3. S3 경로 배열 반환 (image/product/파일명.확장자)
    return {
      success: true,
      data: imagePaths,
      resultCode: 'SUCCESS',
      msg: '',
      code: 'SUCCESS',
      status: 200,
      httpStatus: 200,
      message: '',
    } as ApiResponse<string[]>
  },

  // 상품 이미지 업로드 (레거시 - 단일 파일, 호환성 유지)
  uploadProductImage: async (imageFile: File) => {
    const result = await productApi.uploadProductImages([imageFile])
    return {
      ...result,
      data: result.data?.[0] || '',
    } as ApiResponse<any>
  },

  // 상품 등록 (새로운 백엔드: POST /api/v1/products)
  // JSON 형식: { name, description, category, subCategory, imagesFiles: string[] }
  // imagesFiles는 이미 업로드된 이미지 URL 배열이어야 함
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

  // 내가 등록한 상품 조회 (GET /api/v1/me/products)
  // Swagger 스펙: 쿼리 파라미터 없음
  getMyProducts: async () => {
    const response = await apiClient.get<ApiResponse<any>>(
      '/api/v1/me/products',
    )
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

  // QnA 답변 삭제 (새로운 API: DELETE /api/v1/products/{productId}/qna/{qnaId}/{answerId})
  deleteAnswer: async (productId: number, qnaId: number, answerId: number) => {
    const response = await apiClient.delete<ApiResponse<any>>(
      `/api/v1/products/${productId}/qna/${qnaId}/${answerId}`,
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

  // 찜 목록 조회 (GET /api/v1/user/me/bookmarks)
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
      ? `/api/v1/user/me/bookmarks?${queryString}`
      : `/api/v1/user/me/bookmarks`

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
    cursor?: string
    size?: number
    limit?: number // 호환성 유지
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

    // 페이징 파라미터 (Swagger: size)
    if (params?.cursor) {
      searchParams.append('cursor', params.cursor)
    }
    const pageSize = params?.size ?? params?.limit
    if (pageSize !== undefined) {
      searchParams.append('size', pageSize.toString())
    }

    const queryString = searchParams.toString()
    const endpoint = queryString
      ? `/api/v1/auctions?${queryString}`
      : `/api/v1/auctions`

    const response = await apiClient.get<ApiResponse<any>>(endpoint)
    return normalizeApiResponse(response.data)
  },

  // 경매 목록 조회 (키워드 검색)
  // GET /api/v1/auctions?keyword={keyword}&cursor={cursor}
  searchAuctions: async (params?: {
    keyword?: string // 검색어
    cursor?: string
    size?: number // Swagger 스펙 이름
    limit?: number // 호환성 유지
  }) => {
    const searchParams = new URLSearchParams()

    // 검색어 (선택사항)
    if (params?.keyword) {
      searchParams.append('keyword', params.keyword)
    }

    // 페이징 파라미터 (Swagger: size)
    if (params?.cursor) {
      searchParams.append('cursor', params.cursor)
    }
    const pageSize = params?.size ?? params?.limit
    if (pageSize !== undefined) {
      searchParams.append('size', pageSize.toString())
    }

    const queryString = searchParams.toString()
    const endpoint = queryString
      ? `/api/v1/auctions?${queryString}`
      : `/api/v1/auctions`

    const response = await apiClient.get<ApiResponse<any>>(endpoint)
    return normalizeApiResponse(response.data)
  },

  // 경매 상세 조회 (GET /api/v1/auctions/{auctionId})
  getAuctionDetail: async (auctionId: number) => {
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/auctions/${auctionId}`,
    )
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
  getAuctionBids: async (
    auctionId: number,
    params?: { page?: number; size?: number; sort?: string },
  ) => {
    const searchParams = new URLSearchParams()
    if (params?.page !== undefined) {
      searchParams.append('page', params.page.toString())
    }
    if (params?.size !== undefined) {
      searchParams.append('size', params.size.toString())
    }
    if (params?.sort) {
      searchParams.append('sort', params.sort)
    }

    const queryString = searchParams.toString()
    const endpoint = queryString
      ? `/api/v1/auctions/${auctionId}/bids?${queryString}`
      : `/api/v1/auctions/${auctionId}/bids`

    const response = await apiClient.get<ApiResponse<any>>(endpoint)
    return normalizeApiResponse(response.data)
  },

  // 입찰 이력 조회 (getAuctionBids의 별칭)
  getBidHistory: async (
    auctionId: number,
    params?: { page?: number; size?: number },
  ) => {
    return auctionApi.getAuctionBids(auctionId, params)
  },

  // 입찰 간단 리스트 조회 (GET /api/v1/auctions/{auctionId}/bid-list)
  getBidList: async (auctionId: number, params?: { size?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.size !== undefined) {
      searchParams.append('size', params.size.toString())
    }

    const queryString = searchParams.toString()
    const endpoint = queryString
      ? `/api/v1/auctions/${auctionId}/bid-list?${queryString}`
      : `/api/v1/auctions/${auctionId}/bid-list`

    const response = await apiClient.get<ApiResponse<any>>(endpoint)
    return normalizeApiResponse(response.data)
  },

  // 실시간 최고가 조회 (GET /api/v1/auctions/{auctionId}/highest-bid)
  getHighestBid: async (auctionId: number) => {
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/auctions/${auctionId}/highest-bid`,
    )
    return normalizeApiResponse(response.data)
  },

  // 즉시 구매 (POST /api/v1/auctions/{auctionId}/buy-now) - Swagger 스펙
  buyNow: async (auctionId: number, buyNowData: { bidAmount: number }) => {
    const response = await apiClient.post<ApiResponse<any>>(
      `/api/v1/auctions/${auctionId}/buy-now`,
      {
        bidAmount: buyNowData.bidAmount,
      },
    )
    return normalizeApiResponse(response.data)
  },
}

// 입찰 관련 API
export const bidApi = {
  // 경매 입찰 (POST /api/v1/auctions/{auctionId}/bids) - Swagger 스펙
  createBid: async (auctionId: number, bidData: { bidAmount: number }) => {
    const response = await apiClient.post<ApiResponse<any>>(
      `/api/v1/auctions/${auctionId}/bids`,
      {
        bidAmount: bidData.bidAmount,
      },
    )
    return normalizeApiResponse(response.data)
  },

  // 참여한 경매 목록 조회 (GET /api/v1/me/bids)
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
      ? `/api/v1/me/bids?${queryString}`
      : `/api/v1/me/bids`

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
  payBid: async (auctionId: number) => {
    throw new Error(
      '낙찰 결제 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  },
}

// 알림 관련 API (Swagger 스펙 기반)
export const notificationApi = {
  // 알림 목록 조회 (GET /api/v1/notifications)
  getNotifications: async (params?: { page?: number; size?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.page !== undefined) {
      searchParams.append('page', params.page.toString())
    }
    if (params?.size !== undefined) {
      searchParams.append('size', params.size.toString())
    }

    const queryString = searchParams.toString()
    const endpoint = queryString
      ? `/api/v1/notifications?${queryString}`
      : `/api/v1/notifications`

    const response = await apiClient.get<ApiResponse<any>>(endpoint)
    return normalizeApiResponse(response.data)
  },

  // 알림 상세 조회 (GET /api/v1/notifications/{notificationId})
  getNotificationById: async (notificationId: number) => {
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/notifications/${notificationId}`,
    )
    return normalizeApiResponse(response.data)
  },

  // 알림 읽음 처리 (PUT /api/v1/notifications/{notificationId})
  readNotification: async (notificationId: number) => {
    const response = await apiClient.put<ApiResponse<any>>(
      `/api/v1/notifications/${notificationId}`,
      undefined,
    )
    return normalizeApiResponse(response.data)
  },

  // 알림 삭제 (DELETE /api/v1/notifications/{notificationId})
  deleteNotification: async (notificationId: number) => {
    const response = await apiClient.delete<ApiResponse<any>>(
      `/api/v1/notifications/${notificationId}`,
    )
    return normalizeApiResponse(response.data)
  },

  // SSE 알림 구독 (GET /api/v1/notifications/subscribe?userId={userId})
  // 반환값: EventSource (SSE 스트림)
  subscribe: (userId: number): EventSource => {
    const baseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.p-14626.khee.store'
    const url = `${baseUrl}/api/v1/notifications/subscribe?userId=${userId}`

    // EventSource는 브라우저 네이티브 API이므로 직접 사용
    // 인증 토큰은 쿠키에서 자동으로 전송됨
    return new EventSource(url, { withCredentials: true })
  },

  // 읽지 않은 알림 개수 (별칭 - getNotifications로 계산)
  getUnreadCount: async () => {
    const result = await notificationApi.getNotifications({ page: 1, size: 1 })
    // TODO: 백엔드 응답 구조에 따라 unreadCount 필드 확인 필요
    return {
      success: result.success,
      data: result.data?.unreadCount || 0,
      resultCode: result.resultCode,
      msg: result.msg,
      code: result.code,
      status: result.status,
      httpStatus: result.httpStatus,
      message: result.message,
    }
  },

  // 모든 알림 읽음 처리 (별칭 - 개별 처리 필요 시 반복 호출)
  markAllAsRead: async () => {
    // TODO: Swagger에 일괄 읽음 처리 API가 없으므로 개별 처리 필요
    // 또는 백엔드에 일괄 처리 API 추가 요청
    throw new Error(
      '일괄 읽음 처리 API는 Swagger에 없습니다. 개별 알림에 대해 readNotification을 호출하세요.',
    )
  },

  // 알림 읽음 처리 (별칭 - readNotification과 동일)
  markAsRead: async (notificationId: number) => {
    return notificationApi.readNotification(notificationId)
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
  // 등록된 카드 목록 조회 (GET /payments/cards)
  getCards: async () => {
    const response = await apiClient.get<ApiResponse<any>>('/payments/cards')
    return normalizeApiResponse(response.data)
  },

  // 새 카드 등록 (POST /payments/cards)
  registerCard: async (data: {
    billingKey: string
    cardCompany: string
    cardNumberMasked: string
    cardName: string
  }) => {
    const response = await apiClient.post<ApiResponse<any>>(
      '/payments/cards',
      data,
    )
    return normalizeApiResponse(response.data)
  },

  // 카드 삭제 (DELETE /payments/cards/{cardId})
  deleteCard: async (cardId: number) => {
    const response = await apiClient.delete<ApiResponse<any>>(
      `/payments/cards/${cardId}`,
    )
    return normalizeApiResponse(response.data)
  },

  // 결제 준비 (POST /payments/prepare)
  prepare: async (winnerId: number) => {
    const response = await apiClient.post<ApiResponse<any>>(
      '/payments/prepare',
      { winnerId },
    )
    return normalizeApiResponse(response.data)
  },

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
    throw new Error(
      '게시글 작성 API는 Swagger에 없습니다. API가 준비되면 다시 활성화하세요.',
    )
  },
}
