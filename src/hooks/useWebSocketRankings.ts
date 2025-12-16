'use client'

import { useWebSocket, WebSocketMessage } from '@/contexts/WebSocketContext'
import { useEffect, useRef, useState } from 'react'

// 랭킹 데이터 타입
export interface RankingData {
  productId: number
  title: string
  currentPrice: number
  bidCount: number
  timeLeft: string
  imageUrl?: string
  rank: number
  category?: string
  isNewBid?: boolean
}

// 카테고리별 랭킹 타입
export interface CategoryRankings {
  [category: string]: RankingData[]
}

// useWebSocketRankings 훅의 반환 타입
export interface UseWebSocketRankingsReturn {
  rankings: CategoryRankings
  overallRankings: RankingData[]
  isSubscribed: boolean
  subscribe: (category?: string) => void
  unsubscribe: () => void
  error: string | null
}

/**
 * 실시간 경매 랭킹 훅
 * @param category 카테고리 (선택사항, 없으면 전체 랭킹)
 * @param autoSubscribe 자동 구독 여부 (기본값: true)
 */
export function useWebSocketRankings(
  category?: string,
  autoSubscribe: boolean = true,
): UseWebSocketRankingsReturn {
  const { subscribe, unsubscribe, isConnected } = useWebSocket()
  const [rankings, setRankings] = useState<CategoryRankings>({})
  const [overallRankings, setOverallRankings] = useState<RankingData[]>([])
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const subscriptionIdRef = useRef<string | null>(null)

  // 구독 함수
  const subscribeToRankings = (targetCategory?: string) => {
    if (!isConnected) {
      setError('WebSocket이 연결되지 않았습니다')
      return
    }

    // 이미 구독 중이면 중복 구독 방지
    if (isSubscribed) {
      console.log('🏆 이미 랭킹 구독 중')
      return
    }

    // 기존 구독 해제
    if (subscriptionIdRef.current) {
      unsubscribe(subscriptionIdRef.current)
    }

    try {
      const destination = targetCategory
        ? `/topic/rankings/${targetCategory}`
        : '/topic/rankings/overall'

      const subscriptionId = subscribe(
        destination,
        (message: WebSocketMessage) => {
          console.log('🏆 랭킹 업데이트 수신:', message)

          switch (message.type) {
            case 'RANKING_UPDATE':
              // 랭킹 업데이트
              if (message.data) {
                const rankingData: RankingData[] = message.data.rankings || []

                if (targetCategory) {
                  // 카테고리별 랭킹 업데이트
                  setRankings((prev) => ({
                    ...prev,
                    [targetCategory]: rankingData,
                  }))
                } else {
                  // 전체 랭킹 업데이트
                  setOverallRankings(rankingData)
                }

                setError(null)
              }
              break

            case 'NEW_BID_RANKING':
              // 새로운 입찰로 인한 랭킹 변경
              if (message.data) {
                const updatedProduct: RankingData = {
                  ...message.data,
                  isNewBid: true,
                }

                if (targetCategory) {
                  setRankings((prev) => {
                    const categoryRankings = prev[targetCategory] || []
                    const existingIndex = categoryRankings.findIndex(
                      (item) => item.productId === updatedProduct.productId,
                    )

                    if (existingIndex >= 0) {
                      const updated = [...categoryRankings]
                      updated[existingIndex] = updatedProduct
                      return {
                        ...prev,
                        [targetCategory]: updated,
                      }
                    } else {
                      return {
                        ...prev,
                        [targetCategory]: [updatedProduct, ...categoryRankings],
                      }
                    }
                  })
                } else {
                  setOverallRankings((prev) => {
                    const existingIndex = prev.findIndex(
                      (item) => item.productId === updatedProduct.productId,
                    )

                    if (existingIndex >= 0) {
                      const updated = [...prev]
                      updated[existingIndex] = updatedProduct
                      return updated
                    } else {
                      return [updatedProduct, ...prev]
                    }
                  })
                }
              }
              break

            case 'RANKING_REFRESH':
              // 랭킹 전체 새로고침
              if (message.data) {
                if (targetCategory) {
                  setRankings((prev) => ({
                    ...prev,
                    [targetCategory]: message.data.rankings || [],
                  }))
                } else {
                  setOverallRankings(message.data.rankings || [])
                }
              }
              break

            default:
              console.log('🏆 알 수 없는 메시지 타입:', message.type)
          }
        },
      )

      subscriptionIdRef.current = subscriptionId
      setIsSubscribed(true)
      setError(null)
      console.log(
        '🏆 랭킹 구독 성공:',
        targetCategory || '전체',
        subscriptionId,
      )
    } catch (error) {
      console.error('🏆 랭킹 구독 실패:', error)
      setError('구독에 실패했습니다')
      setIsSubscribed(false)
    }
  }

  // 구독 해제 함수
  const unsubscribeFromRankings = () => {
    if (subscriptionIdRef.current) {
      unsubscribe(subscriptionIdRef.current)
      subscriptionIdRef.current = null
      setIsSubscribed(false)
      console.log('🏆 랭킹 구독 해제')
    }
  }

  // 자동 구독
  useEffect(() => {
    if (autoSubscribe && isConnected && !isSubscribed) {
      subscribeToRankings(category)
    }

    return () => {
      unsubscribeFromRankings()
    }
  }, [category, autoSubscribe, isConnected])

  // 구독 해제
  useEffect(() => {
    if (!autoSubscribe) {
      unsubscribeFromRankings()
    }
  }, [autoSubscribe])

  return {
    rankings,
    overallRankings,
    isSubscribed,
    subscribe: subscribeToRankings,
    unsubscribe: unsubscribeFromRankings,
    error,
  }
}
