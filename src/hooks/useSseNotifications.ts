'use client'

import { useEffect, useRef, useState } from 'react'
import { notificationApi } from '@/lib/api'

interface SseNotificationOptions {
  userId: number | null
  enabled?: boolean
}

interface UseSseNotificationsReturn {
  unreadCount: number
  isConnected: boolean
  error: string | null
}

// Swagger 기반 SSE 알림 구독 훅
export function useSseNotifications({
  userId,
  enabled = true,
}: SseNotificationOptions): UseSseNotificationsReturn {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // 초기 읽지 않은 개수 조회 (REST)
  useEffect(() => {
    const fetchUnread = async () => {
      if (!enabled || !userId) return
      try {
        const res = await notificationApi.getUnreadCount()
        if (res.success) {
          // 백엔드 응답 구조 대응: number 또는 { count }
          const count = (res as any)?.data?.count ?? (res as any)?.data ?? 0
          setUnreadCount(Number(count) || 0)
        }
      } catch (e) {
        // 조용히 실패
        console.warn('SSE 초기 unread 조회 실패:', e)
      }
    }
    fetchUnread()
  }, [enabled, userId])

  // SSE 구독 (EventSource)
  useEffect(() => {
    if (!enabled || !userId) return

    try {
      const es = notificationApi.subscribe(userId)
      eventSourceRef.current = es
      setIsConnected(true)
      setError(null)

      // 스펙: event: notification, data: "CONNECTED" (최초 연결)
      es.addEventListener('notification', (evt: Event) => {
        try {
          const dataStr = (evt as MessageEvent).data
          // 최초 연결에서 data는 문자열 "CONNECTED"일 수 있음
          // 이후 실제 알림 페이로드가 오면 unreadCount 또는 알림 카운트 증가 처리
          let parsed: any = null
          try {
            parsed = JSON.parse(dataStr)
          } catch {
            // CONNECTED 같은 단순 문자열
          }

          if (parsed && typeof parsed?.unreadCount === 'number') {
            setUnreadCount(Number(parsed.unreadCount))
          } else {
            // 별도 카운트 값이 없으면 1 증가 (보수적 처리)
            // CONNECTED일 때는 증가하지 않도록 처리
            if (dataStr !== 'CONNECTED') {
              setUnreadCount((prev) => prev + 1)
            }
          }
        } catch (e) {
          console.warn('SSE notification 이벤트 처리 오류:', e)
        }
      })

      es.onerror = (err) => {
        console.error('SSE 알림 오류:', err)
        setIsConnected(false)
        setError('알림 연결에 문제가 발생했습니다')
        // 네이티브 EventSource는 자동 재연결 시도함
      }
    } catch (e) {
      console.error('SSE 알림 구독 실패:', e)
      setIsConnected(false)
      setError('알림 구독에 실패했습니다')
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
        setIsConnected(false)
      }
    }
  }, [enabled, userId])

  // 헤더에서 읽음 처리 시 개수 업데이트 이벤트를 반영
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent)?.detail
      if (detail && typeof detail.count === 'number') {
        setUnreadCount(Number(detail.count) || 0)
      }
    }
    window.addEventListener('notificationCountUpdate', handler as EventListener)
    return () => {
      window.removeEventListener(
        'notificationCountUpdate',
        handler as EventListener,
      )
    }
  }, [])

  return { unreadCount, isConnected, error }
}
