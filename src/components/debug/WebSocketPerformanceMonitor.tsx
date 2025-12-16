'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { useWebSocketBid } from '@/hooks/useWebSocketBid'
import { useWebSocketHome } from '@/hooks/useWebSocketHome'
import { useWebSocketMyAuctions } from '@/hooks/useWebSocketMyAuctions'
import { useWebSocketNotifications } from '@/hooks/useWebSocketNotifications'
import { useWebSocketRankings } from '@/hooks/useWebSocketRankings'
import { Activity, Bell, Home, Package, Trophy, Users, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'

interface PerformanceMetrics {
  connectionTime: number
  messageCount: number
  subscriptionCount: number
  errorCount: number
  lastMessageTime: string
}

export function WebSocketPerformanceMonitor() {
  const { isConnected } = useWebSocket()
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    connectionTime: 0,
    messageCount: 0,
    subscriptionCount: 0,
    errorCount: 0,
    lastMessageTime: '',
  })

  // 모든 WebSocket 훅들을 테스트용으로 구독
  const { isSubscribed: isBidSubscribed } = useWebSocketBid(1, false)
  const { isSubscribed: isHomeSubscribed } = useWebSocketHome(false)
  const { isSubscribed: isMyAuctionsSubscribed } = useWebSocketMyAuctions(
    1,
    false,
  )
  const { isSubscribed: isNotificationsSubscribed } =
    useWebSocketNotifications(false)
  const { isSubscribed: isRankingsSubscribed } = useWebSocketRankings(
    'all',
    false,
  )

  const totalSubscriptions = [
    isBidSubscribed,
    isHomeSubscribed,
    isMyAuctionsSubscribed,
    isNotificationsSubscribed,
    isRankingsSubscribed,
  ].filter(Boolean).length

  // 성능 메트릭 업데이트
  useEffect(() => {
    if (isConnected) {
      setMetrics((prev) => ({
        ...prev,
        connectionTime: connectionTime || 0,
        subscriptionCount: totalSubscriptions,
        lastMessageTime: new Date().toLocaleTimeString(),
      }))
    }
  }, [isConnected, connectionTime, totalSubscriptions])

  // 메모리 사용량 모니터링
  const [memoryUsage, setMemoryUsage] = useState<{
    used: number
    total: number
    percentage: number
  }>({ used: 0, total: 0, percentage: 0 })

  useEffect(() => {
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        setMemoryUsage({
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
          percentage: Math.round(
            (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
          ),
        })
      }
    }

    updateMemoryUsage()
    const interval = setInterval(updateMemoryUsage, 5000) // 5초마다 업데이트

    return () => clearInterval(interval)
  }, [])

  // 네트워크 상태 모니터링
  const [networkStatus, setNetworkStatus] = useState<{
    effectiveType: string
    downlink: number
    rtt: number
  }>({ effectiveType: 'unknown', downlink: 0, rtt: 0 })

  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      setNetworkStatus({
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
      })

      const updateNetworkStatus = () => {
        setNetworkStatus({
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0,
        })
      }

      connection.addEventListener('change', updateNetworkStatus)
      return () => connection.removeEventListener('change', updateNetworkStatus)
    }
  }, [])

  const getConnectionQuality = () => {
    if (!isConnected) return { label: '연결 안됨', variant: 'error' as const }
    if (metrics.connectionTime < 1000)
      return { label: '매우 좋음', variant: 'success' as const }
    if (metrics.connectionTime < 3000)
      return { label: '좋음', variant: 'primary' as const }
    if (metrics.connectionTime < 5000)
      return { label: '보통', variant: 'warning' as const }
    return { label: '느림', variant: 'error' as const }
  }

  const connectionQuality = getConnectionQuality()

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center space-x-2 text-lg font-semibold">
              <Activity className="h-5 w-5" />
              <span>WebSocket 성능 모니터</span>
            </h3>
            <Badge variant={isConnected ? 'success' : 'error'}>
              {isConnected ? '연결됨' : '연결 안됨'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {metrics.connectionTime}ms
              </div>
              <div className="text-sm text-gray-600">연결 시간</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {metrics.subscriptionCount}
              </div>
              <div className="text-sm text-gray-600">활성 구독</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {metrics.messageCount}
              </div>
              <div className="text-sm text-gray-600">메시지 수</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {metrics.errorCount}
              </div>
              <div className="text-sm text-gray-600">에러 수</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* 구독 상태 */}
        <Card>
          <CardContent className="p-4">
            <h4 className="mb-3 flex items-center space-x-2 font-semibold">
              <Zap className="h-4 w-4" />
              <span>구독 상태</span>
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Package className="h-4 w-4" />
                  <span>입찰 정보</span>
                </span>
                <Badge variant={isBidSubscribed ? 'success' : 'neutral'}>
                  {isBidSubscribed ? '구독 중' : '구독 안함'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Home className="h-4 w-4" />
                  <span>홈 데이터</span>
                </span>
                <Badge variant={isHomeSubscribed ? 'success' : 'neutral'}>
                  {isHomeSubscribed ? '구독 중' : '구독 안함'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>내 경매</span>
                </span>
                <Badge variant={isMyAuctionsSubscribed ? 'success' : 'neutral'}>
                  {isMyAuctionsSubscribed ? '구독 중' : '구독 안함'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Bell className="h-4 w-4" />
                  <span>알림</span>
                </span>
                <Badge
                  variant={isNotificationsSubscribed ? 'success' : 'neutral'}
                >
                  {isNotificationsSubscribed ? '구독 중' : '구독 안함'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4" />
                  <span>랭킹</span>
                </span>
                <Badge variant={isRankingsSubscribed ? 'success' : 'neutral'}>
                  {isRankingsSubscribed ? '구독 중' : '구독 안함'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 시스템 리소스 */}
        <Card>
          <CardContent className="p-4">
            <h4 className="mb-3 font-semibold">시스템 리소스</h4>
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>메모리 사용량</span>
                  <span>{memoryUsage.percentage}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className={`h-2 rounded-full ${
                      memoryUsage.percentage > 80
                        ? 'bg-red-500'
                        : memoryUsage.percentage > 60
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${memoryUsage.percentage}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {memoryUsage.used}MB / {memoryUsage.total}MB
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600">네트워크 상태</div>
                <div className="text-xs text-gray-500">
                  타입: {networkStatus.effectiveType} | 다운링크:{' '}
                  {networkStatus.downlink}Mbps | RTT: {networkStatus.rtt}ms
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600">연결 품질</div>
                <Badge variant={connectionQuality.variant} className="mt-1">
                  {connectionQuality.label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <h4 className="mb-3 font-semibold">성능 권장사항</h4>
          <div className="space-y-2 text-sm">
            {metrics.connectionTime > 3000 && (
              <div className="rounded bg-yellow-50 p-2 text-yellow-800">
                ⚠️ 연결 시간이 느립니다. 네트워크 상태를 확인해주세요.
              </div>
            )}
            {memoryUsage.percentage > 80 && (
              <div className="rounded bg-red-50 p-2 text-red-800">
                ⚠️ 메모리 사용량이 높습니다. 페이지를 새로고침하는 것을
                권장합니다.
              </div>
            )}
            {totalSubscriptions > 5 && (
              <div className="rounded bg-blue-50 p-2 text-blue-800">
                ℹ️ 많은 구독이 활성화되어 있습니다. 필요하지 않은 구독을
                해제하세요.
              </div>
            )}
            {isConnected &&
              metrics.connectionTime < 1000 &&
              memoryUsage.percentage < 60 && (
                <div className="rounded bg-green-50 p-2 text-green-800">
                  ✅ 성능 상태가 양호합니다.
                </div>
              )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
