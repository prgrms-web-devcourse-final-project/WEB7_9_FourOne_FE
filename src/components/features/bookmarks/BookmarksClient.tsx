'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { productApi } from '@/lib/api'
import { handleApiError } from '@/lib/api/common'
import { getFullImageUrl } from '@/lib/utils/image-url'
import { showErrorToast } from '@/lib/utils/toast'
import { Product } from '@/types'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface BookmarksClientProps {
  initialBookmarks?: Product[]
}

export function BookmarksClient({ initialBookmarks }: BookmarksClientProps) {
  const router = useRouter()
  const { user, isLoggedIn } = useAuth()
  const [bookmarks, setBookmarks] = useState(initialBookmarks || [])
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  // apiError가 변경되면 토스트로 표시
  useEffect(() => {
    if (apiError) {
      showErrorToast(apiError)
      setApiError('') // 토스트 표시 후 초기화
    }
  }, [apiError])

  // 찜 목록 조회
  const fetchBookmarks = async () => {
    if (!isLoggedIn) {
      setApiError('로그인이 필요합니다.')
      return
    }

    setIsLoading(true)
    setApiError('')
    try {
      const response = (await productApi.getBookmarks()) as any

      if (response && response.success && response.data) {
        // API 응답 데이터 구조: { data: { bookmarks: [...] } }
        let bookmarksData: any[] = []
        const data = response.data
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
        const mappedBookmarks = bookmarksData.map((bookmark: any) => ({
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

        setBookmarks(mappedBookmarks as any[])
      } else if (response && response.message) {
        setApiError(
          response.message ||
            response.msg ||
            '찜 목록을 불러오는데 실패했습니다.',
        )
      }
    } catch (error: any) {
      console.error('❌ 찜 목록 조회 실패:', error)
      const apiError = handleApiError(error)
      setApiError(apiError.message)
    }
    setIsLoading(false)
  }

  // 찜 해제
  const handleRemoveBookmark = async (productId: number) => {
    if (!confirm('찜 목록에서 제거하시겠습니까?')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await productApi.deleteBookmark(productId)
      if (response.success) {
        // 목록에서 제거
        setBookmarks((prev) =>
          prev.filter((bookmark) => bookmark.productId !== productId),
        )
      } else {
        setApiError(
          response.message || response.msg || '찜 해제에 실패했습니다.',
        )
      }
    } catch (error: any) {
      console.error('찜 해제 실패:', error)
      const apiError = handleApiError(error)
      setApiError(apiError.message)
    }
    setIsLoading(false)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  // 초기 데이터가 있으면 사용, 없으면 API 호출
  useEffect(() => {
    if (isLoggedIn && (!initialBookmarks || initialBookmarks.length === 0)) {
      fetchBookmarks()
    }
  }, [isLoggedIn])

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 찜 목록 */}
      <div className="space-y-4">
        {isLoading && bookmarks.length === 0 ? (
          <Card variant="outlined">
            <CardContent className="py-12 text-center">
              <div className="border-t-primary-500 mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-300"></div>
              <p className="text-neutral-500">찜 목록을 불러오는 중...</p>
            </CardContent>
          </Card>
        ) : bookmarks.length === 0 ? (
          <Card variant="outlined">
            <CardContent className="py-12 text-center">
              <div className="mb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                  <Heart className="h-8 w-8 text-neutral-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                  찜한 상품이 없습니다
                </h3>
                <p className="mb-4 text-neutral-600">
                  관심 있는 상품을 찜해보세요
                </p>
                <Button onClick={() => router.push('/')}>상품 둘러보기</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          bookmarks.map((bookmark) => {
            return (
              <Card
                key={bookmark.productId}
                variant="outlined"
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => router.push(`/products/${bookmark.productId}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* 상품 이미지 */}
                    <div className="shrink-0">
                      <div className="h-24 w-24 overflow-hidden rounded-xl bg-neutral-100 shadow-sm">
                        {(() => {
                          const imageUrl = getFullImageUrl(
                            bookmark.thumbnailUrl,
                          )
                          return imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={bookmark.name}
                              className="h-24 w-24 rounded-xl object-cover transition-transform duration-200 hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-neutral-100">
                              <span className="text-2xl text-neutral-400">
                                📦
                              </span>
                            </div>
                          )
                        })()}
                      </div>
                    </div>

                    {/* 상품 정보 */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="min-w-0 flex-1 pr-4">
                          <h3 className="hover:text-primary-600 mb-2 line-clamp-2 text-lg font-semibold text-neutral-900">
                            {bookmark.name}
                          </h3>
                          {(bookmark as any).bookmarkedAt && (
                            <div className="flex items-center space-x-1 text-xs text-neutral-500">
                              <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                              <span>
                                {formatDate((bookmark as any).bookmarkedAt)}
                              </span>
                            </div>
                          )}
                        </div>
                        {/* 찜 해제 버튼 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveBookmark(bookmark.productId)
                          }}
                          disabled={isLoading}
                          className="group flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-400 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                          title="찜 해제"
                        >
                          <Heart className="h-4 w-4 fill-current transition-transform group-hover:scale-110" />
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

