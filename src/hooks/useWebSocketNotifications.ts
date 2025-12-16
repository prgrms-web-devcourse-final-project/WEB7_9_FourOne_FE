'use client'

import { useWebSocket, WebSocketMessage } from '@/contexts/WebSocketContext'
import { useEffect, useRef, useState } from 'react'

export interface Notification {
  id: string
  type:
    | 'BID_SUCCESS'
    | 'BID_OUTBID'
    | 'AUCTION_WON'
    | 'AUCTION_LOST'
    | 'AUCTION_START'
    | 'AUCTION_ENDING_SOON'
    | 'AUCTION_END'
    | 'PAYMENT_REMINDER'
    | 'SYSTEM'
  title: string
  message: string
  productId?: number
  productName?: string // 백엔드 가이드에서 productName 사용
  productTitle?: string
  bidAmount?: number
  myBidAmount?: number // 백엔드 가이드에서 myBidAmount 사용
  newHighestBid?: number // 백엔드 가이드에서 newHighestBid 사용
  finalPrice?: number
  initialPrice?: number // 백엔드 가이드에서 initialPrice 사용
  startTime?: string // 백엔드 가이드에서 startTime 사용
  auctionEndTime?: string // 백엔드 가이드에서 auctionEndTime 사용
  timestamp: string
  isRead: boolean
}

// useWebSocketNotifications 훅의 반환 타입
export interface UseWebSocketNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  isSubscribed: boolean
  subscribe: () => void
  unsubscribe: () => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  clearNotifications: () => void
  error: string | null
}

/**
 * 개인 알림을 구독하는 훅
 * @param autoSubscribe 자동 구독 여부 (기본값: true)
 * @param maxNotifications 최대 알림 개수 (기본값: 50)
 */
export function useWebSocketNotifications(
  autoSubscribe: boolean = true,
  maxNotifications: number = 50,
): UseWebSocketNotificationsReturn {
  const { subscribeToNotifications, unsubscribe, isConnected } = useWebSocket()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const subscriptionIdRef = useRef<string | null>(null)

  // 구독되지 않은 알림 개수 계산
  const unreadCount = notifications.filter((n) => !n.isRead).length

  // 구독 함수
  const subscribe = () => {
    if (!isConnected) {
      setError('WebSocket이 연결되지 않았습니다')
      return
    }

    // 이미 구독 중이면 중복 구독 방지
    if (isSubscribed) {
      console.log('🔔 이미 알림 구독 중')
      return
    }

    // 기존 구독 해제
    if (subscriptionIdRef.current) {
      unsubscribe(subscriptionIdRef.current)
    }

    try {
      const subscriptionId = subscribeToNotifications(
        (message: WebSocketMessage) => {
          console.log('🔔 개인 알림 수신:', message)

          // 백엔드 메시지 구조에 맞게 처리
          const notificationData = message.data
          const notificationType = notificationData?.type

          // 백엔드 가이드에 맞춰 알림 데이터 처리
          const notification: Notification = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: notificationType || 'SYSTEM',
            title: getNotificationTitle(notificationType, message.content),
            message: message.content,
            productId: notificationData?.productId,
            productName: notificationData?.productName, // 백엔드 가이드에서 productName 사용
            productTitle: notificationData?.productName, // productName을 productTitle에도 매핑
            bidAmount: notificationData?.bidAmount,
            myBidAmount: notificationData?.myBidAmount, // 백엔드 가이드에서 myBidAmount 사용
            newHighestBid: notificationData?.newHighestBid, // 백엔드 가이드에서 newHighestBid 사용
            finalPrice: notificationData?.finalPrice,
            initialPrice: notificationData?.initialPrice, // 백엔드 가이드에서 initialPrice 사용
            startTime: notificationData?.startTime, // 백엔드 가이드에서 startTime 사용
            auctionEndTime: notificationData?.auctionEndTime, // 백엔드 가이드에서 auctionEndTime 사용
            timestamp: message.timestamp || new Date().toISOString(),
            isRead: false,
          }

          setNotifications((prev) => {
            const newNotifications = [notification, ...prev]
            // 최대 개수 제한
            return newNotifications.slice(0, maxNotifications)
          })

          setError(null)

          // 브라우저 알림 표시 (사용자 권한이 있는 경우)
          showBrowserNotification(notification)

          // 토스트 알림 표시
          showToastNotification(notification)
        },
      )

      subscriptionIdRef.current = subscriptionId
      setIsSubscribed(true)
      setError(null)
      console.log('🔔 알림 구독 성공:', subscriptionId)
    } catch (error) {
      console.error('🔔 알림 구독 실패:', error)
      setError('구독에 실패했습니다')
      setIsSubscribed(false)
    }
  }

  // 구독 해제 함수
  const unsubscribeFromNotifications = () => {
    if (subscriptionIdRef.current) {
      unsubscribe(subscriptionIdRef.current)
      subscriptionIdRef.current = null
      setIsSubscribed(false)
      console.log('🔔 알림 구독 해제')
    }
  }

  // 알림 제목 생성 (백엔드 알림 타입에 맞춤)
  const getNotificationTitle = (
    notificationType: string,
    content: string,
  ): string => {
    switch (notificationType) {
      case 'BID_SUCCESS':
        return '입찰 성공'
      case 'BID_OUTBID':
        return '입찰 밀림'
      case 'AUCTION_WON':
        return '낙찰 성공'
      case 'AUCTION_LOST':
        return '낙찰 실패'
      case 'AUCTION_START':
        return '경매 시작'
      case 'AUCTION_ENDING_SOON':
        return '경매 종료 임박'
      case 'AUCTION_END':
        return '경매 종료'
      case 'PAYMENT_REMINDER':
        return '결제 알림'
      case 'SYSTEM':
        return '시스템 알림'
      default:
        return '알림'
    }
  }

  // 토스트 알림 표시
  const showToastNotification = (notification: Notification) => {
    // 토스트 라이브러리가 있다면 사용, 없다면 console.log
    if (typeof window !== 'undefined') {
      // 간단한 토스트 알림 구현
      const toast = document.createElement('div')
      toast.className = `fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg transition-all duration-300 ${
        notification.type === 'AUCTION_WON' ||
        notification.type === 'BID_SUCCESS'
          ? 'bg-green-500 text-white'
          : notification.type === 'BID_OUTBID' ||
              notification.type === 'AUCTION_ENDING_SOON'
            ? 'bg-yellow-500 text-white'
            : notification.type === 'AUCTION_LOST'
              ? 'bg-red-500 text-white'
              : 'bg-blue-500 text-white'
      }`

      toast.innerHTML = `
        <div class="font-semibold">${notification.title}</div>
        <div class="text-sm mt-1">${notification.message}</div>
      `

      document.body.appendChild(toast)

      // 5초 후 자동 제거
      setTimeout(() => {
        toast.style.opacity = '0'
        toast.style.transform = 'translateX(100%)'
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast)
          }
        }, 300)
      }, 5000)
    }
  }

  // 브라우저 알림 표시
  const showBrowserNotification = (notification: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.png',
        tag: notification.id,
      })
    }
  }

  // 알림 읽음 처리
  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification,
      ),
    )
  }

  // 모든 알림 읽음 처리
  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, isRead: true })),
    )
  }

  // 알림 삭제
  const clearNotifications = () => {
    setNotifications([])
  }

  // 브라우저 알림 권한 요청
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // 자동 구독 (단일 useEffect로 통합)
  useEffect(() => {
    if (autoSubscribe && isConnected && !isSubscribed) {
      subscribe()
    }

    return () => {
      unsubscribeFromNotifications()
    }
  }, [autoSubscribe, isConnected]) // isSubscribed 의존성 제거

  // 로그인 상태 변경 시 구독 해제
  useEffect(() => {
    if (!autoSubscribe) {
      unsubscribeFromNotifications()
    }
  }, [autoSubscribe])

  return {
    notifications,
    unreadCount,
    isSubscribed,
    subscribe,
    unsubscribe: unsubscribeFromNotifications,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    error,
  }
}
