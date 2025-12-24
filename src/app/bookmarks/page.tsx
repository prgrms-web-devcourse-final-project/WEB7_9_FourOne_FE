import { LoginPrompt } from '@/components/auth/LoginPrompt'
import { BookmarksClient } from '@/components/features/bookmarks/BookmarksClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { serverApi } from '@/lib/api/server-api-client'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function BookmarksPage() {
  try {
    // 쿠키에서 토큰 가져오기
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('accessToken')?.value

    if (!accessToken) {
      return (
        <HomeLayout>
          <PageHeader
            title="찜 목록"
            description="관심 있는 상품을 찜해보세요"
            showBackButton
          />
          <LoginPrompt
            title="찜 목록"
            description="찜한 상품을 확인하려면 로그인해주세요."
          />
        </HomeLayout>
      )
    }

    // 서버 API로 찜 목록 가져오기
    let bookmarks: any[] = []
    try {
      const response = await serverApi.getBookmarks({
        page: 1,
        size: 100,
      })

      if (response.success && response.data) {
        const data = response.data as any
        let bookmarksData: any[] = []

        // API 응답 구조: { data: { bookmarks: [...] } }
        if (data.bookmarks && Array.isArray(data.bookmarks)) {
          bookmarksData = data.bookmarks
        } else if (Array.isArray(data)) {
          bookmarksData = data
        } else if (data.content && Array.isArray(data.content)) {
          bookmarksData = data.content
        }

        // 북마크 응답 구조를 Product 타입에 맞게 변환
        // 응답: { id, productId, title, productImageUrl, bookmarkedAt }
        // Product: { productId, name, thumbnailUrl, ... }
        bookmarks = bookmarksData.map((bookmark: any) => ({
          productId: bookmark.productId,
          name: bookmark.title || bookmark.name,
          thumbnailUrl: bookmark.productImageUrl || bookmark.imageUrl,
          bookmarkedAt: bookmark.bookmarkedAt,
          bookmarkId: bookmark.id,
          // 기타 필드는 기본값 설정
          status: bookmark.status || 'PENDING',
          currentPrice: bookmark.currentPrice || 0,
          initialPrice: bookmark.initialPrice || 0,
          bidderCount: bookmark.bidderCount || 0,
          auctionEndTime: bookmark.auctionEndTime || null,
        }))
      }
    } catch (error) {
      console.error('북마크 목록 조회 실패:', error)
      // 에러가 발생해도 빈 배열로 전달하여 클라이언트에서 재시도 가능하도록 함
    }

    return (
      <HomeLayout isLoggedIn={!!accessToken}>
        <PageHeader
          title="찜 목록"
          description="관심 있는 상품을 찜해보세요"
          showBackButton
        />
        <BookmarksClient initialBookmarks={bookmarks} />
      </HomeLayout>
    )
  } catch (error: any) {
    console.error('Bookmarks 페이지 에러:', error)

    const cookieStore = await cookies()
    const accessToken = cookieStore.get('accessToken')?.value

    return (
      <HomeLayout isLoggedIn={!!accessToken}>
        <PageHeader
          title="찜 목록"
          description="관심 있는 상품을 찜해보세요"
          showBackButton
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

