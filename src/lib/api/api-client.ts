import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

// API 클라이언트 기본 설정 - Next.js proxy를 통한 연결
const API_BASE_URL = '/api/proxy' // Next.js proxy를 통한 연결

class ApiClient {
  private axiosInstance: AxiosInstance

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
        // FormData인 경우 Content-Type 헤더 완전 제거 (브라우저가 자동으로 설정)
        if (config.data instanceof FormData) {
          // 모든 Content-Type 관련 헤더 제거
          delete config.headers['Content-Type']
          delete config.headers['content-type']
          // axios 기본 헤더에서도 제거
          if (config.headers && config.headers.common) {
            delete config.headers.common['Content-Type']
          }
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
        // 400 에러 시 잘못된 요청 처리 (자동 알림 비활성화 - 각 컴포넌트에서 처리)
        if (error.response?.status === 400) {
          console.log('400 에러 응답:', error.response.data)
          // 자동 알림을 제거하고 각 컴포넌트에서 에러를 처리하도록 함
        }

        // 403 에러 시 로그인 필요 알림
        if (error.response?.status === 403) {
          if (typeof window !== 'undefined') {
            alert('로그인이 필요합니다. 로그인 페이지로 이동하시겠습니까?')
          }
        }

        // 500 에러 시 서버 오류 알림
        if (error.response?.status === 500) {
          if (typeof window !== 'undefined') {
            alert('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
          }
        }

        // 네트워크 에러 처리
        if (!error.response) {
          if (typeof window !== 'undefined') {
          }
        }

        return Promise.reject(error)
      },
    )
  }

  private handleUnauthorized() {
    if (typeof window !== 'undefined') {
      // 로컬 스토리지 정리
      localStorage.removeItem('auth_state')
      localStorage.removeItem('user')
      localStorage.removeItem('last_login_time')

      // 쿠키 정리
      document.cookie =
        'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie =
        'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'

      alert('로그인이 만료되었습니다. 다시 로그인해주세요.')
      window.location.href = '/login'
    }
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
