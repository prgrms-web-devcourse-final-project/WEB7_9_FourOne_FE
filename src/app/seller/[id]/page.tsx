import { SellerDetailClient } from '@/components/features/seller/SellerDetailClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { serverApi } from '@/lib/api/server-api-client'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

interface SellerDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function SellerDetailPage({
  params,
}: SellerDetailPageProps) {
  try {
    const { id } = await params
    const sellerId = parseInt(id)

    if (isNaN(sellerId)) {
      notFound()
    }

    // 쿠키에서 토큰 가져오기
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('accessToken')?.value

    // 서버 API로 판매자 정보 가져오기
    const response = await serverApi.getProducts({ page: 1, size: 100 })

    if (!response.success || !response.data) {
      notFound()
    }

    // API 응답 데이터 파싱
    const data = response.data as any
    let allProducts = []
    if (Array.isArray(data)) {
      allProducts = data
    } else if (data.content && Array.isArray(data.content)) {
      allProducts = data.content
    } else if (data.products && Array.isArray(data.products)) {
      allProducts = data.products
    }

    // 해당 판매자의 상품들 필터링
    const sellerProducts = allProducts.filter((product: any) => {
      const productSellerId = product.seller?.id || product.sellerId
      return (
        productSellerId === sellerId || productSellerId === String(sellerId)
      )
    })

    // 상품 데이터를 Product 타입으로 매핑
    const mappedProducts = sellerProducts.map((product: any) => ({
      productId: product.productId,
      name: product.name,
      description: product.description || '',
      category: product.category,
      initialPrice: product.initialPrice,
      currentPrice: product.currentPrice,
      auctionEndTime: product.auctionEndTime,
      status: product.status || '경매 중',
      images: product.thumbnailUrl
        ? [product.thumbnailUrl]
        : product.images || [],
      thumbnailUrl: product.thumbnailUrl || '',
      seller: {
        id: String(product.seller?.id || '1'),
        nickname: product.seller?.nickname || '판매자',
        profileImage:
          product.seller?.profileImageUrl || product.seller?.profileImage,
        creditScore: product.seller?.creditScore || 0,
        reviewCount: product.seller?.reviewCount || 0,
      },
      location: product.location || '',
      createDate: product.createDate || '',
      modifyDate: product.modifyDate || '',
      bidderCount: product.bidderCount,
    }))

    const sellerInfo = sellerProducts[0]?.seller
      ? {
          id: String(sellerProducts[0].seller.id || sellerId),
          nickname: sellerProducts[0].seller.nickname || '판매자',
          profileImage:
            sellerProducts[0].seller.profileImageUrl ||
            sellerProducts[0].seller.profileImage ||
            null,
          creditScore:
            sellerProducts[0].seller.creditScore ||
            sellerProducts[0].seller.creditScore ||
            75, // 기본 신뢰도 점수
          reviewCount: sellerProducts[0].seller.reviewCount || 0,
        }
      : {
          id: String(sellerId),
          nickname: '판매자',
          profileImage: null,
          creditScore: 0,
          reviewCount: 0,
        }

    return (
      <HomeLayout isLoggedIn={!!accessToken}>
        <PageHeader
          title="판매자 정보"
          description="판매자의 상세 정보와 판매 상품을 확인하세요"
          showBackButton
        />
        <SellerDetailClient seller={sellerInfo} products={mappedProducts} />
      </HomeLayout>
    )
  } catch (error) {
    console.error('판매자 정보 조회 실패:', error)
    notFound()
  }
}
