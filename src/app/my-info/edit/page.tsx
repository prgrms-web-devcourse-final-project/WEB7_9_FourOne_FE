import { MyInfoEditClient } from '@/components/features/user/MyInfoEditClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { serverApi } from '@/lib/api/server-api-client'
import { User } from '@/types'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function MyInfoEditPage() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value
  const isLoggedIn = !!accessToken

  if (!accessToken) {
    return (
      <HomeLayout isLoggedIn={false}>
        <PageHeader
          title="내 정보 수정"
          description="프로필 정보를 수정하세요"
          showBackButton
        />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold text-neutral-900">
              로그인이 필요합니다
            </h1>
            <p className="text-neutral-600">로그인 후 이용해주세요.</p>
          </div>
        </div>
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
    <HomeLayout isLoggedIn={isLoggedIn} user={userInfo as User}>
      <PageHeader
        title="내 정보 수정"
        description="프로필 정보를 수정하세요"
        showBackButton
      />
      <MyInfoEditClient initialProfile={userInfo as any} />
    </HomeLayout>
  )
}
