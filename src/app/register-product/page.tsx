import { ProductRegistrationClient } from '@/components/features/products/ProductRegistrationClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'

export default function ProductRegistrationPage() {
  return (
    <HomeLayout isLoggedIn={true}>
      <PageHeader
        title="상품 등록"
        description="경매에 올릴 상품 정보를 입력해주세요"
        showBackButton
      />
      <ProductRegistrationClient />
    </HomeLayout>
  )
}
