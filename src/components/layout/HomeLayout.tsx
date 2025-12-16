// import { MyBidNotifications } from '@/components/features/notifications/MyBidNotifications'
import { WebSocketStatus } from '@/contexts/WebSocketContext'
import { User } from '@/types'
import { ReactNode } from 'react'
import { BottomNavigation } from './BottomNavigation'
import { Header } from './Header'

interface HomeLayoutProps {
  children: ReactNode
  isLoggedIn?: boolean
  user?: User
  notificationCount?: number
}

export function HomeLayout({
  children,
  isLoggedIn = false,
  user,
  notificationCount = 0,
}: HomeLayoutProps) {
  return (
    <div className="bg-background-secondary min-h-screen">
      <Header
        isLoggedIn={isLoggedIn}
        user={user}
        notificationCount={notificationCount}
      />

      <main className="pb-16 md:pb-0">{children}</main>

      <BottomNavigation notificationCount={notificationCount} />

      {/* WebSocket 연결 상태 표시 */}
      <WebSocketStatus />

      {/* 내 입찰 실시간 알림 - 비활성화 */}
      {/* {isLoggedIn && <MyBidNotifications />} */}
    </div>
  )
}
