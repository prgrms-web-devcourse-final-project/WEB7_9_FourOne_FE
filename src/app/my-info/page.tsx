import { MyInfoClient } from '@/components/features/user/MyInfoClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { serverApi } from '@/lib/api/server-api-client'
import { User } from '@/types'

export const dynamic = 'force-dynamic'

export default async function MyInfoPage() {
  try {
    const response = await serverApi.getMyInfo()
    if (!response.success || !response.data) {
      return (
        <HomeLayout isLoggedIn={true}>
          <PageHeader
            title="내 정보"
            description="프로필 정보와 활동 내역을 확인하세요"
            showBackButton
          />
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="mb-4 text-2xl font-bold text-neutral-900">
                데이터를 불러올 수 없습니다
              </h1>
              <p className="text-neutral-600">잠시 후 다시 시도해주세요.</p>
            </div>
          </div>
        </HomeLayout>
      )
    }

    const userInfo = response.data
    console.log('🔍 userInfo', userInfo)

    const notificationCount = 0

    return (
      <HomeLayout
        isLoggedIn={true}
        user={userInfo as User}
        notificationCount={notificationCount}
      >
        <PageHeader
          title="내 정보"
          description="프로필 정보와 활동 내역을 확인하세요"
          showBackButton
        />
        <MyInfoClient user={userInfo} />
      </HomeLayout>
    )
  } catch (error: any) {
    console.error('MyInfo 페이지 에러:', error)

    return (
      <HomeLayout isLoggedIn={true}>
        <PageHeader
          title="내 정보"
          description="프로필 정보와 활동 내역을 확인하세요"
          showBackButton
        />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold text-neutral-900">
              데이터를 불러올 수 없습니다
            </h1>
            <p className="text-neutral-600">잠시 후 다시 시도해주세요.</p>
          </div>
        </div>
      </HomeLayout>
    )
  }
}
