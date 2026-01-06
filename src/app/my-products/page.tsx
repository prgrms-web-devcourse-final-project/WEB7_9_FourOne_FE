import { LoginPrompt } from '@/components/auth/LoginPrompt'
import { MyProductsClient } from '@/components/features/products/MyProductsClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { serverApi } from '@/lib/api/server-api-client'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function MyProductsPage() {
  try {
    // 쿠키에서 토큰 가져오기
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('accessToken')?.value

    if (!accessToken) {
      return (
        <HomeLayout>
          <PageHeader
            title="내 상품 관리"
            description="등록한 상품을 관리하고 판매 현황을 확인하세요"
            showBackButton
          />
          <LoginPrompt
            title="내 상품 관리"
            description="내 상품을 확인하려면 로그인해주세요."
          />
        </HomeLayout>
      )
    }

    // 서버 API로 내 상품 데이터 가져오기
    const response = await serverApi.getMyProducts()

    if (!response.success || !response.data) {
      return (
        <HomeLayout isLoggedIn={!!accessToken}>
          <PageHeader
            title="내 상품 관리"
            description="등록한 상품을 관리하고 판매 현황을 확인하세요"
            showBackButton
          />
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="mb-4 text-2xl font-bold text-neutral-900">
                데이터를 불러올 수 없습니다
              </h1>
              <p className="text-neutral-600">잠시 후 다시 시도해주세요.</p>
            </div>
          </div>
        </HomeLayout>
      )
    }

    // API 응답 데이터 구조에 맞게 변환
    let products = []
    if (response.data) {
      if (Array.isArray(response.data)) {
        products = response.data
      } else if (
        (response.data as any).content &&
        Array.isArray((response.data as any).content)
      ) {
        products = (response.data as any).content
      } else if (
        (response.data as any).products &&
        Array.isArray((response.data as any).products)
      ) {
        products = (response.data as any).products
      }
    }

    console.log('[MyProducts] 처리된 상품 목록:', products)

    return (
      <HomeLayout isLoggedIn={!!accessToken}>
        <PageHeader
          title="내 상품 관리"
          description="등록한 상품을 관리하고 판매 현황을 확인하세요"
          showBackButton
          rightAction={
            <a
              href="/register-product"
              className="bg-primary-500 hover:bg-primary-600 inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              + 새 상품 등록
            </a>
          }
        />
        <MyProductsClient initialProducts={products} />
      </HomeLayout>
    )
  } catch (error: any) {
    console.error('MyProducts 페이지 에러:', error)

    const cookieStore = await cookies()
    const accessToken = cookieStore.get('accessToken')?.value

    return (
      <HomeLayout isLoggedIn={!!accessToken}>
        <PageHeader
          title="내 상품 관리"
          description="등록한 상품을 관리하고 판매 현황을 확인하세요"
          showBackButton
          rightAction={
            <a
              href="/register-product"
              className="bg-primary-500 hover:bg-primary-600 inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              + 새 상품 등록
            </a>
          }
        />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
