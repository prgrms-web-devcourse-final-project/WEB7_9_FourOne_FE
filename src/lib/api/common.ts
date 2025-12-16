// 공통 에러 타입 정의
export interface StandardApiError {
  status: number
  message: string
  code?: string
}

// 공통 API 응답 타입
export interface StandardApiResponse<T = any> {
  status: number
  message?: string
  data?: T
}

// API 에러 처리 유틸리티 (백엔드 메시지 우선 사용)
export const handleApiError = (error: any): StandardApiError => {
  console.error('API 에러:', error)

  // Axios 에러 처리
  if (error.response) {
    const status = error.response.status
    const data = error.response.data

    // 새로운 백엔드 응답 구조: { code, status, message, data }
    // 백엔드에서 제공하는 메시지를 우선 사용
    const backendMessage =
      data?.message || // 새로운 구조
      data?.msg || // 기존 구조 (하위 호환)
      data?.errorMessage // 기타

    switch (status) {
      case 400:
        return {
          status: 400,
          message: backendMessage || '잘못된 요청입니다.',
          code: data?.code || 'BAD_REQUEST',
        }
      case 401:
        return {
          status: 401,
          message: backendMessage || '로그인이 필요합니다.',
          code: data?.code || 'UNAUTHORIZED',
        }
      case 403:
        return {
          status: 403,
          message: backendMessage || '권한이 없습니다.',
          code: data?.code || 'FORBIDDEN',
        }
      case 404:
        return {
          status: 404,
          message: backendMessage || '요청한 리소스를 찾을 수 없습니다.',
          code: data?.code || 'NOT_FOUND',
        }
      case 409:
        return {
          status: 409,
          message: backendMessage || '이미 존재하는 데이터입니다.',
          code: data?.code || 'CONFLICT',
        }
      case 422:
        return {
          status: 422,
          message: backendMessage || '입력 데이터가 올바르지 않습니다.',
          code: data?.code || 'UNPROCESSABLE_ENTITY',
        }
      case 500:
        return {
          status: 500,
          message: backendMessage || '서버 내부 오류가 발생했습니다.',
          code: data?.code || 'INTERNAL_ERROR',
        }
      default:
        return {
          status,
          message: backendMessage || `HTTP ${status} 오류가 발생했습니다.`,
          code: data?.code || 'HTTP_ERROR',
        }
    }
  }

  // 네트워크 에러 처리
  if (error.request) {
    return {
      status: 0,
      message: '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.',
      code: 'NETWORK_ERROR',
    }
  }

  // 기타 에러 처리
  if (error instanceof Error) {
    if (error.message.includes('CORS')) {
      return {
        status: 0,
        message: '브라우저 보안 정책으로 인해 요청이 차단되었습니다.',
        code: 'CORS_ERROR',
      }
    }

    return {
      status: 0,
      message: error.message,
    }
  }

  return {
    status: 0,
    message: '알 수 없는 오류가 발생했습니다.',
    code: 'UNKNOWN_ERROR',
  }
}

// 로그아웃 처리 유틸리티
export const handleLogout = async (): Promise<void> => {
  try {
    // 서버 로그아웃 요청
    await fetch('/api/proxy/api/v1/users/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })
  } catch (error) {
    console.error('서버 로그아웃 요청 실패:', error)
  }

  // 클라이언트 상태 정리
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_state')
    localStorage.removeItem('user')
    localStorage.removeItem('last_login_time')
  }
}

// 401 에러 시 자동 로그아웃 처리
export const handle401Error = async (): Promise<void> => {
  await handleLogout()

  if (typeof window !== 'undefined') {
    alert('로그인이 만료되었습니다. 다시 로그인해주세요.')
    window.location.href = '/login'
  }
}

// 표준화된 fetch 래퍼
export const apiRequest = async <T = any>(
  url: string,
  options: RequestInit = {},
): Promise<StandardApiResponse<T>> => {
  try {
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (response.status === 401) {
      await handle401Error()
      throw new Error('Unauthorized')
    }

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`)
    }

    return {
      status: response.status,
      message: data.message,
      data: data.data || data,
    }
  } catch (error) {
    throw handleApiError(error)
  }
}

// 로컬 스토리지에서 사용자 정보 가져오기 유틸리티
export const getCurrentUser = () => {
  if (typeof window === 'undefined') return null

  try {
    // useAuth 상태 확인
    const authData = localStorage.getItem('auth_state')
    if (authData) {
      const authState = JSON.parse(authData)
      if (authState.user && authState.isAuthenticated) {
        return authState.user
      }
    }

    // 레거시 user 확인
    const userData = localStorage.getItem('user')
    if (userData) {
      return JSON.parse(userData)
    }

    return null
  } catch (error) {
    console.error('사용자 정보 파싱 실패:', error)
    return null
  }
}

// 사용자 ID 가져오기 유틸리티
export const getCurrentUserId = (): string | null => {
  const user = getCurrentUser()
  return user?.userId?.toString() || null
}
