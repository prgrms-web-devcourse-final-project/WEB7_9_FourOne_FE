import { ReviewClient } from '@/components/features/reviews/ReviewClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

interface ReviewPageProps {
  searchParams: {
    productId?: string
  }
}

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  try {
    // searchParams await 처리
    const params = await searchParams

    // 쿠키에서 토큰 가져오기
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('accessToken')?.value

    if (!accessToken) {
      return (
        <HomeLayout>
          <PageHeader
            title="리뷰 작성"
            description="상품에 대한 리뷰를 작성해주세요"
            showBackButton
          />
          <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="mb-4 text-2xl font-bold text-neutral-900">
                로그인이 필요합니다
              </h1>
              <p className="text-neutral-600">
                리뷰를 작성하려면 로그인해주세요.
              </p>
            </div>
          </div>
        </HomeLayout>
      )
    }

    const productId = params.productId ? parseInt(params.productId) : undefined

    if (!productId) {
      return (
        <HomeLayout isLoggedIn={true}>
          <PageHeader
            title="리뷰 작성"
            description="상품에 대한 리뷰를 작성해주세요"
            showBackButton
          />
          <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="mb-4 text-2xl font-bold text-neutral-900">
                상품 정보가 필요합니다
              </h1>
              <p className="text-neutral-600">
                리뷰를 작성하려면 상품 정보가 필요합니다.
              </p>
            </div>
          </div>
        </HomeLayout>
      )
    }

    return (
      <HomeLayout isLoggedIn={true}>
        <PageHeader
          title="리뷰 작성"
          description="상품에 대한 리뷰를 작성해주세요"
          showBackButton
        />
        <ReviewClient productId={productId} productName="상품" />
      </HomeLayout>
    )
  } catch (error: any) {
    console.error('Review 페이지 에러:', error)

    return (
      <HomeLayout isLoggedIn={true}>
        <PageHeader
          title="리뷰 작성"
          description="상품에 대한 리뷰를 작성해주세요"
          showBackButton
        />
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold text-neutral-900">
              페이지를 불러올 수 없습니다
            </h1>
            <p className="text-neutral-600">잠시 후 다시 시도해주세요.</p>
          </div>
        </div>
      </HomeLayout>
    )
  }
}
