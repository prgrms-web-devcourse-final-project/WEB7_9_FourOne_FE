import { ProductDetailBasicClient } from '@/components/features/products/ProductDetailBasicClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { serverApi } from '@/lib/api/server-api-client'
import { AuctionDetail } from '@/types'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const productId = parseInt(id)

  if (isNaN(productId)) {
    // 잘못된 ID는 404 처리
    notFound()
  }

  // 쿠키에서 토큰 가져오기
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value

  // 실제 API 호출
  let data: any = null
  let needsLogin = false

  try {
    const response = await serverApi.getProduct(productId)

    if (response.success && response.data) {
      data = response.data
    } else if (
      response.resultCode === 'USER_UNAUTHORIZED' ||
      response.resultCode === '401'
    ) {
      // 401 에러 - 로그인이 필요한 경우
      needsLogin = true
      console.warn('상품 조회에 인증 필요')
    }
  } catch (error) {
    console.error('상품 조회 중 예외 발생:', error)
  }

  // Swagger ProductSearchResponse 기준 매핑 (데이터 없으면 기본값 적용)
  const mappedProduct = {
    productId: data?.productId || productId,
    sellerId: data?.sellerId || 0,
    name: data?.name || (needsLogin ? '로그인이 필요합니다' : '상품 정보 없음'),
    description:
      data?.description ||
      (needsLogin ? '상품 정보를 보려면 로그인해주세요.' : ''),
    images: data?.images || data?.imageUrls || [],
    category: data?.category || 'STARGOODS',
    subCategory: data?.subCategory || undefined,
    createdAt: data?.createdAt || undefined,
    updatedAt: data?.updatedAt || undefined,
    bookmarkCount: data?.bookmarkCount || 0,
  }

  return (
    <HomeLayout isLoggedIn={!!accessToken}>
      <PageHeader
        title="상품 상세"
        description="상품 정보를 확인하고 입찰에 참여하세요"
        showBackButton
      />
      <ProductDetailBasicClient product={mappedProduct} />
    </HomeLayout>
  )
}
