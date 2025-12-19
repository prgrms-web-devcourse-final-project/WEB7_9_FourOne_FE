'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Client, Message } from 'stompjs'

// WebSocket 메시지 타입 정의
export interface WebSocketMessage {
  type:
    | 'CHAT'
    | 'BID'
    | 'AUCTION_TIMER'
    | 'NOTIFICATION'
    | 'SYSTEM'
    | 'HOME_UPDATE'
    | 'POPULAR_PRODUCTS'
    | 'RECENT_BIDS'
    | 'ENDING_SOON'
    | 'AUCTION_STATS'
    | 'BID_UPDATE'
    | 'AUCTION_END'
    | 'RANKING_UPDATE'
    | 'NEW_BID_RANKING'
    | 'RANKING_REFRESH'
  sender?: string
  content: string
  data?: any
  timestamp?: string
}

// WebSocket Context 타입 정의
interface WebSocketContextType {
  isConnected: boolean
  connect: () => void
  disconnect: () => void
  subscribe: (
    destination: string,
    callback: (message: WebSocketMessage) => void,
  ) => string
  unsubscribe: (subscriptionId: string) => void
  sendMessage: (destination: string, message: any) => void
  subscribeToBidUpdates: (
    productId: number,
    callback: (message: WebSocketMessage) => void,
  ) => string
  subscribeToNotifications: (
    callback: (message: WebSocketMessage) => void,
  ) => string
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined,
)

interface WebSocketProviderProps {
  children: React.ReactNode
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const stompClientRef = useRef<Client | null>(null)
  const subscriptionsRef = useRef<Map<string, any>>(new Map())
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  // 성능 최적화: 구독 관리
  const subscriptionCallbacksRef = useRef<
    Map<string, (message: WebSocketMessage) => void>
  >(new Map())
  const isConnectingRef = useRef(false)

  // WebSocket 연결 함수 (현재 비활성화 - api.p-14626.khee.store/ws 사용 안 함)
  const connect = () => {
    // WebSocket은 현재 사용하지 않음
    console.log(
      '🔌 WebSocket 연결 비활성화됨 (api.p-14626.khee.store/ws 사용 안 함)',
    )
    return

    // 아래 코드는 WebSocket이 준비되면 사용
    /*
    if (stompClientRef.current?.connected || isConnectingRef.current) {
      console.log('🔌 WebSocket 이미 연결됨 또는 연결 중')
      return
    }

    isConnectingRef.current = true

    try {
      console.log('🔌 WebSocket 연결 시도...')

      // STOMP 라이브러리 확인
      if (!(window as any).Stomp) {
        console.error('🔌 STOMP 라이브러리가 로드되지 않았습니다')
        handleReconnect()
        return
      }

      // 백엔드 API 엔드포인트 가져오기
      const getBackendUrl = () => {
        // 환경변수에서 백엔드 URL 가져오기 (기본값: 배포된 백엔드 URL)
        const apiBaseUrl =
          process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.p-14626.khee.store'
        return `${apiBaseUrl}/ws`
      }

      // SockJS 연결 생성
      const backendUrl = getBackendUrl()
      console.log('🔌 WebSocket 연결 URL:', backendUrl)

      // CORS 문제 해결을 위한 옵션 추가
      const socket = new SockJS(backendUrl, null, {
        transports: ['websocket', 'xhr-polling', 'xhr-streaming'],
      })
      const stompClient = (window as any).Stomp.over(socket)

      // 디버그 모드 비활성화 (성능 최적화)
      stompClient.debug = (str: string) => {
        // 중요한 메시지만 로깅
        if (
          str.includes('CONNECTED') ||
          str.includes('ERROR') ||
          str.includes('DISCONNECT')
        ) {
          console.log('🔌 STOMP:', str)
        }
      }

      // 연결 설정
      const getAccessToken = () => {
        const cookies = document.cookie.split(';')
        const accessTokenCookie = cookies.find((cookie) =>
          cookie.trim().startsWith('accessToken='),
        )
        return accessTokenCookie?.split('=')[1] || null
      }

      const accessToken = getAccessToken()
      const connectHeaders = accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {}

      stompClient.connect(
        connectHeaders,
        (frame: any) => {
          console.log('🔌 WebSocket 연결 성공:', frame)
          setIsConnected(true)
          stompClientRef.current = stompClient
          reconnectAttemptsRef.current = 0
          isConnectingRef.current = false

          // 연결 성공 시 기존 구독 복원
          restoreSubscriptions()
        },
        (error: any) => {
          console.error('🔌 WebSocket 연결 실패:', error)
          console.error('🔌 연결 실패 상세:', {
            error,
            accessToken: accessToken ? '있음' : '없음',
            headers: connectHeaders,
          })
          setIsConnected(false)
          isConnectingRef.current = false
          handleReconnect()
        },
      )

      stompClientRef.current = stompClient
    } catch (error) {
      console.error('🔌 WebSocket 연결 오류:', error)
      isConnectingRef.current = false
      handleReconnect()
    }
    */
  }

  // 재연결 처리
  const handleReconnect = () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('🔌 최대 재연결 시도 횟수 초과')
      return
    }

    const delay = Math.min(
      1000 * Math.pow(2, reconnectAttemptsRef.current),
      30000,
    )
    reconnectAttemptsRef.current++

    console.log(
      `🔌 ${delay}ms 후 재연결 시도 (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`,
    )

    reconnectTimeoutRef.current = setTimeout(() => {
      connect()
    }, delay)
  }

  // 연결 해제
  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (stompClientRef.current?.connected) {
      console.log('🔌 WebSocket 연결 해제')
      stompClientRef.current.disconnect(() => {
        console.log('🔌 WebSocket 연결 해제 완료')
      })
    }

    setIsConnected(false)
    stompClientRef.current = null
    subscriptionsRef.current.clear()
    subscriptionCallbacksRef.current.clear()
    reconnectAttemptsRef.current = 0
    isConnectingRef.current = false
  }

  // 구독 복원
  const restoreSubscriptions = () => {
    console.log('🔌 구독 복원 시작')

    // 저장된 콜백들을 다시 구독
    subscriptionCallbacksRef.current.forEach((callback, destination) => {
      if (!subscriptionsRef.current.has(destination)) {
        const subscription = stompClientRef.current?.subscribe(
          destination,
          (message: Message) => {
            try {
              const parsedMessage: WebSocketMessage = JSON.parse(message.body)
              callback(parsedMessage)
            } catch (error) {
              console.error('🔌 메시지 파싱 오류:', error, message.body)
            }
          },
        )

        if (subscription) {
          subscriptionsRef.current.set(destination, subscription)
          console.log('🔌 구독 복원:', destination)
        }
      }
    })
  }

  // 일반 구독
  const subscribe = (
    destination: string,
    callback: (message: WebSocketMessage) => void,
  ): string => {
    if (!stompClientRef.current?.connected) {
      console.warn('🔌 WebSocket이 연결되지 않음, 구독 실패:', destination)
      // 연결되지 않은 경우 콜백만 저장하고 나중에 연결 시 구독
      subscriptionCallbacksRef.current.set(destination, callback)
      return destination
    }

    // 중복 구독 방지
    if (subscriptionsRef.current.has(destination)) {
      console.log('🔌 이미 구독 중:', destination)
      return destination
    }

    // 콜백 저장
    subscriptionCallbacksRef.current.set(destination, callback)

    const subscription = stompClientRef.current.subscribe(
      destination,
      (message: Message) => {
        try {
          const parsedMessage: WebSocketMessage = JSON.parse(message.body)
          console.log('🔌 메시지 수신:', destination, parsedMessage)
          console.log('🔌 원본 메시지 body:', message.body)
          callback(parsedMessage)
        } catch (error) {
          console.error('🔌 메시지 파싱 오류:', error, message.body)
        }
      },
    )

    subscriptionsRef.current.set(destination, subscription)
    console.log('🔌 구독 성공:', destination)
    return destination
  }

  // 구독 해제
  const unsubscribe = (subscriptionId: string) => {
    console.log('🔌 unsubscribe 호출됨:', subscriptionId)
    console.log(
      '🔌 현재 구독 목록:',
      Array.from(subscriptionsRef.current.keys()),
    )

    const subscription = subscriptionsRef.current.get(subscriptionId)
    if (subscription) {
      subscription.unsubscribe()
      subscriptionsRef.current.delete(subscriptionId)
      subscriptionCallbacksRef.current.delete(subscriptionId)
      console.log('🔌 구독 해제 완료:', subscriptionId)
    } else {
      console.log('🔌 구독을 찾을 수 없음:', subscriptionId)
    }
  }

  // 메시지 전송
  const sendMessage = (destination: string, message: any) => {
    if (!stompClientRef.current?.connected) {
      console.warn(
        '🔌 WebSocket이 연결되지 않음, 메시지 전송 실패:',
        destination,
      )
      return
    }

    try {
      stompClientRef.current.send(destination, {}, JSON.stringify(message))
      console.log('🔌 메시지 전송:', destination, message)
    } catch (error) {
      console.error('🔌 메시지 전송 오류:', error)
    }
  }

  // 입찰 업데이트 구독 (편의 함수)
  const subscribeToBidUpdates = (
    productId: number,
    callback: (message: WebSocketMessage) => void,
  ): string => {
    const destination = `/topic/bid/${productId}`
    return subscribe(destination, callback)
  }

  // 개인 알림 구독 (편의 함수)
  const subscribeToNotifications = (
    callback: (message: WebSocketMessage) => void,
  ): string => {
    const destination = '/user/queue/notifications'
    return subscribe(destination, callback)
  }

  // 컴포넌트 마운트 시 자동 연결
  useEffect(() => {
    connect()

    // 컴포넌트 언마운트 시 연결 해제
    return () => {
      disconnect()
    }
  }, [])

  // 페이지 가시성 변경 시 연결 상태 관리
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 페이지가 숨겨지면 연결 유지 (백그라운드에서도 실시간 업데이트 필요)
        console.log('🔌 페이지 숨김 - 연결 유지')
      } else {
        // 페이지가 다시 보이면 연결 상태 확인
        if (!isConnected && !stompClientRef.current?.connected) {
          console.log('🔌 페이지 복원 - 재연결 시도')
          connect()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isConnected])

  const contextValue: WebSocketContextType = {
    isConnected,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    sendMessage,
    subscribeToBidUpdates,
    subscribeToNotifications,
  }

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  )
}

// WebSocket Context 사용을 위한 훅
export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocket은 WebSocketProvider 내에서 사용되어야 합니다')
  }
  return context
}

// WebSocket 연결 상태를 표시하는 컴포넌트
export function WebSocketStatus() {
  const { isConnected, connect } = useWebSocket()

  return (
    <div className="fixed right-4 bottom-4 z-50">
      <div
        className={`flex cursor-pointer items-center space-x-2 rounded-full px-3 py-2 text-sm font-medium ${
          isConnected
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}
        onClick={() => {
          if (!isConnected) {
            console.log('🔌 수동 재연결 시도')
            connect()
          }
        }}
        title={isConnected ? '실시간 연결됨' : '클릭하여 재연결'}
      >
        <div
          className={`h-2 w-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span>{isConnected ? '실시간 연결됨' : '연결 끊김'}</span>
      </div>
    </div>
  )
}
