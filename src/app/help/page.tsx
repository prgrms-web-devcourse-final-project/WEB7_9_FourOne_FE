import { HelpClient } from '@/components/features/help/HelpClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function HelpPage() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value
  const isLoggedIn = !!accessToken

  return (
    <HomeLayout isLoggedIn={isLoggedIn}>
      <PageHeader
        title="이용 가이드"
        description="서비스 이용 안내"
        showBackButton
      />
      <HelpClient />
    </HomeLayout>
  )
}
