'use client'

import { LoginPrompt } from '@/components/auth/LoginPrompt'
import { NotificationsClient } from '@/components/features/notifications/NotificationsClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/contexts/AuthContext'
import { notificationApi } from '@/lib/api'
import { useEffect, useState } from 'react'

export function NotificationsPageClient() {
  const { isLoggedIn } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadNotifications = async () => {
      if (!isLoggedIn) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const response = await notificationApi.getNotifications({
          page: 1,
          size: 50,
        })

        if (response.success && response.data) {
          // API 응답 데이터 구조에 맞게 변환
          let notificationsData = []
          if (Array.isArray(response.data)) {
            notificationsData = response.data
          } else if (
            response.data.content &&
            Array.isArray(response.data.content)
          ) {
            notificationsData = response.data.content
          }
          setNotifications(notificationsData)
        } else {
          setError('알림을 불러오는데 실패했습니다.')
        }
      } catch (err: any) {
        console.error('알림 로드 에러:', err)
        if (err?.response?.status === 403) {
          setError('로그인이 필요합니다.')
        } else {
          setError('알림을 불러오는데 실패했습니다.')
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadNotifications()
  }, [isLoggedIn])

  // 로그인하지 않은 경우
  if (!isLoggedIn) {
    return (
      <HomeLayout>
        <PageHeader
          title="알림"
          description="새로운 소식과 업데이트를 확인하세요"
          showBackButton
        />
        <LoginPrompt
          title="알림"
          description="알림을 확인하려면 로그인해주세요."
        />
      </HomeLayout>
    )
  }

  // 로딩 중
  if (isLoading) {
    return (
      <HomeLayout isLoggedIn={true}>
        <PageHeader
          title="알림"
          description="새로운 소식과 업데이트를 확인하세요"
          showBackButton
        />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="border-primary-200 border-t-primary-600 mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4"></div>
            <p className="text-neutral-600">알림을 불러오는 중...</p>
          </div>
        </div>
      </HomeLayout>
    )
  }

  // 에러 발생
  if (error) {
    return (
      <HomeLayout isLoggedIn={true}>
        <PageHeader
          title="알림"
          description="새로운 소식과 업데이트를 확인하세요"
          showBackButton
        />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold text-neutral-900">
              {error}
            </h1>
            <p className="text-neutral-600">잠시 후 다시 시도해주세요.</p>
          </div>
        </div>
      </HomeLayout>
    )
  }

  // 정상 렌더링
  return (
    <HomeLayout isLoggedIn={true}>
      <PageHeader
        title="알림"
        description="새로운 소식과 업데이트를 확인하세요"
        showBackButton
      />
      <NotificationsClient initialNotifications={notifications} />
    </HomeLayout>
  )
}
