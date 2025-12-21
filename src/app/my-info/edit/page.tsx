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

  const user = await serverApi.getMyInfo()
  return (
    <HomeLayout isLoggedIn={isLoggedIn} user={user.data as User}>
      <PageHeader
        title="내 정보 수정"
        description="프로필 정보를 수정하세요"
        showBackButton
      />
      <MyInfoEditClient initialProfile={user.data as any} />
    </HomeLayout>
  )
}
