import { PaymentFailClient } from '@/components/features/payment/PaymentFailClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'

export const dynamic = 'force-dynamic'

export default function PaymentFailPage() {
  return (
    <HomeLayout>
      <PageHeader
        title="결제 실패"
        description="결제가 실패했습니다"
        showBackButton
      />
      <PaymentFailClient />
    </HomeLayout>
  )
}
