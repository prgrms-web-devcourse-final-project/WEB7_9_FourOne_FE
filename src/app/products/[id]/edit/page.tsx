import { ProductEditClient } from '@/components/features/products/ProductEditClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
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

    // 토큰이 없어도 페이지는 렌더링하고, 클라이언트에서 처리하도록 함

    // ⚠️ 임시 데이터 사용 중: API가 준비되면 아래 주석을 해제하고 사용
    // const response = await serverApi.getProduct(productId)
    // const data = response?.data || null
    const data: any = null // API 미구현으로 임시 데이터 사용

    // API 응답을 컴포넌트에서 사용하는 형식으로 매핑

    // 임시 데이터 (API 응답이 부족할 경우 사용)
    const tempProduct = {
      productId: data?.productId || productId,
      name: data?.name || '한정판 피규어 A',
      description:
        data?.description ||
        '상태가 매우 좋은 한정판 피규어입니다. 원박스 보관으로 상태가 완벽합니다.',
      category: data?.category || 'STARGOODS',
      subCategory: data?.subCategory || 'ACC',
      images: data?.images
        ? data.images.map((img: any) =>
            typeof img === 'string' ? img : img.imageUrl || img.url || img,
          )
        : [
            'https://images.unsplash.com/photo-1766086892325-74a61d0465f6?q=80&w=2938&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
          ],
      initialPrice: Number(data?.initialPrice || 50000),
      currentPrice: Number(data?.currentPrice || data?.initialPrice || 51000),
      seller: {
        id: data?.seller?.id || '1',
        nickname: data?.seller?.nickname || '판매왕 킴',
        profileImage: data?.seller?.profileImage || '',
        creditScore: Number(data?.seller?.creditScore || 95),
        reviewCount: Number(data?.seller?.reviewCount || 127),
      },
      status: data?.status || '경매 시작 전',
      location: data?.location || data?.seller?.location || '서울시 강남구',
      createDate:
        data?.createDate ||
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2일 전
      modifyDate: data?.modifyDate || new Date().toISOString(),
      auctionEndTime:
        data?.auctionEndTime ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 후
      bidderCount: Number(data?.bidderCount || 0),
      deliveryMethod: data?.deliveryMethod || 'BOTH',
      auctionStartTime: data?.auctionStartTime || null,
      thumbnailUrl:
        data?.thumbnailUrl ||
        'https://images.unsplash.com/photo-1766086892325-74a61d0465f6?q=80&w=2938&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    }

    // API 응답이 있으면 우선 사용, 없으면 임시 데이터 사용
    const mappedProduct = {
      productId: data?.productId || tempProduct.productId,
      name: data?.name || tempProduct.name,
      description: data?.description || tempProduct.description,
      category: data?.category || tempProduct.category,
      subCategory: data?.subCategory || tempProduct.subCategory,
      images: data?.images
        ? data.images.map((img: any) =>
            typeof img === 'string' ? img : img.imageUrl || img.url || img,
          )
        : tempProduct.images,
      initialPrice: Number(data?.initialPrice || tempProduct.initialPrice),
      currentPrice: Number(
        data?.currentPrice || data?.initialPrice || tempProduct.currentPrice,
      ),
      seller: {
        id: data?.seller?.id || tempProduct.seller.id,
        nickname: data?.seller?.nickname || tempProduct.seller.nickname,
        profileImage:
          data?.seller?.profileImage || tempProduct.seller.profileImage,
        creditScore: Number(
          data?.seller?.creditScore || tempProduct.seller.creditScore,
        ),
        reviewCount: Number(
          data?.seller?.reviewCount || tempProduct.seller.reviewCount,
        ),
      },
      status: data?.status || tempProduct.status,
      location:
        data?.location || data?.seller?.location || tempProduct.location,
      createDate: data?.createDate || tempProduct.createDate,
      modifyDate: data?.modifyDate || tempProduct.modifyDate,
      auctionEndTime: data?.auctionEndTime || tempProduct.auctionEndTime,
      bidderCount: Number(data?.bidderCount || tempProduct.bidderCount),
      deliveryMethod: data?.deliveryMethod || tempProduct.deliveryMethod,
      auctionStartTime: data?.auctionStartTime || tempProduct.auctionStartTime,
      thumbnailUrl: data?.thumbnailUrl || tempProduct.thumbnailUrl,
    }

    return (
      <HomeLayout isLoggedIn={!!accessToken}>
        <PageHeader
          title="상품 수정"
          description="상품 정보를 수정하세요"
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
                  현재 상품 조회 API가 완전하지 않아 일부 데이터는 임시로 채워진
                  값입니다.
                </p>
              </div>
            </div>
          </div>
        </div>
        <ProductEditClient product={mappedProduct as any} />
      </HomeLayout>
    )
  } catch (error) {
    console.error('상품 수정 페이지 로드 실패:', error)
    notFound()
  }
}
