import { HomeClient } from '@/components/features/home/HomeClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { serverApi } from '@/lib/api/server-api-client'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // 임시 통계 데이터 (실제 API가 없으므로)
  const stats = {
    activeAuctions: 567,
    endingToday: 23,
    totalParticipants: 8901,
    successRate: 87.5,
  }

  // 사용자 정보 가져오기
  let isLoggedIn = false
  let user = null
  let notificationCount = 0

  try {
    const userResponse = await serverApi.getMyInfo()
    if (userResponse.success && userResponse.data) {
      isLoggedIn = true
      user = userResponse.data
    }

    // 알림 개수 가져오기
    if (isLoggedIn) {
      const notificationResponse = await serverApi.getUnreadCount()
      if (
        notificationResponse.success &&
        notificationResponse.data !== undefined
      ) {
        notificationCount = notificationResponse.data
      }
    }
  } catch (error) {
    console.log('홈페이지 사용자 정보 조회 실패:', error)
  }

  return (
    <HomeLayout
      isLoggedIn={isLoggedIn}
      user={user}
      notificationCount={notificationCount}
    >
      <HomeClient stats={stats} />
    </HomeLayout>
  )
}
