import { LoginPrompt } from '@/components/auth/LoginPrompt'
import { PaymentMethodsPage } from '@/components/features/payment/PaymentMethodsPage'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function PaymentMethodsRoute() {
  try {
    // 쿠키에서 토큰 가져오기
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('accessToken')?.value

    if (!accessToken) {
      return (
        <HomeLayout>
          <PageHeader
            title="결제 수단 관리"
            description="등록된 결제 수단을 관리하세요"
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
      <HomeLayout isLoggedIn={!!accessToken}>
        <PageHeader
          title="결제 수단 관리"
          description="등록된 결제 수단을 관리하세요"
          showBackButton
        />
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <PaymentMethodsPage />
        </div>
      </HomeLayout>
    )
  } catch (error: any) {
    console.error('PaymentMethods 페이지 에러:', error)

    const cookieStore = await cookies()
    const accessToken = cookieStore.get('accessToken')?.value

    return (
      <HomeLayout isLoggedIn={!!accessToken}>
        <PageHeader
          title="결제 수단 관리"
          description="등록된 결제 수단을 관리하세요"
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
