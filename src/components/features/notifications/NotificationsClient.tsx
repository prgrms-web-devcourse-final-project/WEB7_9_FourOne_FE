'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  PageSizeSelector,
  Pagination,
  PaginationInfo,
} from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import { notificationApi } from '@/lib/api'
import { showErrorToast } from '@/lib/utils/toast'
import { Bell, Check } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface Notification {
  id: number
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

interface NotificationsClientProps {
  initialNotifications?: Notification[]
  onUnreadCountChange?: (count: number) => void
}

export function NotificationsClient({
  initialNotifications = [],
  onUnreadCountChange,
}: NotificationsClientProps) {
  const [selectedType, setSelectedType] = useState('all')
  const [error, setError] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)

  // API 호출 함수
  const fetchNotifications = useCallback(
    async ({ page, size }: { page: number; size: number }) => {
      return await notificationApi.getNotifications({
        page: page - 1, // API는 0-based 페이지네이션 사용
        size,
      })
    },
    [],
  )

  // 페이지네이션 훅 사용
  const {
    data: notifications,
    currentPage,
    pageSize,
    totalPages,
    totalElements,
    hasNext,
    hasPrevious,
    isLoading,
    error: paginationError,
    goToPage,
    setPageSize,
    refresh,
  } = usePagination(fetchNotifications, {
    initialPageSize: 5,
    autoLoad: !initialNotifications || initialNotifications.length === 0,
    onError: setError,
  })

  // error나 paginationError가 변경되면 토스트로 표시
  useEffect(() => {
    if (error) {
      showErrorToast(error, '알림 로드 실패')
      setError('') // 토스트 표시 후 초기화
    }
  }, [error])

  useEffect(() => {
    if (paginationError) {
      showErrorToast(paginationError, '알림 로드 실패')
    }
  }, [paginationError])

  // 초기 데이터가 있으면 설정
  useEffect(() => {
    if (initialNotifications && initialNotifications.length > 0) {
      // 초기 데이터를 페이지네이션 상태에 맞게 설정
      // 이 경우는 서버사이드에서 데이터를 받아온 경우
    }
  }, [initialNotifications])

  // 알림 데이터 변환 함수
  const transformNotificationData = (
    notificationsData: any[],
  ): Notification[] => {
    return notificationsData || []
  }

  // 변환된 알림 데이터
  const transformedNotifications = notifications
    ? transformNotificationData(notifications)
    : initialNotifications || []

  // 읽지 않은 알림 개수 로드
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const response = await notificationApi.getUnreadCount()
        if (response.success) {
          setUnreadCount(response.data || 0)
        }
      } catch (err) {
        console.error('읽지 않은 알림 개수 로드 에러:', err)
      }
    }

    loadUnreadCount()
  }, [])

  // 알림 읽음 처리
  const handleMarkAsRead = async (notificationId: number) => {
    try {
      const response = await notificationApi.markAsRead(notificationId)
      if (response.success) {
        // 페이지 새로고침으로 최신 데이터 가져오기
        refresh()

        const newCount = Math.max(0, unreadCount - 1)
        setUnreadCount(newCount)
        onUnreadCountChange?.(newCount)

        // 헤더의 알림 개수 업데이트를 위한 이벤트 발생
        window.dispatchEvent(
          new CustomEvent('notificationCountUpdate', {
            detail: { count: newCount },
          }),
        )
      }
    } catch (err) {
      console.error('알림 읽음 처리 에러:', err)
    }
  }

  // 전체 읽음 처리
  const handleMarkAllAsRead = async () => {
    try {
      const response = await notificationApi.markAllAsRead()
      if (response.success) {
        // 페이지 새로고침으로 최신 데이터 가져오기
        refresh()

        setUnreadCount(0)
        onUnreadCountChange?.(0)

        // 헤더의 알림 개수 업데이트를 위한 이벤트 발생
        window.dispatchEvent(
          new CustomEvent('notificationCountUpdate', {
            detail: { count: 0 },
          }),
        )
      }
    } catch (err) {
      console.error('전체 읽음 처리 에러:', err)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''

    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filteredNotifications = transformedNotifications.filter(
    (notification) => {
      if (selectedType === 'all') return true
      if (selectedType === 'unread') return !notification.isRead
      return false
    },
  )

  const stats = {
    total: totalElements || transformedNotifications.length,
    unread: unreadCount,
    bid: transformedNotifications.filter((n) => n.type === 'bid').length,
    payment: transformedNotifications.filter((n) => n.type === 'payment')
      .length,
    system: transformedNotifications.filter((n) => n.type === 'system').length,
  }

  const typeTabs = [
    { id: 'all', label: '전체', count: stats.total },
    { id: 'unread', label: '안읽음', count: stats.unread },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 알림 현황 요약 */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <Card variant="outlined">
          <CardContent className="p-4 text-center">
            <div className="text-primary-500 text-2xl font-bold">
              {stats.total}
            </div>
            <div className="text-sm text-neutral-600">전체 알림</div>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent className="p-4 text-center">
            <div className="text-warning-500 text-2xl font-bold">
              {stats.unread}
            </div>
            <div className="text-sm text-neutral-600">읽지 않음</div>
          </CardContent>
        </Card>
      </div>

      {/* 알림 목록 탭 */}
      <div className="mb-6">
        <div className="flex space-x-1 rounded-lg bg-neutral-100 p-1">
          {typeTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                selectedType === tab.id
                  ? 'text-primary-600 bg-white shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* 알림 목록 */}
      <div className="space-y-4">
        {isLoading ? (
          <Card variant="outlined">
            <CardContent className="py-12 text-center">
              <div className="mb-4">
                <div className="border-primary-200 border-t-primary-600 mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4"></div>
                <h3 className="text-lg font-semibold text-neutral-900">
                  알림을 불러오는 중...
                </h3>
              </div>
            </CardContent>
          </Card>
        ) : filteredNotifications.length === 0 ? (
          <Card variant="outlined">
            <CardContent className="py-12 text-center">
              <div className="mb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                  <Bell className="h-8 w-8 text-neutral-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                  알림이 없습니다
                </h3>
                <p className="text-neutral-600">
                  {selectedType === 'all' && '아직 받은 알림이 없습니다.'}
                  {selectedType === 'unread' && '읽지 않은 알림이 없습니다.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {filteredNotifications.map((notification) => {
              return (
                <Card
                  key={notification.id}
                  variant="outlined"
                  className={
                    !notification.isRead
                      ? 'border-primary-200 bg-primary-50'
                      : ''
                  }
                >
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100">
                          <Bell className="h-5 w-5 text-neutral-600" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center space-x-2">
                          {!notification.isRead && (
                            <Badge variant="warning">새 알림</Badge>
                          )}
                        </div>

                        <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                          {notification.title}
                        </h3>

                        <p className="mb-3 text-sm text-neutral-600">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-neutral-500">
                            {formatDate(notification.createdAt)}
                          </span>

                          <div className="flex space-x-2">
                            {!notification.isRead && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleMarkAsRead(notification.id)
                                }
                              >
                                <Check className="mr-1 h-3 w-3" />
                                읽음
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {/* 페이지네이션 UI */}
            <div className="mt-8 space-y-4">
              {/* 페이지 정보 및 페이지 크기 선택 */}
              <div className="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
                <PaginationInfo
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalElements={totalElements}
                  pageSize={pageSize}
                />
                <PageSizeSelector
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  options={[5, 10, 20]}
                />
              </div>

              {/* 페이지네이션 컨트롤 */}
              {totalPages > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  hasNext={hasNext}
                  hasPrevious={hasPrevious}
                  isLoading={isLoading}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* 전체 읽음 처리 버튼 */}
      {stats.unread > 0 && (
        <div className="mt-8 text-center">
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            <Check className="mr-2 h-4 w-4" />
            전체 읽음 처리
          </Button>
        </div>
      )}
    </div>
  )
}
