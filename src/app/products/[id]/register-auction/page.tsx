import { AuctionRegistrationClient } from '@/components/features/products/AuctionRegistrationClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { serverApi } from '@/lib/api/server-api-client'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

interface RegisterAuctionPageProps {
  params: Promise<{ id: string }>
}

export default async function RegisterAuctionPage({
  params,
}: RegisterAuctionPageProps) {
  try {
    const { id } = await params
    const productId = parseInt(id)

    if (isNaN(productId)) {
      notFound()
    }

    // 쿠키에서 토큰 가져오기
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('accessToken')?.value

    if (!accessToken) {
      notFound()
    }

    // 서버 API로 상품 정보 가져오기
    const response = await serverApi.getProduct(productId)

    if (!response.success || !response.data) {
      notFound()
    }

    const data = response.data as any
    const productName = data.name || '상품명 없음'

    return (
      <HomeLayout isLoggedIn={!!accessToken}>
        <PageHeader
          title="경매 등록"
          description="상품에 경매를 등록하세요"
          showBackButton
        />
        <AuctionRegistrationClient
          productId={productId}
          productName={productName}
        />
      </HomeLayout>
    )
  } catch (error) {
    console.error('경매 등록 페이지 로드 실패:', error)
    notFound()
  }
}
