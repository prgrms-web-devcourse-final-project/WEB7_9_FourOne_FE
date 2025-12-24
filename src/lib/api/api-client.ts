import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'

// API 클라이언트 기본 설정 - Next.js proxy를 통한 연결
const API_BASE_URL = '/api/proxy' // Next.js proxy를 통한 연결

class ApiClient {
  private axiosInstance: AxiosInstance
  private isRefreshing = false
  private failedQueue: Array<{
    resolve: (value?: any) => void
    reject: (reason?: any) => void
  }> = []

  constructor(baseURL: string) {
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 10000,
      withCredentials: true, // 쿠키 전달을 위해 활성화
      // Content-Type을 기본값으로 설정하지 않음 (FormData 요청을 위해)
    })

    // 요청 인터셉터 설정
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // FormData인 경우 axios가 자동으로 multipart/form-data를 설정하도록 둠
        // 프록시에서 Content-Type을 확인해야 하므로 제거하지 않음
        if (config.data instanceof FormData) {
          // Content-Type을 명시적으로 설정하지 않으면 axios가 자동으로 설정함
          // boundary가 포함된 multipart/form-data가 자동으로 설정됨
        } else {
          // JSON 요청인 경우 Content-Type 설정
          if (
            !config.headers['Content-Type'] &&
            !config.headers['content-type']
          ) {
            config.headers['Content-Type'] = 'application/json'
          }
        }

        // 토큰 가져와서 Authorization 헤더 추가 (쿠키 우선, localStorage 백업)
        if (typeof document !== 'undefined') {
          // 쿠키에서 토큰 확인 (우선순위)
          const cookies = document.cookie.split(';')
          const accessTokenCookie = cookies.find((cookie) =>
            cookie.trim().startsWith('accessToken='),
          )
          const cookieToken = accessTokenCookie?.split('=')[1]?.trim()

          // localStorage에서 토큰 확인 (백업)
          const localStorageToken = localStorage.getItem('accessToken')

          // localStorage에 토큰이 있으면 쿠키에도 강제로 설정
          if (localStorageToken && !cookieToken) {
            document.cookie = `accessToken=${localStorageToken}; path=/; max-age=86400; SameSite=Lax`
          }

          const accessToken = cookieToken || localStorageToken

          if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`
            // 디버깅용 로그 (auth/me 호출 시에만)
            if (config.url?.includes('auth/me')) {
              console.log('🔑 Authorization 헤더 설정:', {
                url: config.url,
                hasToken: !!accessToken,
                tokenLength: accessToken.length,
                tokenPrefix: accessToken.substring(0, 20) + '...',
              })
            }
          } else {
            // 토큰이 없을 때 경고 (auth/me 호출 시에만)
            if (config.url?.includes('auth/me')) {
              console.warn('⚠️ auth/me 호출 시 토큰이 없습니다:', {
                url: config.url,
                cookieToken: cookieToken ? '존재' : '없음',
                localStorageToken: localStorageToken ? '존재' : '없음',
              })
            }
          }
        }

        return config
      },
      (error) => {
        return Promise.reject(error)
      },
    )

    // 응답 인터셉터 설정
    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response
      },
      async (error) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean
        }

        // 400 에러 시 잘못된 요청 처리 (자동 알림 비활성화 - 각 컴포넌트에서 처리)
        if (error.response?.status === 400) {
          console.log('400 에러 응답:', error.response.data)
          // 자동 알림을 제거하고 각 컴포넌트에서 에러를 처리하도록 함
        }

        // 401 에러 시 인증 만료 - 토큰 자동 갱신 시도
        if (error.response?.status === 401 && !originalRequest._retry) {
          // 이미 재시도 중인 요청이면 무시
          if (originalRequest._retry) {
            return Promise.reject(error)
          }

          originalRequest._retry = true

          // 이미 토큰 갱신 중이면 대기열에 추가
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject })
            })
              .then((token) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`
                }
                return this.axiosInstance(originalRequest)
              })
              .catch((err) => {
                return Promise.reject(err)
              })
          }

          this.isRefreshing = true

          try {
            // refreshToken은 HttpOnly 쿠키로 자동 설정되므로 JavaScript에서 읽을 수 없음
            // 백엔드가 쿠키에서 자동으로 읽어서 사용함
            // credentials: 'include'로 쿠키가 자동 전송됨

            // 토큰 재발급 API 호출 (쿠키에서 refreshToken 자동 전송)
            const refreshResponse = await axios.post<{
              code?: string
              httpStatus?: number
              status?: number
              message?: string
              data?: {
                accessToken?: string
                refreshToken?: string
              }
            }>(`${baseURL}/api/v1/auth/refresh`, undefined, {
              // refreshToken은 쿠키에서 자동으로 전송되므로 Authorization 헤더 불필요
              withCredentials: true, // 쿠키 자동 전송
            })

            const normalizedResponse = refreshResponse.data

            // 재발급 성공 확인
            const isSuccess =
              (normalizedResponse.httpStatus === 200 ||
                normalizedResponse.status === 200) &&
              normalizedResponse.data?.accessToken

            if (isSuccess && normalizedResponse.data?.accessToken) {
              const newAccessToken = normalizedResponse.data.accessToken

              // 새 토큰 저장
              // refreshToken은 HttpOnly 쿠키로 백엔드가 자동 관리하므로 프론트엔드에서 저장 불필요
              if (typeof window !== 'undefined' && newAccessToken) {
                localStorage.setItem('accessToken', newAccessToken)
                document.cookie = `accessToken=${newAccessToken}; path=/; max-age=86400; SameSite=Lax`
                // refreshToken은 쿠키에 이미 있으므로 별도 저장 불필요
              }

              // 대기 중인 요청들 재시도
              this.failedQueue.forEach(({ resolve }) => {
                resolve(newAccessToken)
              })
              this.failedQueue = []

              // 원래 요청 재시도
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
              }

              this.isRefreshing = false
              return this.axiosInstance(originalRequest)
            } else {
              throw new Error('토큰 재발급 실패')
            }
          } catch (refreshError) {
            // 토큰 재발급 실패 시 로그아웃 처리

            // 대기 중인 요청들 모두 실패 처리
            this.failedQueue.forEach(({ reject }) => {
              reject(refreshError)
            })
            this.failedQueue = []
            this.isRefreshing = false

            // 토큰 정리
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth_state')
              localStorage.removeItem('user')
              localStorage.removeItem('last_login_time')
              localStorage.removeItem('accessToken')
              localStorage.removeItem('refreshToken')
              document.cookie =
                'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
              document.cookie =
                'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
            }

            // AuthContext의 logout 호출 (가능한 경우)
            if (
              typeof window !== 'undefined' &&
              (window as any).__auth_logout
            ) {
              ;(window as any).__auth_logout()
            }

            return Promise.reject(error)
          }
        }

        // 403 에러 시 권한 없음 - 자동 리다이렉트 제거, 각 컴포넌트에서 처리
        if (error.response?.status === 403) {
          // 에러만 reject하여 각 컴포넌트에서 처리하도록 함
        }

        // 500 에러 시 서버 오류 알림 제거 (각 컴포넌트에서 처리)
        // if (error.response?.status === 500) {
        //   if (typeof window !== 'undefined') {
        //     alert('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
        //   }
        // }

        // 네트워크 에러 처리
        if (!error.response) {
          if (typeof window !== 'undefined') {
          }
        }

        return Promise.reject(error)
      },
    )
  }

  async get<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config)
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config)
  }

  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config)
  }

  async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.patch<T>(url, data, config)
  }

  async delete<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config)
  }
}

// API 클라이언트 인스턴스 생성
export const apiClient = new ApiClient(API_BASE_URL)

// 공통 응답 타입 (백엔드 명세에 맞춤)
export interface BaseApiResponse<T = any> {
  status: string
  message: string
  data?: T
}

export default apiClient
