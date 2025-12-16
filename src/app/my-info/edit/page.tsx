import { MyInfoEditClient } from '@/components/features/user/MyInfoEditClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { serverApi } from '@/lib/api/server-api-client'
import { User } from '@/types'

export default async function MyInfoEditPage() {
  const user = await serverApi.getMyInfo()
  return (
    <HomeLayout isLoggedIn={true} user={user.data as User}>
      <PageHeader
        title="내 정보 수정"
        description="프로필 정보를 수정하세요"
        showBackButton
      />
      <MyInfoEditClient initialProfile={user.data as any} />
    </HomeLayout>
  )
}
