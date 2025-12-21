'use client'

import { authApi } from '@/lib/api'
import { createContext, useContext, useEffect, useState } from 'react'

interface User {
  id: number
  email: string
  nickname: string
}

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
      console.log('🔄 새로고침/페이지 로드 - 로그인 상태 확인 시작')

      // 쿠키와 localStorage에서 토큰 확인
      const cookies = document.cookie.split(';')
      const accessTokenCookie = cookies.find((cookie) =>
        cookie.trim().startsWith('accessToken='),
      )
      const cookieToken = accessTokenCookie?.split('=')[1]?.trim()
      const localStorageToken = localStorage.getItem('accessToken')

      const accessToken = cookieToken || localStorageToken

      if (!accessToken) {
        console.log('❌ 토큰이 없습니다. 로그인하지 않은 상태로 처리')
        setLoading(false)
        return
      }

      console.log('🔑 토큰 발견, 로컬스토리지에서 사용자 정보 로드')

      // 로컬스토리지에서 사용자 정보 읽기
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        try {
          const userInfo = JSON.parse(savedUser)
          setUser(userInfo)
          console.log('✅ 로컬스토리지에서 사용자 정보 로드 완료:', userInfo)
        } catch (parseError) {
          console.error('❌ 사용자 정보 파싱 실패:', parseError)
          // 파싱 실패 시 로컬스토리지 정리
          localStorage.removeItem('user')
          localStorage.removeItem('accessToken')
        }
      } else {
        console.log('⚠️ 로컬스토리지에 사용자 정보가 없습니다')
        // 사용자 정보가 없으면 토큰도 정리
        localStorage.removeItem('accessToken')
        document.cookie =
          'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }

      setLoading(false)
      console.log('✅ 로그인 상태 확인 완료')
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
    console.log('✅ 로그인 완료, 사용자 정보 저장:', user)
  }

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser)
  }

  const logout = async () => {
    try {
      // 로그아웃 API 호출 (성공/실패 여부와 관계없이 로컬 정리 수행)
      await authApi.logout()
      console.log('✅ 로그아웃 API 호출 성공')
    } catch (error) {
      // API 호출 실패해도 로컬 정리는 수행
      console.error('❌ 로그아웃 API 호출 실패:', error)
    } finally {
      // 로컬 스토리지 정리
      localStorage.removeItem('auth_state')
      localStorage.removeItem('user')
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

      // 리다이렉트는 각 컴포넌트에서 필요할 때만 처리
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
