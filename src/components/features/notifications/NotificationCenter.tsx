'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Bell, Check, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
}

interface Notification {
  id: string
  type: string
  message: string
  productId?: number
  isRead: boolean
  createdAt: string
}

export function NotificationCenter({
  isOpen,
  onClose,
}: NotificationCenterProps) {
  const router = useRouter()
  const [notifications] = useState<Notification[]>([])
  const [unreadCount] = useState(0)

  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  // 알림 클릭 핸들러
  const handleNotificationClick = (notification: Notification) => {
    if (notification.productId) {
      router.push(`/products/${notification.productId}`)
      onClose()
    }
  }

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'unread') return !notification.isRead
    return true
  })

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'BID_SUCCESS':
        return '🎯'
      case 'BID_OUTBID':
        return '📈'
      case 'AUCTION_WON':
        return '🏆'
      case 'AUCTION_LOST':
        return '😞'
      case 'AUCTION_START':
        return '🚀'
      case 'AUCTION_ENDING_SOON':
        return '⏰'
      case 'AUCTION_END':
        return '🏁'
      case 'PAYMENT_REMINDER':
        return '💳'
      default:
        return '🔔'
    }
  }

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'BID_SUCCESS':
      case 'AUCTION_WON':
        return 'text-green-600'
      case 'BID_OUTBID':
        return 'text-orange-600'
      case 'AUCTION_LOST':
        return 'text-red-600'
      case 'AUCTION_START':
        return 'text-blue-600'
      case 'AUCTION_ENDING_SOON':
        return 'text-amber-600'
      case 'AUCTION_END':
        return 'text-purple-600'
      case 'PAYMENT_REMINDER':
        return 'text-blue-600'
      default:
        return 'text-neutral-600'
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return '방금 전'
    if (minutes < 60) return `${minutes}분 전`
    if (hours < 24) return `${hours}시간 전`
    return `${days}일 전`
  }

  if (!isOpen) return null

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
      <Card className="max-h-[80vh] w-full max-w-md overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span className="text-lg font-semibold">알림</span>
            {unreadCount > 0 && (
              <Badge variant="error" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {/* 필터 및 액션 버튼 */}
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex space-x-2">
              <Button
                variant={filter === 'all' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                전체
              </Button>
              <Button
                variant={filter === 'unread' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
              >
                읽지 않음
              </Button>
            </div>

            <div className="flex space-x-1"></div>
          </div>

          {/* 알림 목록 */}
          <div className="max-h-96 overflow-y-auto">
            <div className="flex flex-col items-center justify-center py-8 text-neutral-500">
              <Bell className="mb-4 h-12 w-12 opacity-50" />
              <p className="text-sm">알림이 없습니다</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
