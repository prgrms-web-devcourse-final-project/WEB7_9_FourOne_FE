import { PaymentMethodClient } from '@/components/features/payment/PaymentMethodClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function WalletPage() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value

  if (!accessToken) {
    redirect('/login')
  }

  return (
    <HomeLayout isLoggedIn={true}>
      <PageHeader
        title="결제 수단 관리"
        description="등록된 카드와 결제 수단을 관리하세요"
        showBackButton
      />
      <PaymentMethodClient />
    </HomeLayout>
  )
}
