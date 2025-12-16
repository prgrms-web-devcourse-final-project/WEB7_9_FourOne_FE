'use client'

import { useWebSocket, WebSocketMessage } from '@/contexts/WebSocketContext'
import { useEffect, useRef, useState } from 'react'

// 홈페이지 실시간 데이터 타입
export interface HomeRealtimeData {
  popularProducts: Array<{
    productId: number
    title: string
    currentPrice: number
    bidCount: number
    timeLeft: string
    imageUrl?: string
  }>
  recentBids: Array<{
    productId: number
    productTitle: string
    bidAmount: number
    bidder: string
    timestamp: string
  }>
  endingSoonProducts: Array<{
    productId: number
    title: string
    currentPrice: number
    timeLeft: string
  }>
  totalActiveAuctions: number
  totalBidsToday: number
}

// useWebSocketHome 훅의 반환 타입
export interface UseWebSocketHomeReturn {
  homeData: HomeRealtimeData
  isSubscribed: boolean
  subscribe: () => void
  unsubscribe: () => void
  error: string | null
}

/**
 * 홈페이지 실시간 데이터 구독 훅
 * @param autoSubscribe 자동 구독 여부 (기본값: true)
 */
export function useWebSocketHome(
  autoSubscribe: boolean = true,
): UseWebSocketHomeReturn {
  const { subscribe, unsubscribe, isConnected } = useWebSocket()
  const [homeData, setHomeData] = useState<HomeRealtimeData>({
    popularProducts: [],
    recentBids: [],
    endingSoonProducts: [],
    totalActiveAuctions: 0,
    totalBidsToday: 0,
  })
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const subscriptionIdRef = useRef<string | null>(null)

  // 구독 함수
  const subscribeToHomeData = () => {
    if (!isConnected) {
      setError('WebSocket이 연결되지 않았습니다')
      return
    }

    // 이미 구독 중이면 중복 구독 방지
    if (isSubscribed) {
      console.log('🏠 이미 홈 데이터 구독 중')
      return
    }

    // 기존 구독 해제
    if (subscriptionIdRef.current) {
      unsubscribe(subscriptionIdRef.current)
    }

    try {
      const destination = '/topic/home-updates'
      const subscriptionId = subscribe(
        destination,
        (message: WebSocketMessage) => {
          console.log('🏠 홈 데이터 업데이트 수신:', message)

          switch (message.type) {
            case 'HOME_UPDATE':
              // 홈페이지 전체 데이터 업데이트
              if (message.data) {
                setHomeData((prev) => ({
                  ...prev,
                  ...message.data,
                }))
                setError(null)
              }
              break

            case 'POPULAR_PRODUCTS':
              // 인기 상품 업데이트
              if (message.data) {
                setHomeData((prev) => ({
                  ...prev,
                  popularProducts: message.data.products || [],
                }))
              }
              break

            case 'RECENT_BIDS':
              // 최근 입찰 업데이트
              if (message.data) {
                setHomeData((prev) => ({
                  ...prev,
                  recentBids: [message.data, ...prev.recentBids.slice(0, 9)], // 최대 10개 유지
                }))
              }
              break

            case 'ENDING_SOON':
              // 종료 임박 상품 업데이트
              if (message.data) {
                setHomeData((prev) => ({
                  ...prev,
                  endingSoonProducts: message.data.products || [],
                }))
              }
              break

            case 'AUCTION_STATS':
              // 경매 통계 업데이트
              if (message.data) {
                setHomeData((prev) => ({
                  ...prev,
                  totalActiveAuctions: message.data.totalActiveAuctions || 0,
                  totalBidsToday: message.data.totalBidsToday || 0,
                }))
              }
              break

            default:
              console.log('🏠 알 수 없는 메시지 타입:', message.type)
          }
        },
      )

      subscriptionIdRef.current = subscriptionId
      setIsSubscribed(true)
      setError(null)
      console.log('🏠 홈 데이터 구독 성공:', subscriptionId)
    } catch (error) {
      console.error('🏠 홈 데이터 구독 실패:', error)
      setError('구독에 실패했습니다')
      setIsSubscribed(false)
    }
  }

  // 구독 해제 함수
  const unsubscribeFromHomeData = () => {
    if (subscriptionIdRef.current) {
      unsubscribe(subscriptionIdRef.current)
      subscriptionIdRef.current = null
      setIsSubscribed(false)
      console.log('🏠 홈 데이터 구독 해제')
    }
  }

  // 자동 구독
  useEffect(() => {
    if (autoSubscribe && isConnected && !isSubscribed) {
      subscribeToHomeData()
    }

    return () => {
      unsubscribeFromHomeData()
    }
  }, [autoSubscribe, isConnected])

  // 구독 해제
  useEffect(() => {
    if (!autoSubscribe) {
      unsubscribeFromHomeData()
    }
  }, [autoSubscribe])

  return {
    homeData,
    isSubscribed,
    subscribe: subscribeToHomeData,
    unsubscribe: unsubscribeFromHomeData,
    error,
  }
}
