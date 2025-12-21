'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { productApi } from '@/lib/api'
import { handleApiError } from '@/lib/api/common'
import { showErrorToast } from '@/lib/utils/toast'
import { Product } from '@/types'
import { Heart, Trash2 } from 'lucide-react'
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
      const response = (await productApi.getBookmarks({
        page: 0,
        size: 100,
      })) as any

      if (response && response.success && response.data) {
        // API 응답 데이터 구조에 맞게 변환
        let bookmarksData: Product[] = []
        const data = response.data
        if (Array.isArray(data)) {
          bookmarksData = data
        } else if (data.content && Array.isArray(data.content)) {
          bookmarksData = data.content
        } else if (data.bookmarks && Array.isArray(data.bookmarks)) {
          bookmarksData = data.bookmarks
        }

        setBookmarks(bookmarksData)
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '경매 시작 전':
      case 'BEFORE_START':
        return { label: '경매 시작 전', variant: 'neutral' as const }
      case '경매 중':
      case 'SELLING':
        return { label: '경매 중', variant: 'primary' as const }
      case '낙찰':
      case 'SOLD':
        return { label: '낙찰', variant: 'success' as const }
      case '유찰':
      case 'FAILED':
        return { label: '유찰', variant: 'warning' as const }
      default:
        return { label: status || '알 수 없음', variant: 'neutral' as const }
    }
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
            const statusBadge = getStatusBadge(bookmark.status || '')

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
                        {bookmark.thumbnailUrl ? (
                          <img
                            src={bookmark.thumbnailUrl}
                            alt={bookmark.name}
                            className="h-24 w-24 rounded-xl object-cover transition-transform duration-200 hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-neutral-100">
                            <span className="text-2xl text-neutral-400">
                              📦
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 상품 정보 */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="mb-1 truncate text-lg font-semibold text-neutral-900">
                            {bookmark.name}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <Badge variant={statusBadge.variant}>
                              {statusBadge.label}
                            </Badge>
                            {bookmark.currentPrice && (
                              <span className="text-sm text-neutral-500">
                                현재가: {formatPrice(bookmark.currentPrice)}원
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mb-3 flex items-center justify-between text-sm text-neutral-600">
                        <div>
                          <span className="font-semibold text-neutral-900">
                            시작가:
                          </span>{' '}
                          {formatPrice(bookmark.initialPrice || 0)}원
                        </div>
                        {(bookmark as any).bidCount !== undefined && (
                          <div>
                            <span className="font-semibold text-neutral-900">
                              입찰 수:
                            </span>{' '}
                            {(bookmark as any).bidCount}건
                          </div>
                        )}
                        {bookmark.bidderCount !== undefined && (
                          <div>
                            <span className="font-semibold text-neutral-900">
                              입찰자 수:
                            </span>{' '}
                            {bookmark.bidderCount}명
                          </div>
                        )}
                      </div>

                      {bookmark.auctionEndTime && (
                        <div className="mb-3 text-xs text-neutral-500">
                          경매 종료: {formatDate(bookmark.auctionEndTime)}
                        </div>
                      )}

                      {/* 찜 해제 버튼 */}
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveBookmark(bookmark.productId)
                          }}
                          disabled={isLoading}
                          className="flex items-center space-x-1 text-red-500 hover:border-red-300 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>찜 해제</span>
                        </Button>
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

