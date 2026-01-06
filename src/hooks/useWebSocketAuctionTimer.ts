'use client'

import { useWebSocket, WebSocketMessage } from '@/contexts/WebSocketContext'
import { useEffect, useRef, useState } from 'react'

// 경매 타이머 정보 타입
export interface AuctionTimerData {
  productId: number
  timeLeft: string
  isEndingSoon: boolean
  isEnded: boolean
  status:
    | 'BEFORE_START'
    | 'BIDDING'
    | 'ENDING_SOON'
    | 'ENDED'
    | 'SUCCESSFUL'
    | 'FAILED'
  auctionEndTime: string
  lastUpdate: string
}

// useWebSocketAuctionTimer 훅의 반환 타입
export interface UseWebSocketAuctionTimerReturn {
  timerData: AuctionTimerData | null
  isSubscribed: boolean
  subscribe: (productId: number) => void
  unsubscribe: () => void
  error: string | null
}

/**
 * 실시간 경매 카운트다운 훅
 * @param productId 상품 ID
 * @param autoSubscribe 자동 구독 여부 (기본값: true)
 */
export function useWebSocketAuctionTimer(
  productId: number | null,
  autoSubscribe: boolean = true,
): UseWebSocketAuctionTimerReturn {
  const { subscribe, unsubscribe, isConnected } = useWebSocket()
  const [timerData, setTimerData] = useState<AuctionTimerData | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const subscriptionIdRef = useRef<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // 구독 함수
  const subscribeToAuctionTimer = (targetProductId: number) => {
    if (!targetProductId) {
      setError('상품 ID가 필요합니다')
      return
    }

    if (!isConnected) {
      setError('WebSocket이 연결되지 않았습니다')
      return
    }

    // 이미 구독 중이면 중복 구독 방지
    if (isSubscribed) {
      return
    }

    // 기존 구독 해제
    if (subscriptionIdRef.current) {
      unsubscribe(subscriptionIdRef.current)
    }

    // 기존 인터벌 정리
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    try {
      const destination = `/topic/auction-timer/${targetProductId}`
      const subscriptionId = subscribe(
        destination,
        (message: WebSocketMessage) => {
          switch (message.type) {
            case 'AUCTION_TIMER':
              // 경매 타이머 업데이트
              if (message.data) {
                const timerUpdate: AuctionTimerData = {
                  productId: targetProductId,
                  timeLeft: message.data.timeLeft || '0분',
                  isEndingSoon: message.data.isEndingSoon || false,
                  isEnded: message.data.isEnded || false,
                  status: message.data.status || 'BIDDING',
                  auctionEndTime: message.data.auctionEndTime || '',
                  lastUpdate: message.timestamp || new Date().toISOString(),
                }

                setTimerData(timerUpdate)
                setError(null)
              }
              break

            case 'SYSTEM':
              // 경매 상태 변경 (시작, 종료 등)
              if (message.data) {
                setTimerData((prev) =>
                  prev
                    ? {
                        ...prev,
                        status: getAuctionStatusFromMessage(message.content),
                        isEnded: message.content.includes('종료'),
                        lastUpdate:
                          message.timestamp || new Date().toISOString(),
                      }
                    : null,
                )
              }
              break

            default:
              break
          }
        },
      )

      subscriptionIdRef.current = subscriptionId
      setIsSubscribed(true)
      setError(null)
      console.log('⏰ 경매 타이머 구독 성공:', targetProductId, subscriptionId)

      // 클라이언트 사이드 카운트다운 (백업용)
      startClientSideCountdown(targetProductId)
    } catch (error) {
      console.error('⏰ 경매 타이머 구독 실패:', error)
      setError('구독에 실패했습니다')
      setIsSubscribed(false)
    }
  }

  // 클라이언트 사이드 카운트다운 (백업용)
  const startClientSideCountdown = (targetProductId: number) => {
    intervalRef.current = setInterval(() => {
      setTimerData((prev) => {
        if (!prev || prev.isEnded) return prev

        // 간단한 카운트다운 로직 (실제로는 서버에서 정확한 시간을 받아야 함)
        const now = new Date().getTime()
        const endTime = new Date(prev.auctionEndTime).getTime()
        const diff = endTime - now

        if (diff <= 0) {
          return {
            ...prev,
            timeLeft: '0분',
            isEnded: true,
            status: 'ENDED',
            isEndingSoon: false,
          }
        }

        const minutes = Math.floor(diff / (1000 * 60))
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)

        let timeLeft = ''
        if (days > 0) {
          timeLeft = `${days}일 ${hours % 24}시간`
        } else if (hours > 0) {
          timeLeft = `${hours}시간 ${minutes % 60}분`
        } else {
          timeLeft = `${minutes}분`
        }

        return {
          ...prev,
          timeLeft,
          isEndingSoon: minutes <= 10,
          lastUpdate: new Date().toISOString(),
        }
      })
    }, 1000) // 1초마다 업데이트
  }

  // 구독 해제 함수
  const unsubscribeFromAuctionTimer = () => {
    if (subscriptionIdRef.current) {
      unsubscribe(subscriptionIdRef.current)
      subscriptionIdRef.current = null
      setIsSubscribed(false)
      setTimerData(null)
      console.log('⏰ 경매 타이머 구독 해제')
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // 메시지에서 경매 상태 추출
  const getAuctionStatusFromMessage = (
    content: string,
  ): AuctionTimerData['status'] => {
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
    if (autoSubscribe && productId && isConnected && !isSubscribed) {
      subscribeToAuctionTimer(productId)
    }

    return () => {
      unsubscribeFromAuctionTimer()
    }
  }, [productId, autoSubscribe, isConnected])

  // 구독 해제
  useEffect(() => {
    if (!autoSubscribe || !productId) {
      unsubscribeFromAuctionTimer()
    }
  }, [autoSubscribe, productId])

  return {
    timerData,
    isSubscribed,
    subscribe: subscribeToAuctionTimer,
    unsubscribe: unsubscribeFromAuctionTimer,
    error,
  }
}
