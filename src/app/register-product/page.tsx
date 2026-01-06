import { LoginPrompt } from '@/components/auth/LoginPrompt'
import { ProductRegistrationClient } from '@/components/features/products/ProductRegistrationClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function ProductRegistrationPage() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value
  const isLoggedIn = !!accessToken

  if (!accessToken) {
    return (
      <HomeLayout>
        <PageHeader
          title="상품 등록"
          description="경매에 올릴 상품 정보를 입력해주세요"
          showBackButton
        />
        <LoginPrompt
          title="상품 등록"
          description="상품을 등록하려면 로그인해주세요."
        />
      </HomeLayout>
    )
  }

  return (
    <HomeLayout isLoggedIn={isLoggedIn}>
      <PageHeader
        title="상품 등록"
        description="경매에 올릴 상품 정보를 입력해주세요"
        showBackButton
      />
      <ProductRegistrationClient />
    </HomeLayout>
  )
}
