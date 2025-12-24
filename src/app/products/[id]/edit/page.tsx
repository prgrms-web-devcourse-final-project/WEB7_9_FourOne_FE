import { ProductEditClient } from '@/components/features/products/ProductEditClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { serverApi } from '@/lib/api/server-api-client'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

interface ProductEditPageProps {
  params: Promise<{ id: string }>
}

export default async function ProductEditPage({
  params,
}: ProductEditPageProps) {
  try {
    const { id } = await params
    const productId = parseInt(id)

    if (isNaN(productId)) {
      notFound()
    }

    // 쿠키에서 토큰 가져오기
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('accessToken')?.value

    // 실제 API 호출
    let data: any = null
    try {
      const response = await serverApi.getProduct(productId)
      if (response.success && response.data) {
        data = response.data
      }
    } catch (error) {
      console.error('상품 조회 실패:', error)
      // API 호출 실패 시에도 페이지는 렌더링 (클라이언트에서 처리)
    }

    // API 응답을 컴포넌트에서 사용하는 형식으로 매핑
    if (!data) {
      notFound()
    }

    // API 응답 데이터 매핑
    const mappedProduct = {
      productId: data.productId || productId,
      name: data.name || '',
      description: data.description || '',
      category: data.category || 'STARGOODS',
      subCategory: data.subCategory || 'ACC',
      images: data.images
        ? data.images.map((img: any) =>
            typeof img === 'string' ? img : img.imageUrl || img.url || img,
          )
        : data.imageUrls || [],
      initialPrice: Number(data.initialPrice || data.startPrice || 0),
      currentPrice: Number(
        data.currentPrice || data.currentHighestBid || data.startPrice || 0,
      ),
      seller: {
        id: data.sellerId || data.seller?.id || '',
        nickname: data.sellerNickname || data.seller?.nickname || '',
        profileImage: data.seller?.profileImage || '',
        creditScore: Number(data.seller?.creditScore || 0),
        reviewCount: Number(data.seller?.reviewCount || 0),
      },
      status: data.status || '경매 시작 전',
      location: data.location || data.seller?.location || '',
      createDate: data.createdAt || data.createDate || new Date().toISOString(),
      modifyDate: data.updatedAt || data.modifyDate || new Date().toISOString(),
      auctionEndTime: data.endAt || data.auctionEndTime || null,
      bidderCount: Number(data.bidderCount || data.totalBidCount || 0),
      deliveryMethod: data.deliveryMethod || 'BOTH',
      auctionStartTime: data.startAt || data.auctionStartTime || null,
      thumbnailUrl: data.thumbnailUrl || data.imageUrls?.[0] || '',
    }

    return (
      <HomeLayout isLoggedIn={!!accessToken}>
        <PageHeader
          title="상품 수정"
          description="상품 정보를 수정하세요"
          showBackButton
        />
        <ProductEditClient product={mappedProduct as any} />
      </HomeLayout>
    )
  } catch (error) {
    console.error('상품 수정 페이지 로드 실패:', error)
    notFound()
  }
}
