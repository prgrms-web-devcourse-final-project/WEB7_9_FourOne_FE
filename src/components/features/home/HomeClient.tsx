'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  PageSizeSelector,
  Pagination,
  PaginationInfo,
} from '@/components/ui/pagination'
import { useAuth } from '@/contexts/AuthContext'
import { usePagination } from '@/hooks/usePagination'
import { useWebSocketHome } from '@/hooks/useWebSocketHome'
import { auctionApi } from '@/lib/api'
import {
  CATEGORY_FILTER_OPTIONS,
  type CategoryValue,
  type SubCategoryValue,
} from '@/lib/constants/categories'
import { Clock, MapPin, Search, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface HomeStats {
  activeAuctions: number
  endingToday: number
  totalParticipants: number
  successRate: number
}

interface HomeClientProps {
  stats: HomeStats
}

// 새로운 경매 상태 옵션 (새로운 API 스펙에 맞춤)
const statusOptions = [
  { value: 'ALL', label: '전체' },
  { value: 'SCHEDULED', label: '예정' },
  { value: 'LIVE', label: '진행 중' },
  { value: 'ENDED', label: '종료' },
]

// API 응답의 영어 status를 한국어로 변환 (새로운 API 스펙에 맞춤)
const mapApiStatusToKorean = (apiStatus: string): string => {
  switch (apiStatus) {
    case 'SCHEDULED':
      return '예정'
    case 'LIVE':
      return '진행 중'
    case 'ENDED':
      return '종료'
    // 하위 호환성을 위한 기존 값들
    case 'BEFORE_START':
      return '경매 시작 전'
    case 'BIDDING':
    case 'SELLING':
      return '경매 중'
    case 'SUCCESSFUL':
    case 'SOLD':
      return '낙찰'
    case 'FAILED':
      return '유찰'
    default:
      return apiStatus // 알 수 없는 상태는 그대로 반환
  }
}

export function HomeClient({ stats }: HomeClientProps) {
  const router = useRouter()
  const { isLoggedIn } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState<
    CategoryValue | 'all'
  >('all')
  const [selectedSubCategory, setSelectedSubCategory] = useState<
    SubCategoryValue | 'all'
  >('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'newest' | 'closing' | 'popular'>(
    'newest',
  )
  const limit = 20 // 한 번에 가져올 아이템 수

  // WebSocket 실시간 홈 데이터 구독
  const { homeData, isSubscribed: isHomeDataSubscribed } = useWebSocketHome()
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'SCHEDULED' | 'LIVE' | 'ENDED'
  >('ALL')

  // API 호출 함수 (새로운 경매 API 사용 - cursor + limit 방식)
  const fetchProducts = useCallback(
    async ({ page, size }: { page: number; size: number }) => {
      try {
        // 키워드 검색이 있는 경우
        if (searchQuery.trim()) {
          const response = await auctionApi.searchAuctions({
            search: searchQuery.trim(),
            cursor: page > 1 ? nextCursor || undefined : undefined,
            limit: limit,
            sort: sortBy,
          })

          if (response.success && response.data) {
            // cursor 기반 페이지네이션 응답 처리
            const auctions = response.data.content || response.data || []
            const hasNext = response.data.hasNext || false
            const nextCursorValue = response.data.nextCursor || null
            setNextCursor(nextCursorValue)

            // 페이지네이션 호환을 위한 변환
            return {
              success: true,
              data: {
                content: auctions,
                totalElements: auctions.length,
                totalPages: hasNext ? page + 1 : page,
                size: size,
                number: page - 1,
                first: page === 1,
                last: !hasNext,
                hasNext,
                nextCursor: nextCursorValue,
              },
              resultCode: '200',
              msg: '',
            }
          } else {
            throw new Error(
              response.message || response.msg || '경매 검색 실패',
            )
          }
        } else {
          // 카테고리/상태 필터 사용
          const categoryParam =
            selectedCategory === 'all' ? undefined : selectedCategory
          const subCategoryParam =
            selectedSubCategory === 'all' ? undefined : selectedSubCategory
          const statusParam = statusFilter === 'ALL' ? undefined : statusFilter

          const response = await auctionApi.getAuctions({
            category: categoryParam,
            subCategory: subCategoryParam,
            status: statusParam,
            cursor: page > 1 ? nextCursor || undefined : undefined,
            limit: limit,
            sort: sortBy,
          })

          if (response.success && response.data) {
            // cursor 기반 페이지네이션 응답 처리
            const auctions = response.data.content || response.data || []
            const hasNext = response.data.hasNext || false
            const nextCursorValue = response.data.nextCursor || null
            setNextCursor(nextCursorValue)

            // 페이지네이션 호환을 위한 변환
            return {
              success: true,
              data: {
                content: auctions,
                totalElements: auctions.length,
                totalPages: hasNext ? page + 1 : page,
                size: size,
                number: page - 1,
                first: page === 1,
                last: !hasNext,
                hasNext,
                nextCursor: nextCursorValue,
              },
              resultCode: '200',
              msg: '',
            }
          } else {
            throw new Error(
              response.message || response.msg || '경매 조회 실패',
            )
          }
        }
      } catch (error) {
        console.error('경매 조회 에러:', error)
        return {
          success: false,
          data: {
            content: [],
            totalElements: 0,
            totalPages: 0,
            size: size,
            number: page - 1,
            first: true,
            last: true,
          },
          resultCode: '500',
          msg:
            error instanceof Error
              ? error.message
              : '경매 조회 중 오류가 발생했습니다.',
        }
      }
    },
    [
      selectedCategory,
      selectedSubCategory,
      searchQuery,
      statusFilter,
      nextCursor,
    ],
  )

  // 페이지네이션 훅 사용
  const {
    data: products,
    currentPage,
    pageSize,
    totalPages,
    totalElements,
    hasNext,
    hasPrevious,
    isLoading,
    error: paginationError,
    goToPage,
    setPageSize,
    refresh,
    reset,
  } = usePagination(fetchProducts, {
    initialPageSize: 10,
    autoLoad: true,
    onError: setError,
  })

  // 검색어, 카테고리, 필터 변경 시 페이지 리셋 및 새로고침
  useEffect(() => {
    setNextCursor(null) // cursor 초기화
    if (currentPage > 1) {
      reset()
    } else {
      refresh()
    }
  }, [
    selectedCategory,
    selectedSubCategory,
    searchQuery,
    statusFilter,
    sortBy,
    reset,
    refresh,
    currentPage,
  ])

  // 상품 데이터 변환 함수
  const transformProductData = (productsData: any[]): any[] => {
    return productsData.map((product: any) => ({
      productId: product.productId,
      name: product.name,
      description: product.description || '',
      category: product.category,
      initialPrice: product.initialPrice,
      currentPrice: product.currentPrice,
      auctionStartTime: product.auctionStartTime,
      auctionEndTime:
        product.auctionEndTime ||
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: mapApiStatusToKorean(product.status || 'BIDDING'),
      images: product.thumbnailUrl
        ? [product.thumbnailUrl]
        : product.images || [],
      thumbnailUrl: product.thumbnailUrl,
      seller: {
        id: String(product.seller?.id),
        nickname: product.seller?.nickname || '판매자',
        profileImage: product.seller?.profileImage || null,
        creditScore: product.seller?.creditScore || 0,
        reviewCount: product.seller?.reviewCount || 0,
      },
      location: product.location,
      createDate: product.createDate,
      modifyDate: product.modifyDate,
      bidderCount: product.bidderCount,
      deliveryMethod: product.deliveryMethod as 'TRADE' | 'DELIVERY' | 'BOTH',
    }))
  }

  // 변환된 상품 데이터
  const transformedProducts = products ? transformProductData(products) : []

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원'
  }

  const formatTimeLeft = (auctionEndTime: string) => {
    const now = new Date().getTime()
    const end = new Date(auctionEndTime).getTime()
    const diff = end - now

    if (diff <= 0) return '종료됨'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}시간 ${minutes}분 남음`
    } else {
      return `${minutes}분 남음`
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 메인 히어로 섹션 */}
      <div className="bg-primary-500 relative mb-12 overflow-hidden rounded-3xl p-8 text-white shadow-2xl">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/5 blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5 blur-3xl"></div>
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="animate-fade-in mb-6 text-4xl font-bold sm:text-5xl lg:text-6xl">
            희소 굿즈 경매 플랫폼
          </h1>
          <p className="animate-fade-in mb-8 text-lg opacity-90 sm:text-xl">
            투명하고 신뢰할 수 있는 리미티드 아이템 거래를 경험해보세요
          </p>
          <div className="animate-scale-in flex flex-col gap-4 sm:flex-row sm:justify-center">
            <button
              onClick={() => router.push('/register-product')}
              className="text-primary-500 rounded-xl bg-white px-8 py-4 font-semibold shadow-lg transition-all duration-200 hover:scale-105 hover:bg-neutral-100 hover:shadow-xl"
            >
              상품 등록하기
            </button>
            <button
              onClick={() => router.push('/bid-status')}
              className="rounded-xl border-2 border-white/50 bg-white/10 px-8 py-4 font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:border-white hover:bg-white/20"
            >
              내 입찰 현황
            </button>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="mb-8">
        {/* 검색 바 */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute top-1/2 left-4 z-10 h-5 w-5 -translate-y-1/2 text-neutral-600" />
            <Input
              placeholder="상품명을 검색하세요"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 pl-12"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  setNextCursor(null)
                  if (currentPage > 1) {
                    reset()
                  } else {
                    refresh()
                  }
                }
              }}
            />
          </div>
        </div>

        {/* 경매 상태 필터 및 정렬 */}
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* 경매 상태 필터 */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-neutral-700">
              경매 상태:
            </span>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    setStatusFilter(
                      option.value as 'ALL' | 'SCHEDULED' | 'LIVE' | 'ENDED',
                    )
                  }
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    statusFilter === option.value
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 border border-neutral-200/50 bg-white/80 text-neutral-700 backdrop-blur-sm'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 정렬 옵션 */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-neutral-700">정렬:</span>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'newest' | 'closing' | 'popular')
              }
              className="focus:border-primary-300 focus:ring-primary-200 rounded-xl border border-neutral-200/50 bg-white/80 p-2 text-sm backdrop-blur-sm"
            >
              <option value="newest">최신 등록순</option>
              <option value="closing">마감 임박순</option>
              <option value="popular">인기순</option>
            </select>
          </div>
        </div>

        {/* 카테고리 탭 */}
        <div className="flex flex-wrap gap-3">
          {CATEGORY_FILTER_OPTIONS.map((category) => (
            <button
              key={category.value}
              onClick={() =>
                setSelectedCategory(category.value as CategoryValue | 'all')
              }
              className={`rounded-full px-6 py-3 text-sm font-semibold transition-all duration-200 ${
                selectedCategory === category.value
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 border border-neutral-200/50 bg-white/80 text-neutral-700 backdrop-blur-sm'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* 로그인 상태에 따른 메인 CTA */}
      {!isLoggedIn && (
        <div className="mb-8">
          <Card variant="gradient" className="animate-fade-in">
            <CardContent className="p-8 text-center">
              <h2 className="text-primary-500 mb-4 text-3xl font-bold">
                DROP에 오신 것을 환영합니다!
              </h2>
              <p className="mb-8 text-lg text-neutral-600">
                투명하고 신뢰할 수 있는 굿즈 거래 플랫폼에서 원하는 아이템을
                찾아보세요.
              </p>
              <div className="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-4">
                <Button
                  size="lg"
                  variant="gradient"
                  onClick={() => (window.location.href = '/login')}
                >
                  로그인
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => (window.location.href = '/signup')}
                >
                  회원가입
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 상품 목록 */}
      <div className="space-y-4">
        {isLoading ? (
          <Card variant="outlined">
            <CardContent className="py-12 text-center">
              <div className="mb-4">
                <div className="border-primary-200 border-t-primary-600 mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4"></div>
                <h3 className="text-lg font-semibold text-neutral-900">
                  상품을 불러오는 중...
                </h3>
              </div>
            </CardContent>
          </Card>
        ) : error || paginationError ? (
          <Card variant="outlined">
            <CardContent className="py-12 text-center">
              <div className="mb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                  오류가 발생했습니다
                </h3>
                <p className="text-neutral-600">{error || paginationError}</p>
                <Button onClick={refresh} className="mt-4">
                  다시 시도
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : transformedProducts.length === 0 ? (
          <Card variant="outlined">
            <CardContent className="py-12 text-center">
              <div className="mb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                  <span className="text-2xl">📦</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                  상품이 없습니다
                </h3>
                <p className="text-neutral-600">
                  {searchQuery
                    ? `"${searchQuery}"에 대한 검색 결과가 없습니다. 정확한 상품명을 입력하거나 다른 키워드로 시도해보세요.`
                    : '아직 등록된 상품이 없습니다.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {transformedProducts.map((product, index) => (
                <Card
                  key={product.productId}
                  variant="elevated"
                  hover
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col space-y-4">
                      {/* 상품 이미지와 카테고리 */}
                      <div className="flex flex-col space-y-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                        <div className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded-2xl bg-neutral-100 shadow-lg sm:h-36 sm:w-36">
                          {product.thumbnailUrl || product.images?.[0] ? (
                            <img
                              src={
                                product.thumbnailUrl ||
                                (typeof product.images?.[0] === 'string'
                                  ? product.images[0]
                                  : product.images?.[0]?.imageUrl)
                              }
                              alt={product.name || '상품'}
                              className="h-32 w-full rounded-2xl object-cover transition-transform duration-300 hover:scale-105 sm:h-36 sm:w-36"
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center">
                              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-200 shadow-lg">
                                <svg
                                  className="text-primary-600 h-8 w-8"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                  />
                                </svg>
                              </div>
                              <span className="text-sm font-medium text-neutral-500">
                                이미지 준비중
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col space-y-2 sm:items-end">
                          <Badge className="bg-primary-500 w-fit text-white shadow-lg">
                            {product.category}
                          </Badge>
                        </div>
                      </div>

                      {/* 상품 제목과 설명 */}
                      <div>
                        <h3 className="mb-2 line-clamp-1 text-xl font-bold text-neutral-900">
                          {product.name}
                        </h3>
                        <p className="line-clamp-2 text-sm text-neutral-600">
                          {product.description}
                        </p>
                      </div>

                      {/* 가격 정보 */}
                      <div className="rounded-2xl bg-neutral-50 p-4 shadow-lg sm:p-6">
                        <div className="grid grid-cols-2 gap-4 sm:gap-6">
                          <div>
                            <div className="mb-2 text-sm font-medium text-neutral-600">
                              현재가
                            </div>
                            <div className="text-primary-500 text-xl font-bold sm:text-2xl">
                              {formatPrice(product.currentPrice || 0)}
                            </div>
                          </div>
                          <div>
                            <div className="mb-2 text-sm font-medium text-neutral-600">
                              시작가
                            </div>
                            <div className="text-base font-semibold text-neutral-700 sm:text-lg">
                              {formatPrice(product.initialPrice || 0)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 남은 시간, 판매자, 장소 */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Clock className="text-warning-500 h-4 w-4" />
                          <span className="text-sm font-medium text-neutral-700">
                            {formatTimeLeft(
                              product.auctionEndTime ||
                                new Date(
                                  Date.now() + 24 * 60 * 60 * 1000,
                                ).toISOString(),
                            )}
                          </span>
                        </div>
                        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                          <div className="flex items-center space-x-1">
                            <User className="text-primary-500 h-4 w-4" />
                            <span className="text-sm font-medium text-neutral-700">
                              {product.seller?.nickname || '판매자'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {product.location ? (
                              <>
                                <MapPin className="h-4 w-4 text-neutral-400" />
                                <span className="text-sm text-neutral-600">
                                  {product.location}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm text-neutral-600">
                                배송만 가능
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex space-x-3 pt-4">
                        <Button
                          size="md"
                          variant="gradient"
                          className="sm:size-lg flex-1"
                          onClick={() =>
                            router.push(`/products/${product.productId}`)
                          }
                        >
                          상세보기
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 페이지네이션 UI */}
            {totalPages > 0 && (
              <div className="mt-8 space-y-4">
                {/* 페이지 정보 및 페이지 크기 선택 */}
                <div className="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
                  <PaginationInfo
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalElements={totalElements}
                    pageSize={pageSize}
                  />
                  <PageSizeSelector
                    pageSize={pageSize}
                    onPageSizeChange={setPageSize}
                    options={[10, 20, 50]}
                  />
                </div>

                {/* 페이지네이션 컨트롤 */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  hasNext={hasNext}
                  hasPrevious={hasPrevious}
                  isLoading={isLoading}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
