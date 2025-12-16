'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { useState } from 'react'

export function WebSocketDebug() {
  const { isConnected, connect, disconnect, sendMessage } = useWebSocket()
  const [testMessage, setTestMessage] = useState('')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)])
  }

  const testConnection = () => {
    addLog('연결 테스트 시작...')
    connect()
  }

  const testMessageSend = () => {
    if (!testMessage.trim()) return

    addLog(`메시지 전송: ${testMessage}`)
    sendMessage('/app/test', {
      type: 'TEST',
      content: testMessage,
      timestamp: new Date().toISOString(),
    })
    setTestMessage('')
  }

  const testSubscription = () => {
    addLog('구독 테스트 시작...')
    // 테스트용 구독 (중복 방지)
    const { subscribe, unsubscribe } = useWebSocket()

    // 기존 테스트 구독이 있다면 해제
    const existingTestSubscriptions = Array.from(
      document.querySelectorAll('[data-test-subscription]'),
    )
    existingTestSubscriptions.forEach(() => {
      // 테스트 구독 해제 로직
    })

    const subscriptionId = subscribe('/topic/test', (message) => {
      addLog(`테스트 메시지 수신: ${JSON.stringify(message)}`)
    })
    addLog(`구독 ID: ${subscriptionId}`)
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <h3 className="text-lg font-semibold">WebSocket 디버그 도구</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 연결 상태 */}
        <div className="flex items-center space-x-4">
          <div
            className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span>상태: {isConnected ? '연결됨' : '연결 끊김'}</span>
        </div>

        {/* 컨트롤 버튼들 */}
        <div className="flex space-x-2">
          <Button onClick={testConnection} disabled={isConnected}>
            연결 테스트
          </Button>
          <Button onClick={disconnect} disabled={!isConnected}>
            연결 해제
          </Button>
          <Button onClick={testSubscription} disabled={!isConnected}>
            구독 테스트
          </Button>
        </div>

        {/* 메시지 전송 테스트 */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="테스트 메시지 입력"
            className="flex-1 rounded-md border px-3 py-2"
          />
          <Button
            onClick={testMessageSend}
            disabled={!isConnected || !testMessage.trim()}
          >
            전송
          </Button>
        </div>

        {/* 로그 */}
        <div className="space-y-2">
          <h4 className="font-medium">디버그 로그:</h4>
          <div className="max-h-40 overflow-y-auto rounded-md bg-gray-100 p-3">
            {logs.length === 0 ? (
              <p className="text-sm text-gray-500">로그가 없습니다</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="font-mono text-sm">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 백엔드 연결 정보 */}
        <div className="text-sm text-gray-600">
          <p>
            <strong>WebSocket 엔드포인트:</strong> /ws
          </p>
          <p>
            <strong>구독 경로:</strong> /topic/bid/{'{productId}'}
          </p>
          <p>
            <strong>개인 알림:</strong> /user/queue/notifications
          </p>
          <p>
            <strong>메시지 전송:</strong> /app/{'{destination}'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
