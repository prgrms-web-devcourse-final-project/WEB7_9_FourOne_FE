'use client'

import { useWebSocket, WebSocketMessage } from '@/contexts/WebSocketContext'
import { useEffect, useRef, useState } from 'react'

// 내 경매 정보 타입
export interface MyAuctionUpdate {
  productId: number
  productTitle: string
  currentPrice: number
  bidCount: number
  status:
    | 'BEFORE_START'
    | 'BIDDING'
    | 'ENDING_SOON'
    | 'ENDED'
    | 'SUCCESSFUL'
    | 'FAILED'
  timeLeft?: string
  lastBidder?: string
  timestamp: string
}

// useWebSocketMyAuctions 훅의 반환 타입
export interface UseWebSocketMyAuctionsReturn {
  myAuctionUpdates: MyAuctionUpdate[]
  isSubscribed: boolean
  subscribe: (userId: number) => void
  unsubscribe: () => void
  error: string | null
}

/**
 * 내가 판매 중인 상품의 실시간 모니터링 훅
 * @param userId 판매자 ID
 * @param autoSubscribe 자동 구독 여부 (기본값: true)
 */
export function useWebSocketMyAuctions(
  userId: number | null,
  autoSubscribe: boolean = true,
): UseWebSocketMyAuctionsReturn {
  const { subscribe, unsubscribe, isConnected } = useWebSocket()
  const [myAuctionUpdates, setMyAuctionUpdates] = useState<MyAuctionUpdate[]>(
    [],
  )
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const subscriptionIdRef = useRef<string | null>(null)

  // 구독 함수
  const subscribeToMyAuctions = (targetUserId: number) => {
    if (!targetUserId) {
      setError('사용자 ID가 필요합니다')
      return
    }

    if (!isConnected) {
      setError('WebSocket이 연결되지 않았습니다')
      return
    }

    // 이미 구독 중이면 중복 구독 방지
    if (isSubscribed) {
      console.log('🎯 이미 내 경매 구독 중')
      return
    }

    // 기존 구독 해제
    if (subscriptionIdRef.current) {
      unsubscribe(subscriptionIdRef.current)
    }

    try {
      const destination = `/user/queue/my-auctions/${targetUserId}`
      const subscriptionId = subscribe(
        destination,
        (message: WebSocketMessage) => {
          console.log('🎯 내 경매 업데이트 수신:', message)

          switch (message.type) {
            case 'BID':
              // 내 상품에 새로운 입찰
              if (message.data) {
                const auctionData: MyAuctionUpdate = {
                  productId: message.data.productId,
                  productTitle: message.data.productTitle || '상품',
                  currentPrice: message.data.price || message.data.currentPrice,
                  bidCount: message.data.bidCount || 0,
                  status: 'BIDDING',
                  timeLeft: message.data.timeLeft,
                  lastBidder: message.data.bidder || message.data.lastBidder,
                  timestamp: message.timestamp || new Date().toISOString(),
                }

                setMyAuctionUpdates((prev) => {
                  const existingIndex = prev.findIndex(
                    (item) => item.productId === auctionData.productId,
                  )
                  if (existingIndex >= 0) {
                    // 기존 상품 업데이트
                    const updated = [...prev]
                    updated[existingIndex] = auctionData
                    return updated
                  } else {
                    // 새 상품 추가
                    return [auctionData, ...prev]
                  }
                })

                setError(null)
              }
              break

            case 'SYSTEM':
              // 경매 상태 변경 (시작, 종료, 낙찰 등)
              if (message.data) {
                const statusData: MyAuctionUpdate = {
                  productId: message.data.productId,
                  productTitle: message.data.productTitle || '상품',
                  currentPrice: message.data.currentPrice || 0,
                  bidCount: message.data.bidCount || 0,
                  status: getAuctionStatusFromMessage(message.content),
                  timeLeft: message.data.timeLeft,
                  timestamp: message.timestamp || new Date().toISOString(),
                }

                setMyAuctionUpdates((prev) => {
                  const existingIndex = prev.findIndex(
                    (item) => item.productId === statusData.productId,
                  )
                  if (existingIndex >= 0) {
                    const updated = [...prev]
                    updated[existingIndex] = {
                      ...updated[existingIndex],
                      ...statusData,
                    }
                    return updated
                  } else {
                    return [statusData, ...prev]
                  }
                })

                setError(null)
              }
              break

            default:
              console.log('🎯 알 수 없는 메시지 타입:', message.type)
          }
        },
      )

      subscriptionIdRef.current = subscriptionId
      setIsSubscribed(true)
      setError(null)
      console.log('🎯 내 경매 구독 성공:', targetUserId, subscriptionId)
    } catch (error) {
      console.error('🎯 내 경매 구독 실패:', error)
      setError('구독에 실패했습니다')
      setIsSubscribed(false)
    }
  }

  // 구독 해제 함수
  const unsubscribeFromMyAuctions = () => {
    if (subscriptionIdRef.current) {
      unsubscribe(subscriptionIdRef.current)
      subscriptionIdRef.current = null
      setIsSubscribed(false)
      setMyAuctionUpdates([])
      console.log('🎯 내 경매 구독 해제')
    }
  }

  // 메시지에서 경매 상태 추출
  const getAuctionStatusFromMessage = (
    content: string,
  ): MyAuctionUpdate['status'] => {
    if (content.includes('시작')) return 'BEFORE_START'
    if (content.includes('10분 후') || content.includes('종료 임박'))
      return 'ENDING_SOON'
    if (content.includes('종료') && !content.includes('임박')) return 'ENDED'
    if (content.includes('낙찰') || content.includes('성공'))
      return 'SUCCESSFUL'
    if (content.includes('유찰') || content.includes('실패')) return 'FAILED'
    return 'BIDDING'
  }

  // 자동 구독
  useEffect(() => {
    if (autoSubscribe && userId && isConnected && !isSubscribed) {
      subscribeToMyAuctions(userId)
    }

    return () => {
      unsubscribeFromMyAuctions()
    }
  }, [userId, autoSubscribe, isConnected])

  // 로그인 상태 변경 시 구독 해제
  useEffect(() => {
    if (!autoSubscribe || !userId) {
      unsubscribeFromMyAuctions()
    }
  }, [autoSubscribe, userId])

  return {
    myAuctionUpdates,
    isSubscribed,
    subscribe: subscribeToMyAuctions,
    unsubscribe: unsubscribeFromMyAuctions,
    error,
  }
}
