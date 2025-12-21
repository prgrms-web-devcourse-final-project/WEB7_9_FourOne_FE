import { LoginPrompt } from '@/components/auth/LoginPrompt'
import { BookmarksClient } from '@/components/features/bookmarks/BookmarksClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
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

    // TODO: 서버 API로 찜 목록 가져오기 (API가 준비되면 활성화)
    // const response = await serverApi.getBookmarks()
    // let bookmarks = []
    // if (response.success && response.data) {
    //   if (Array.isArray(response.data)) {
    //     bookmarks = response.data
    //   } else if (response.data.content && Array.isArray(response.data.content)) {
    //     bookmarks = response.data.content
    //   }
    // }

    return (
      <HomeLayout isLoggedIn={!!accessToken}>
        <PageHeader
          title="찜 목록"
          description="관심 있는 상품을 찜해보세요"
          showBackButton
        />
        <BookmarksClient initialBookmarks={[]} />
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

