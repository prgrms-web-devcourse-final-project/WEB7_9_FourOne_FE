'use client'

import { useWebSocket, WebSocketMessage } from '@/contexts/WebSocketContext'
import { useEffect, useRef, useState } from 'react'

// 입찰 정보 타입
export interface BidUpdate {
  productId: number
  currentPrice: number
  bidCount: number
  lastBidder?: string
  timestamp: string
}

// 경매 상태 타입
export interface AuctionStatus {
  productId: number
  status:
    | 'BEFORE_START'
    | 'BIDDING'
    | 'ENDING_SOON'
    | 'ENDED'
    | 'SUCCESSFUL'
    | 'FAILED'
  timeLeft?: string
  message: string
}

// useWebSocketBid 훅의 반환 타입
export interface UseWebSocketBidReturn {
  bidUpdate: BidUpdate | null
  auctionStatus: AuctionStatus | null
  isSubscribed: boolean
  subscribe: (productId: number) => void
  unsubscribe: () => void
  error: string | null
}

/**
 * 상품의 실시간 입찰 정보를 구독하는 훅
 * @param productId 구독할 상품 ID
 * @param autoSubscribe 자동 구독 여부 (기본값: true)
 */
export function useWebSocketBid(
  productId: number | null,
  autoSubscribe: boolean = true,
): UseWebSocketBidReturn {
  const { subscribeToBidUpdates, unsubscribe, isConnected } = useWebSocket()
  const [bidUpdate, setBidUpdate] = useState<BidUpdate | null>(null)
  const [auctionStatus, setAuctionStatus] = useState<AuctionStatus | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const subscriptionIdRef = useRef<string | null>(null)

  // 구독 함수
  const subscribe = (targetProductId: number) => {
    if (!targetProductId) {
      setError('상품 ID가 필요합니다')
      return
    }

    if (!isConnected) {
      setError('WebSocket이 연결되지 않았습니다')
      return
    }

    // 기존 구독 해제
    if (subscriptionIdRef.current) {
      unsubscribe(subscriptionIdRef.current)
    }

    try {
      const subscriptionId = subscribeToBidUpdates(
        targetProductId,
        (message: WebSocketMessage) => {
          console.log('🎯 입찰 업데이트 수신:', message)

          switch (message.type) {
            case 'BID':
              // 새로운 입찰 정보
              if (message.data) {
                const bidData: BidUpdate = {
                  productId: targetProductId,
                  currentPrice: message.data.price || message.data.currentPrice,
                  bidCount: message.data.bidCount || 0,
                  lastBidder: message.data.bidder || message.data.lastBidder,
                  timestamp: message.timestamp || new Date().toISOString(),
                }
                setBidUpdate(bidData)
                setError(null)
              }
              break

            case 'SYSTEM':
              // 시스템 알림 (경매 시작, 종료 임박, 종료 등)
              const statusData: AuctionStatus = {
                productId: targetProductId,
                status: getAuctionStatusFromMessage(message.content),
                timeLeft: extractTimeLeft(message.content),
                message: message.content,
              }
              setAuctionStatus(statusData)
              setError(null)
              break

            case 'AUCTION_TIMER':
              // 경매 타이머 업데이트
              if (message.data) {
                const timerData: AuctionStatus = {
                  productId: targetProductId,
                  status: 'BIDDING',
                  timeLeft: message.data.timeLeft,
                  message: `경매 종료까지 ${message.data.timeLeft}`,
                }
                setAuctionStatus(timerData)
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
      console.log('🎯 입찰 구독 성공:', targetProductId, subscriptionId)
    } catch (error) {
      console.error('🎯 입찰 구독 실패:', error)
      setError('구독에 실패했습니다')
      setIsSubscribed(false)
    }
  }

  // 구독 해제 함수
  const unsubscribeFromBid = () => {
    if (subscriptionIdRef.current) {
      unsubscribe(subscriptionIdRef.current)
      subscriptionIdRef.current = null
      setIsSubscribed(false)
      setBidUpdate(null)
      setAuctionStatus(null)
      console.log('🎯 입찰 구독 해제')
    }
  }

  // 메시지에서 경매 상태 추출
  const getAuctionStatusFromMessage = (
    content: string,
  ): AuctionStatus['status'] => {
    if (content.includes('시작')) return 'BEFORE_START'
    if (content.includes('10분 후') || content.includes('종료 임박'))
      return 'ENDING_SOON'
    if (content.includes('종료') && !content.includes('임박')) return 'ENDED'
    if (content.includes('낙찰') || content.includes('성공'))
      return 'SUCCESSFUL'
    if (content.includes('유찰') || content.includes('실패')) return 'FAILED'
    return 'BIDDING'
  }

  // 메시지에서 남은 시간 추출
  const extractTimeLeft = (content: string): string | undefined => {
    const timeMatch = content.match(/(\d+[일시간분초]+)/g)
    return timeMatch ? timeMatch[0] : undefined
  }

  // 자동 구독 (단일 useEffect로 통합)
  useEffect(() => {
    if (autoSubscribe && productId && isConnected && !isSubscribed) {
      subscribe(productId)
    }

    return () => {
      unsubscribeFromBid()
    }
  }, [productId, autoSubscribe, isConnected]) // isSubscribed 의존성 제거

  return {
    bidUpdate,
    auctionStatus,
    isSubscribed,
    subscribe,
    unsubscribe: unsubscribeFromBid,
    error,
  }
}
