'use client'

import { useWebSocket, WebSocketMessage } from '@/contexts/WebSocketContext'
import { bidApi } from '@/lib/api'
import { useEffect, useRef, useState } from 'react'

// 내가 입찰한 상품 정보 타입
export interface MyBidUpdate {
  productId: number
  productTitle: string
  currentPrice: number
  bidCount: number
  myBidAmount: number
  isOutbid: boolean
  timeLeft: string
  status:
    | 'BEFORE_START'
    | 'BIDDING'
    | 'ENDING_SOON'
    | 'ENDED'
    | 'SUCCESSFUL'
    | 'FAILED'
  lastBidder?: string
  timestamp: string
}

// useWebSocketMyBids 훅의 반환 타입
export interface UseWebSocketMyBidsReturn {
  myBidUpdates: MyBidUpdate[]
  isSubscribed: boolean
  subscribe: (userId: number) => void
  unsubscribe: () => void
  error: string | null
}

/**
 * 내가 입찰한 상품들의 실시간 모니터링 훅
 * @param userId 사용자 ID
 * @param autoSubscribe 자동 구독 여부 (기본값: true)
 */
export function useWebSocketMyBids(
  userId: number | null,
  autoSubscribe: boolean = true,
): UseWebSocketMyBidsReturn {
  const { subscribe, unsubscribe, subscribeToBidUpdates, isConnected } =
    useWebSocket()
  const [myBidUpdates, setMyBidUpdates] = useState<MyBidUpdate[]>([])
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const subscriptionIdRef = useRef<string | null>(null)
  const productSubscriptionsRef = useRef<Map<number, string>>(new Map())
  const [myBidProducts, setMyBidProducts] = useState<number[]>([])
  const [productNames, setProductNames] = useState<Map<number, string>>(
    new Map(),
  )

  // 내가 입찰한 상품 목록 가져오기
  const fetchMyBidProducts = async (): Promise<number[]> => {
    try {
      const response = await bidApi.getMyBids()
      if (response.success && response.data) {
        // response.data는 { content: [...], totalElements: ... } 형태
        const bids = response.data.content || response.data
        const productIds: number[] = bids.map(
          (bid: any) => bid.productId as number,
        )
        const uniqueProductIds: number[] = [...new Set(productIds)]

        // 상품명 정보도 함께 저장
        const newProductNames = new Map<number, string>()
        bids.forEach((bid: any) => {
          if (bid.productName) {
            newProductNames.set(bid.productId, bid.productName)
          }
        })
        setProductNames(newProductNames)

        setMyBidProducts(uniqueProductIds)
        console.log('[WebSocket] 내가 입찰한 상품 목록:', uniqueProductIds)
        console.log(
          '[WebSocket] 상품명 정보:',
          Object.fromEntries(newProductNames),
        )
        return uniqueProductIds
      }
    } catch (error) {
      console.error('[WebSocket] 내 입찰 상품 목록 조회 실패:', error)
    }
    return []
  }

  // 개별 상품 브로드캐스트 구독 함수
  const subscribeToProduct = (productId: number) => {
    if (!isConnected) return

    try {
      const subscriptionId = subscribeToBidUpdates(
        productId,
        (message: WebSocketMessage) => {
          console.log(
            `[WebSocket] 상품 ${productId} 브로드캐스트 수신:`,
            message,
          )

          // 브로드캐스트 메시지 처리 (실시간 입찰 현황)
          if (message.type === 'BID' && message.data) {
            // 디버깅: 상품명 확인
            console.log('[WebSocket] 브로드캐스트 상품명 디버깅:', {
              productId,
              messageData: message.data,
              productNameFromMessage: message.data?.productName,
              productNameFromMap: productNames.get(productId),
              productNamesMap: Object.fromEntries(productNames),
            })

            const bidData: MyBidUpdate = {
              productId: productId,
              productTitle:
                message.data.productName ||
                productNames.get(productId) ||
                `상품 ${productId}`,
              currentPrice:
                message.data.price || message.data.currentPrice || 0,
              bidCount: message.data.bidCount || 0,
              myBidAmount: message.data.myBidAmount || 0,
              isOutbid: message.data.isOutbid || false,
              timeLeft: message.data.timeLeft || '',
              status: 'BIDDING',
              lastBidder: message.data.bidder || message.data.lastBidder || '',
              timestamp: message.timestamp || new Date().toISOString(),
            }

            setMyBidUpdates((prev) => {
              const existingIndex = prev.findIndex(
                (item) => item.productId === bidData.productId,
              )
              if (existingIndex >= 0) {
                const updated = [...prev]
                updated[existingIndex] = bidData
                return updated
              } else {
                return [bidData, ...prev]
              }
            })

            setError(null)
          }
        },
      )

      productSubscriptionsRef.current.set(productId, subscriptionId)
      console.log(
        `🎯 상품 ${productId} 브로드캐스트 구독 성공:`,
        subscriptionId,
      )
    } catch (error) {
      console.error(`🎯 상품 ${productId} 브로드캐스트 구독 실패:`, error)
    }
  }

  // 구독 함수
  const subscribeToMyBids = async (targetUserId: number) => {
    console.log('[WebSocket] subscribeToMyBids 호출됨:', {
      targetUserId,
      isConnected,
      isSubscribed,
    })

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
      console.log('[WebSocket] 이미 내 입찰 구독 중')
      return
    }

    try {
      // 1. 내가 입찰한 상품 목록 가져오기
      const productIds = await fetchMyBidProducts()

      // 2. 각 상품에 대해 브로드캐스트 구독 (실시간 입찰 현황)
      productIds.forEach((productId) => {
        subscribeToProduct(productId)
      })

      // 3. 개인 알림 구독 (입찰 성공/실패 등 개인 알림)
      const destination = `/user/queue/notifications`
      const subscriptionId = subscribe(
        destination,
        (message: WebSocketMessage) => {
          console.log('[WebSocket] 개인 알림 수신:', message)

          // 개인 알림 처리 (입찰 성공/실패, 낙찰/유찰 등)
          if (message.type === 'NOTIFICATION' && message.data?.type) {
            const notificationType = message.data.type
            if (
              [
                'BID_SUCCESS',
                'BID_OUTBID',
                'AUCTION_WON',
                'AUCTION_LOST',
                'AUCTION_ENDING_SOON',
                'AUCTION_END',
              ].includes(notificationType)
            ) {
              // 디버깅: 개인 알림 상품명 확인
              console.log('[WebSocket] 개인 알림 상품명 디버깅:', {
                productId: message.data.productId,
                messageData: message.data,
                productNameFromMessage: message.data?.productName,
                productTitleFromMessage: message.data?.productTitle,
                productNameFromMap: productNames.get(message.data.productId),
                productNamesMap: Object.fromEntries(productNames),
              })

              // 개인 알림을 MyBidUpdate 형태로 변환
              const bidUpdate: MyBidUpdate = {
                productId: message.data.productId || 0,
                productTitle:
                  message.data.productName ||
                  message.data.productTitle ||
                  productNames.get(message.data.productId) ||
                  `상품 ${message.data.productId || 0}`,
                currentPrice:
                  message.data.newHighestBid ||
                  message.data.finalPrice ||
                  message.data.bidAmount ||
                  0,
                bidCount: 0,
                myBidAmount:
                  message.data.myBidAmount || message.data.bidAmount || 0,
                isOutbid: notificationType === 'BID_OUTBID',
                timeLeft: message.data.timeLeft || '',
                status:
                  notificationType === 'AUCTION_WON'
                    ? 'SUCCESSFUL'
                    : notificationType === 'AUCTION_LOST'
                      ? 'FAILED'
                      : 'BIDDING',
                lastBidder: message.data.bidder || '',
                timestamp: message.timestamp || new Date().toISOString(),
              }

              setMyBidUpdates((prev) => {
                const existingIndex = prev.findIndex(
                  (item) => item.productId === bidUpdate.productId,
                )
                if (existingIndex >= 0) {
                  const updated = [...prev]
                  updated[existingIndex] = bidUpdate
                  return updated
                } else {
                  return [bidUpdate, ...prev]
                }
              })

              setError(null)

              // 개인 알림 표시 (입찰 밀림, 낙찰 등)
              if (bidUpdate.isOutbid) {
                showBidNotification(bidUpdate)
              } else if (notificationType === 'AUCTION_WON') {
                showAuctionEndNotification(bidUpdate)
              }
            }
          }
        },
      )

      subscriptionIdRef.current = subscriptionId
      setError(null)
      console.log(
        '[WebSocket] 내 입찰 구독 성공:',
        targetUserId,
        subscriptionId,
      )
      console.log('[WebSocket] 브로드캐스트 구독 수:', productIds.length)
      console.log('[WebSocket] 개인 알림 구독:', destination)

      // 상태 업데이트를 다음 틱에서 실행하여 확실히 반영되도록 함
      setTimeout(() => {
        setIsSubscribed(true)
        console.log('[WebSocket] isSubscribed 상태 업데이트됨: true')
      }, 0)
    } catch (error) {
      console.error('🎯 내 입찰 구독 실패:', error)
      setError('구독에 실패했습니다')
      setIsSubscribed(false)
    }
  }

  // 구독 해제 함수
  const unsubscribeFromMyBids = () => {
    // 개인 알림 구독 해제
    if (subscriptionIdRef.current) {
      unsubscribe(subscriptionIdRef.current)
      subscriptionIdRef.current = null
    }

    // 브로드캐스트 구독들 해제
    productSubscriptionsRef.current.forEach((subscriptionId, productId) => {
      unsubscribe(subscriptionId)
      console.log(
        `🎯 상품 ${productId} 브로드캐스트 구독 해제:`,
        subscriptionId,
      )
    })
    productSubscriptionsRef.current.clear()

    setIsSubscribed(false)
    setMyBidUpdates([])
    setMyBidProducts([])
    setProductNames(new Map())
    console.log('[WebSocket] 내 입찰 구독 해제 완료 (브로드캐스트 + 개인 알림)')
  }

  // 입찰가 상승 알림 표시
  const showBidNotification = (bidData: MyBidUpdate) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`⚠️ 입찰가 상승 - ${bidData.productTitle}`, {
        body: `현재가: ${bidData.currentPrice.toLocaleString()}원\n내 입찰가보다 높아졌습니다!`,
        icon: '/favicon.ico',
        tag: `bid-${bidData.productId}`,
        requireInteraction: true, // 사용자가 직접 닫을 때까지 유지
      })
    }
  }

  // 경매 종료 알림 표시
  const showAuctionEndNotification = (bidData: MyBidUpdate) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const isWon = bidData.status === 'SUCCESSFUL'
      new Notification(
        isWon
          ? `🎉 낙찰 성공! - ${bidData.productTitle}`
          : `⏰ 경매 종료 - ${bidData.productTitle}`,
        {
          body: isWon
            ? `축하합니다! ${bidData.currentPrice.toLocaleString()}원에 낙찰되었습니다.`
            : `경매가 종료되었습니다.\n최종가: ${bidData.currentPrice.toLocaleString()}원`,
          icon: '/favicon.ico',
          tag: `auction-end-${bidData.productId}`,
          requireInteraction: true, // 사용자가 직접 닫을 때까지 유지
        },
      )
    }
  }

  // 자동 구독
  useEffect(() => {
    console.log('[WebSocket] useWebSocketMyBids useEffect 실행:', {
      autoSubscribe,
      userId,
      isConnected,
      isSubscribed,
    })

    if (autoSubscribe && userId && isConnected && !isSubscribed) {
      console.log('[WebSocket] 구독 조건 만족, 구독 시작')
      subscribeToMyBids(userId)
    }

    return () => {
      // 페이지 이동 시에는 구독을 유지하므로 여기서는 해제하지 않음
      // userId가 null이 되거나 autoSubscribe가 false가 될 때만 해제
      if (!userId || !autoSubscribe) {
        console.log('[WebSocket] 조건 변경으로 인한 구독 해제:', {
          userId,
          autoSubscribe,
        })
        unsubscribeFromMyBids()
      }
    }
  }, [userId, autoSubscribe, isConnected]) // isSubscribed 의존성 제거

  // 로그인 상태 변경 시 구독 해제
  useEffect(() => {
    if (!autoSubscribe || !userId) {
      console.log('[WebSocket] 로그인 상태 변경으로 구독 해제:', {
        autoSubscribe,
        userId,
      })
      unsubscribeFromMyBids()
    }
  }, [autoSubscribe, userId])

  // 컴포넌트 언마운트 시에만 구독 해제
  useEffect(() => {
    return () => {
      console.log('[WebSocket] useWebSocketMyBids 컴포넌트 언마운트')
      // 페이지 이동 시에는 구독을 유지하므로 여기서는 해제하지 않음
    }
  }, [])

  return {
    myBidUpdates,
    isSubscribed,
    subscribe: subscribeToMyBids,
    unsubscribe: unsubscribeFromMyBids,
    error,
  }
}
