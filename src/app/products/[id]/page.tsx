import { ProductDetailClient } from '@/components/features/products/ProductDetailClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
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

    // ⚠️ 임시 데이터 사용 중: API가 준비되면 아래 주석을 해제하고 사용
    // const response = await serverApi.getProduct(productId)
    // const data = response?.data || null
    const data: any = null // API 미구현으로 임시 데이터 사용

    // ⚠️ 입찰 현황도 임시로 null 사용
    const bidStatus = null

    // API 응답을 컴포넌트에서 사용하는 형식으로 매핑
    console.log('📦 서버에서 가져온 상품 데이터:', data)

    // 임시 데이터 (API 응답이 부족할 경우 사용) - 새로운 구조에 맞게
    const tempProduct: AuctionDetail = {
      auctionId: data?.auctionId || 12345,
      productId: data?.productId || productId,
      sellerId: data?.sellerId || 101,
      sellerNickname: data?.sellerNickname || '판매왕 킴',
      name: data?.name || '한정판 피규어 A',
      description:
        data?.description ||
        '상태가 매우 좋은 한정판 피규어입니다. 원박스 보관으로 상태가 완벽합니다.',
      category: data?.category || '의류',
      status: (data?.status as 'SCHEDULED' | 'LIVE' | 'ENDED') || 'LIVE',
      startPrice: Number(data?.startPrice || 50000),
      buyNowPrice: Number(data?.buyNowPrice || 100000),
      minBidStep: Number(data?.minBidStep || 1000),
      startAt:
        data?.startAt ||
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1일 전
      endAt:
        data?.endAt ||
        new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1일 후
      createdAt:
        data?.createdAt ||
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2일 전
      currentHighestBid: Number(data?.currentHighestBid || 51000),
      totalBidCount: Number(data?.totalBidCount || 12),
      remainingTimeSeconds: Number(data?.remainingTimeSeconds || 3600),
      imageUrls: data?.imageUrls || [
        'https://images.unsplash.com/photo-1766086892325-74a61d0465f6?q=80&w=2938&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=1000&auto=format&fit=crop&ixlib=rb-4.1.0',
      ],
      isBookmarked: data?.isBookmarked || false,
    }

    // API 응답이 있으면 우선 사용, 없으면 임시 데이터 사용
    const mappedProduct: AuctionDetail = {
      auctionId: data?.auctionId || tempProduct.auctionId,
      productId: data?.productId || tempProduct.productId,
      sellerId: data?.sellerId || tempProduct.sellerId,
      sellerNickname: data?.sellerNickname || tempProduct.sellerNickname,
      name: data?.name || tempProduct.name,
      description: data?.description || tempProduct.description,
      category: data?.category || tempProduct.category,
      status:
        (data?.status as 'SCHEDULED' | 'LIVE' | 'ENDED') || tempProduct.status,
      startPrice: Number(data?.startPrice || tempProduct.startPrice),
      buyNowPrice: Number(data?.buyNowPrice || tempProduct.buyNowPrice),
      minBidStep: Number(data?.minBidStep || tempProduct.minBidStep),
      startAt: data?.startAt || tempProduct.startAt,
      endAt: data?.endAt || tempProduct.endAt,
      createdAt: data?.createdAt || tempProduct.createdAt,
      currentHighestBid: Number(
        data?.currentHighestBid || tempProduct.currentHighestBid,
      ),
      totalBidCount: Number(data?.totalBidCount || tempProduct.totalBidCount),
      remainingTimeSeconds: Number(
        data?.remainingTimeSeconds || tempProduct.remainingTimeSeconds,
      ),
      imageUrls: data?.imageUrls || tempProduct.imageUrls,
      isBookmarked:
        data?.isBookmarked !== undefined
          ? data.isBookmarked
          : tempProduct.isBookmarked,
    }

    return (
      <HomeLayout isLoggedIn={!!accessToken}>
        <PageHeader
          title="상품 상세"
          description="상품 정보를 확인하고 입찰에 참여하세요"
          showBackButton
        />
        {/* 임시 데이터 배너 */}
        <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
          <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3">
            <div className="flex">
              <div className="shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-800">
                  ⚠️ 임시 데이터 표시 중
                </p>
                <p className="mt-1 text-sm text-yellow-700">
                  현재 상품 상세 조회 API가 완전하지 않아 일부 데이터는 임시로
                  채워진 값입니다.
                </p>
              </div>
            </div>
          </div>
        </div>
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
