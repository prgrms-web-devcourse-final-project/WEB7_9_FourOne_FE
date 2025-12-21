import { WalletClient } from '@/components/features/wallet/WalletClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function WalletPage() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value
  const isLoggedIn = !!accessToken

  try {
    return (
      <HomeLayout isLoggedIn={isLoggedIn}>
        <PageHeader
          title="결제 관리"
          description="내 결제 수단과 거래 내역을 확인하세요"
          showBackButton
        />
        <WalletClient />
      </HomeLayout>
    )
  } catch (error: any) {
    console.error('Wallet 페이지 에러:', error)

    return (
      <HomeLayout isLoggedIn={isLoggedIn}>
        <PageHeader
          title="지갑"
          description="내 결제 수단과 거래 내역을 확인하세요"
          showBackButton
        />
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold text-neutral-900">
              페이지를 불러올 수 없습니다
            </h1>
            <p className="text-neutral-600">잠시 후 다시 시도해주세요.</p>
          </div>
        </div>
      </HomeLayout>
    )
  }
}
