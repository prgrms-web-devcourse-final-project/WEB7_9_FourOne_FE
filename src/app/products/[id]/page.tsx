import { ProductDetailClient } from '@/components/features/products/ProductDetailClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { serverApi } from '@/lib/api/server-api-client'
import { Product } from '@/types'
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

    // 서버 API로 상품 정보 가져오기
    const response = await serverApi.getProduct(productId)

    if (!response.success || !response.data) {
      notFound()
    }

    // 해당 상품의 입찰 현황 가져오기
    let bidStatus = null
    try {
      const bidResponse = await serverApi.getBidStatus(productId)
      if (bidResponse.success && bidResponse.data) {
        bidStatus = bidResponse.data
        console.log('📊 서버에서 가져온 입찰 현황:', bidStatus)
      }
    } catch (error) {
      console.log('⚠️ 입찰 현황 조회 실패:', error)
      // 입찰 현황 조회 실패 시 무시
    }

    // API 응답을 컴포넌트에서 사용하는 형식으로 매핑
    const data = response.data as any
    console.log('📦 서버에서 가져온 상품 데이터:', data)

    const mappedProduct = {
      productId: data.productId || productId,
      name: data.name || '상품명 없음',
      description: data.description || '상품 설명이 없습니다.',
      category: data.category || '기타',
      images: data.images
        ? data.images.map((img: any) =>
            typeof img === 'string' ? img : img.imageUrl || img.url || img,
          )
        : [],
      initialPrice: Number(data.initialPrice || 0),
      currentPrice: Number(data.currentPrice || data.initialPrice || 0),
      seller: {
        id: data.seller?.id || '1',
        email: data.seller?.email || '',
        nickname: data.seller?.nickname || '판매자',
        profileImage: data.seller?.profileImage || null,
        creditScore: Number(data.seller?.creditScore || 0),
        reviewCount: Number(data.seller?.reviewCount || 0),
      },
      status: data.status || '경매 중',
      location: data.location || data.seller?.location || '위치 정보 없음',
      createDate: data.createDate || new Date().toISOString(),
      modifyDate: data.modifyDate || new Date().toISOString(),
      auctionStartTime: data.auctionStartTime,
      auctionEndTime:
        data.auctionEndTime ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 후
      bidderCount: Number(data.bidderCount || 0),
      deliveryMethod: data.deliveryMethod || '직접거래',
      thumbnailUrl: data.thumbnailUrl || '',
    }

    return (
      <HomeLayout isLoggedIn={!!accessToken}>
        <PageHeader
          title="상품 상세"
          description="상품 정보를 확인하고 입찰에 참여하세요"
          showBackButton
        />
        <ProductDetailClient
          product={mappedProduct as Product}
          initialBidStatus={bidStatus}
        />
      </HomeLayout>
    )
  } catch (error) {
    console.error('상품 조회 실패:', error)
    notFound()
  }
}
