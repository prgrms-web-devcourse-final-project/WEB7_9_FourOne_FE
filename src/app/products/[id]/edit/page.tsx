import { ProductEditClient } from '@/components/features/products/ProductEditClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { serverApi } from '@/lib/api/server-api-client'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

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

    // 토큰이 없어도 페이지는 렌더링하고, 클라이언트에서 처리하도록 함

    // 서버 API로 상품 정보 가져오기
    const response = await serverApi.getProduct(productId)

    if (!response.success || !response.data) {
      notFound()
    }

    // API 응답을 컴포넌트에서 사용하는 형식으로 매핑
    const data = response.data as any
    const mappedProduct = {
      productId: data.productId || productId,
      name: data.name || '상품명 없음',
      description: data.description || '상품 설명이 없습니다.',
      category: data.category || '기타',
      images: data.images || [],
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
      auctionEndTime:
        data.auctionEndTime ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 후
      bidderCount: Number(data.bidderCount || 0),
      deliveryMethod: data.deliveryMethod || '직접거래',
      auctionStartTime: data.auctionStartTime,
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
