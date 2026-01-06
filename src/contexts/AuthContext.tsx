'use client'

import { authApi } from '@/lib/api'
import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@/types'

interface AuthContextType {
  user: User | null
  isLoggedIn: boolean
  login: (
    user: User,
    tokens: { accessToken: string; refreshToken: string },
  ) => Promise<void>
  logout: () => Promise<void>
  updateUser: (user: User) => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 페이지 로드 시 서버에서 로그인 상태 확인
    const checkAuthStatus = async () => {
      // 쿠키와 localStorage에서 토큰 확인
      const cookies = document.cookie.split(';')
      const accessTokenCookie = cookies.find((cookie) =>
        cookie.trim().startsWith('accessToken='),
      )
      const cookieToken = accessTokenCookie?.split('=')[1]?.trim()
      const localStorageToken = localStorage.getItem('accessToken')

      const accessToken = cookieToken || localStorageToken

      if (!accessToken) {
        setLoading(false)
        return
      }

      // /me API를 호출하여 최신 사용자 정보(프로필 이미지 포함) 가져오기
      try {
        const meResponse = await authApi.getMyInfoV2()
        if (meResponse.success && meResponse.data) {
          const meData = meResponse.data as any
          const userData: User = {
            id: meData.userId || meData.id,
            email: meData.email,
            nickname: meData.nickname,
            profileImageUrl: meData.profileImageUrl,
            createdAt: meData.createdAt,
          }
          setUser(userData)
          localStorage.setItem('user', JSON.stringify(userData))
        } else {
          // /me API 실패 시 로컬스토리지에서 읽기
          const savedUser = localStorage.getItem('user')
          if (savedUser) {
            try {
              const userInfo = JSON.parse(savedUser)
              setUser(userInfo)
            } catch (parseError) {
              console.error('❌ 사용자 정보 파싱 실패:', parseError)
              localStorage.removeItem('user')
              localStorage.removeItem('accessToken')
            }
          }
        }
      } catch (error: any) {
        console.error('❌ /me API 호출 실패:', error)
        // 403 에러인 경우 로그아웃 처리는 Header에서 이미 처리됨
        const status =
          error?.response?.status ||
          error?.status ||
          error?.httpStatus ||
          error?.code

        if (status === 403 || status === 401) {
          console.warn('인증 오류 - 로그인 정보 초기화')
          localStorage.removeItem('user')
          localStorage.removeItem('accessToken')
          document.cookie =
            'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        } else {
          // 다른 에러인 경우 로컬스토리지에서 읽기
          const savedUser = localStorage.getItem('user')
          if (savedUser) {
            try {
              const userInfo = JSON.parse(savedUser)
              setUser(userInfo)
            } catch (parseError) {
              console.error('❌ 사용자 정보 파싱 실패:', parseError)
            }
          }
        }
      }

      setLoading(false)
    }

    checkAuthStatus()
  }, [])

  const login = async (
    user: User,
    tokens: { accessToken: string; refreshToken: string },
  ) => {
    // 사용자 정보를 로컬스토리지에 저장
    setUser(user)
    localStorage.setItem('user', JSON.stringify(user))
    // 토스 결제용 사용자 정보 저장
    localStorage.setItem('userEmail', user.email)
    localStorage.setItem('userName', user.nickname)
  }

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser)
    localStorage.setItem('user', JSON.stringify(updatedUser))
    // 토스 결제용 사용자 정보 저장
    localStorage.setItem('userEmail', updatedUser.email)
    localStorage.setItem('userName', updatedUser.nickname)
  }

  const logout = async () => {
    try {
      // 로그아웃 API 호출 (성공/실패 여부와 관계없이 로컬 정리 수행)
      await authApi.logout()
    } catch (error) {
      // API 호출 실패해도 로컬 정리는 수행
      console.error('❌ 로그아웃 API 호출 실패:', error)
    } finally {
      // 로컬 스토리지 정리
      localStorage.removeItem('auth_state')
      localStorage.removeItem('user')
      localStorage.removeItem('userEmail')
      localStorage.removeItem('userName')
      localStorage.removeItem('last_login_time')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('lastRefreshAttempt')

      // 쿠키에서 토큰 제거
      document.cookie =
        'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie =
        'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'

      setUser(null)

      // 홈으로 리다이렉트
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        login,
        logout,
        updateUser,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
