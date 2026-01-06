import { LoginPrompt } from '@/components/auth/LoginPrompt'
import { PaymentMethodClient } from '@/components/features/payment/PaymentMethodClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function WalletPage() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value

  if (!accessToken) {
    return (
      <HomeLayout>
        <PageHeader
          title="결제 수단 관리"
          description="등록된 카드와 결제 수단을 관리하세요"
          showBackButton
        />
        <LoginPrompt
          title="결제 수단 관리"
          description="결제 수단을 관리하려면 로그인해주세요."
        />
      </HomeLayout>
    )
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
