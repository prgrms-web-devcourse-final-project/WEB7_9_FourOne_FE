import { ProductDetailClient } from '@/components/features/products/ProductDetailClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { serverApi } from '@/lib/api/server-api-client'
import { AuctionDetail } from '@/types'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

interface ProductDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
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
      // API 호출 실패 시 404 페이지로 이동
      notFound()
    }

    // API 응답이 없으면 404
    if (!data) {
      notFound()
    }

    // API 응답을 AuctionDetail 타입에 맞게 매핑
    const mappedProduct: AuctionDetail = {
      auctionId: data.auctionId || null,
      productId: data.productId || productId,
      sellerId: data.sellerId || 0,
      sellerNickname: data.sellerNickname || '',
      name: data.name || '',
      description: data.description || '',
      category: data.category || 'STARGOODS',
      status: (data.status as 'SCHEDULED' | 'LIVE' | 'ENDED') || 'LIVE',
      startPrice: Number(data.startPrice || 0),
      buyNowPrice: Number(data.buyNowPrice || 0),
      minBidStep: Number(data.minBidStep || 0),
      startAt: data.startAt || new Date().toISOString(),
      endAt: data.endAt || new Date().toISOString(),
      createdAt: data.createdAt || new Date().toISOString(),
      currentHighestBid: Number(data.currentHighestBid || 0),
      totalBidCount: Number(data.totalBidCount || 0),
      remainingTimeSeconds: Number(data.remainingTimeSeconds || 0),
      imageUrls: data.imageUrls || data.images || [],
      isBookmarked: data.isBookmarked || false,
    }

    // 입찰 현황은 클라이언트에서 조회
    const bidStatus = null

    return (
      <HomeLayout isLoggedIn={!!accessToken}>
        <PageHeader
          title="상품 상세"
          description="상품 정보를 확인하고 입찰에 참여하세요"
          showBackButton
        />
        <ProductDetailClient
          product={mappedProduct}
          initialBidStatus={bidStatus}
        />
      </HomeLayout>
    )
  } catch (error) {
    console.error('상품 조회 실패:', error)
    notFound()
  }
}
