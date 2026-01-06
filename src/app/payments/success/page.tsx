import { PaymentSuccessPage } from '@/components/features/payment/PaymentSuccessPage'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'

export const dynamic = 'force-dynamic'

export default function PaymentSuccessRoute() {
  return (
    <HomeLayout>
      <PageHeader
        title="결제 처리 중"
        description="결제 상태를 확인하고 있습니다"
        showBackButton={false}
      />
      <PaymentSuccessPage />
    </HomeLayout>
  )
}
