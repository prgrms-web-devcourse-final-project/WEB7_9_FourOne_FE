import { LoginPrompt } from '@/components/auth/LoginPrompt'
import { MyInfoClient } from '@/components/features/user/MyInfoClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { serverApi } from '@/lib/api/server-api-client'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function MyInfoPage() {
  // 쿠키에서 토큰 확인
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value

  if (!accessToken) {
    return (
      <HomeLayout>
        <PageHeader
          title="내 정보"
          description="프로필 정보와 활동 내역을 확인하세요"
          showBackButton
        />
        <LoginPrompt
          title="내 정보"
          description="내 정보를 확인하려면 로그인해주세요."
        />
      </HomeLayout>
    )
  }

  // 서버 API로 사용자 정보 가져오기
  let userInfo = null
  try {
    const response = await serverApi.getMyInfo()
    if (response.success && response.data) {
      userInfo = response.data
    }
  } catch (error) {
    console.error('사용자 정보 조회 실패:', error)
    // 에러가 발생해도 빈 객체로 전달하여 클라이언트에서 재시도 가능하도록 함
  }

  return (
    <HomeLayout isLoggedIn={!!accessToken}>
      <PageHeader
        title="내 정보"
        description="프로필 정보와 활동 내역을 확인하세요"
        showBackButton
      />
      <MyInfoClient user={userInfo || {}} />
    </HomeLayout>
  )
}
