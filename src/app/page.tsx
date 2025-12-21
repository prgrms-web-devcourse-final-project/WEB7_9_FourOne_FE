import { HomeClient } from '@/components/features/home/HomeClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value
  const isLoggedIn = !!accessToken

  return (
    <HomeLayout isLoggedIn={isLoggedIn} user={null} notificationCount={0}>
      <HomeClient />
    </HomeLayout>
  )
}
