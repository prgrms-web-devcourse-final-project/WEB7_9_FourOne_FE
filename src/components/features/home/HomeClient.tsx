'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useWebSocketHome } from '@/hooks/useWebSocketHome'
import { auctionApi } from '@/lib/api'
import {
  CATEGORIES,
  CATEGORY_FILTER_OPTIONS,
  type CategoryValue,
  type SubCategoryValue,
} from '@/lib/constants/categories'
import { Clock, MapPin, Search, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { components } from '@/types/swagger-generated'

type AuctionItemResponse = components['schemas']['AuctionItemResponse']
type AuctionCursorResponse = components['schemas']['AuctionCursorResponse']
type AuctionHomeResponse = components['schemas']['AuctionHomeResponse']

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

export function HomeClient() {
  const router = useRouter()
  const { isLoggedIn } = useAuth()

  // 홈 데이터 (마감 임박 & 인기 경매)
  const [homeData, setHomeData] = useState<AuctionHomeResponse | null>(null)
  const [isLoadingHome, setIsLoadingHome] = useState(true)

  const [selectedCategory, setSelectedCategory] = useState<
    CategoryValue | 'all'
  >('all')
  const [selectedSubCategory, setSelectedSubCategory] = useState<
    SubCategoryValue | 'all'
  >('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [error, setError] = useState('')
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cursor 기반 페이지네이션 상태
  const [products, setProducts] = useState<AuctionItemResponse[]>([])
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(
    undefined,
  )
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [pageSize, setPageSize] = useState(10)

  const [sortBy, setSortBy] = useState<'newest' | 'closing' | 'popular'>(
    'newest',
  )
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'SCHEDULED' | 'LIVE' | 'ENDED'
  >('ALL')

  // WebSocket 실시간 홈 데이터 구독
  const { homeData: wsHomeData, isSubscribed: isHomeDataSubscribed } =
    useWebSocketHome()

  // 홈 데이터 로드 (마감 임박 & 인기 경매)
  const loadHomeData = useCallback(async () => {
    setIsLoadingHome(true)
    try {
      const response = await auctionApi.getHomeAuctions()
      if (response.success && response.data) {
        setHomeData(response.data as AuctionHomeResponse)
      }
    } catch (err) {
      console.error('홈 데이터 로드 실패:', err)
    } finally {
      setIsLoadingHome(false)
    }
  }, [])

  // 초기 홈 데이터 로드
  useEffect(() => {
    loadHomeData()
  }, [loadHomeData])

  // 데이터 로드 함수 (필터 값들을 의존성에 포함)
  const loadProducts = useCallback(
    async (cursor?: string, reset: boolean = false) => {
      if (isLoading) return
      setIsLoading(true)
      setError('')

      try {
        const categoryParam =
          selectedCategory === 'all' ? undefined : selectedCategory
        const subCategoryParam =
          selectedSubCategory === 'all' ? undefined : selectedSubCategory
        const statusParam = statusFilter === 'ALL' ? undefined : statusFilter

        let response

        // 키워드 검색이 있는 경우 (2자 이상 20자 이하만 검색)
        const trimmedQuery = debouncedSearchQuery.trim()
        if (
          trimmedQuery &&
          trimmedQuery.length >= 2 &&
          trimmedQuery.length <= 20
        ) {
          response = await auctionApi.searchAuctions({
            keyword: trimmedQuery,
            cursor: cursor,
            size: pageSize,
          })
        } else {
          // 카테고리/상태 필터 사용
          response = await auctionApi.getAuctions({
            category: categoryParam,
            subCategory: subCategoryParam,
            status: statusParam,
            cursor: cursor,
            size: pageSize,
            sort: sortBy,
          })
        }

        if (response.success && response.data) {
          const auctionData = response.data as AuctionCursorResponse
          const newItems = auctionData.items || []

          if (reset) {
            setProducts(newItems)
            setCurrentCursor(auctionData.cursor)
          } else {
            setProducts((prev) => [...prev, ...newItems])
            setCurrentCursor(auctionData.cursor)
          }

          setHasMore(auctionData.hasNext || false)
        } else {
          setError(response.message || '데이터 로드 실패')
        }
      } catch (err) {
        console.error('데이터 로드 에러:', err)
        setError('데이터 로드 중 오류가 발생했습니다')
      } finally {
        setIsLoading(false)
      }
    },
    [
      selectedCategory,
      selectedSubCategory,
      debouncedSearchQuery,
      statusFilter,
      sortBy,
      isLoading,
      pageSize,
    ],
  )

  // 필터 변경 시만 데이터 리셋 후 로드 (pageSize는 제외)
  useEffect(() => {
    loadProducts(undefined, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedCategory,
    selectedSubCategory,
    debouncedSearchQuery,
    statusFilter,
    sortBy,
  ])

  // 검색어 Debounce (입력이 멈춘 후 500ms 후에 검색 실행)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // 무한 스크롤 감지 ref
  const observerTarget = useRef<HTMLDivElement>(null)

  // 무한 스크롤 트리거 - IntersectionObserver로 다음 페이지 로드만 발생
  useEffect(() => {
    if (!observerTarget.current) return

    const target = observerTarget.current
    if (!hasMore || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (!first.isIntersecting) return
        if (isLoading || !hasMore || !currentCursor) return

        observer.unobserve(target) // ⭐ 중복 트리거 방지
        loadProducts(currentCursor, false)
      },
      { threshold: 0.1 },
    )

    observer.observe(target)

    return () => {
      observer.disconnect()
    }
  }, [currentCursor, hasMore, isLoading, loadProducts])

  // 상품 데이터 변환 함수 (Swagger 타입 사용 - API에 있는 필드만 사용)
  const transformProductData = (productsData: AuctionItemResponse[]) => {
    return productsData.map((product) => ({
      productId: product.productId || 0,
      auctionId: product.auctionId || 0,
      name: product.name || '',
      category: product.category || '',
      subCategory: product.subCategory || '',
      initialPrice: product.startPrice || 0,
      currentPrice: product.currentHighestBid || product.startPrice || 0,
      startPrice: product.startPrice || 0,
      currentHighestBid: product.currentHighestBid || 0,
      auctionEndTime: product.endAt || '',
      status: mapApiStatusToKorean(product.status || 'LIVE'),
      imageUrl: product.imageUrl || '',
      bidCount: product.bidCount || 0,
      bookmarkCount: product.bookmarkCount || 0,
      remainingTimeSeconds: product.remainingTimeSeconds || 0,
      isBookmarked: product.isBookmarked || false,
      endAt: product.endAt || '',
    }))
  }

  // 변환된 상품 데이터
  const transformedProducts = transformProductData(products)

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
      <div className="from-primary-500 via-primary-600 to-primary-700 relative mb-16 overflow-hidden rounded-3xl bg-linear-to-br p-12 text-white shadow-2xl">
        {/* Animated Background Elements */}
        <div className="absolute -top-20 -right-20 h-64 w-64 animate-pulse rounded-full bg-white/10 blur-3xl"></div>
        <div
          className="absolute -bottom-20 -left-20 h-64 w-64 animate-pulse rounded-full bg-white/10 blur-3xl"
          style={{ animationDelay: '1s' }}
        ></div>
        <div className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-3xl"></div>

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
            </span>
            실시간 경매 진행 중
          </div>

          <h1 className="animate-fade-in mb-6 text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            DROP:
          </h1>
          <p className="animate-fade-in mb-10 text-xl leading-relaxed text-white/90 sm:text-2xl">
            투명하고 신뢰할 수 있는 리미티드 아이템 거래를 경험해보세요
          </p>

          <div className="animate-scale-in flex flex-col gap-4 sm:flex-row sm:justify-center">
            <button
              onClick={() => router.push('/register-product')}
              className="group text-primary-600 relative overflow-hidden rounded-xl bg-white px-8 py-4 text-lg font-bold shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <span className="relative z-10">상품 등록하기</span>
              <div className="from-primary-50 to-primary-100 absolute inset-0 z-0 bg-linear-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            </button>
            <button
              onClick={() => router.push('/bid-status')}
              className="group rounded-xl border-2 border-white/30 bg-white/10 px-8 py-4 text-lg font-bold text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-white hover:bg-white/20"
            >
              내 입찰 현황
            </button>
          </div>
        </div>
      </div>

      {/* 로딩 스켈레톤 */}
      {isLoadingHome && (
        <div className="mb-16 space-y-12">
          {[1, 2].map((section) => (
            <div key={section}>
              <div className="mb-6 flex items-center justify-between">
                <div className="h-8 w-48 animate-pulse rounded-lg bg-neutral-200"></div>
                <div className="h-9 w-24 animate-pulse rounded-lg bg-neutral-200"></div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[1, 2, 3, 4].map((card) => (
                  <div
                    key={card}
                    className="animate-pulse rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 aspect-square rounded-xl bg-neutral-200"></div>
                    <div className="mb-2 h-6 w-full rounded bg-neutral-200"></div>
                    <div className="mb-2 h-6 w-3/4 rounded bg-neutral-200"></div>
                    <div className="mb-3 h-5 w-1/2 rounded bg-neutral-200"></div>
                    <div className="h-10 w-full rounded-lg bg-neutral-200"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 마감 임박 & 인기 경매 섹션 (홈 API 데이터) */}
      {!isLoadingHome && homeData && (
        <div className="mb-12 space-y-10">
          {/* 마감 임박 경매 */}
          {homeData.endingSoon && homeData.endingSoon.length > 0 && (
            <div className="animate-fade-in">
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-red-500 to-orange-500 shadow-lg">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900">
                      마감 임박 경매
                    </h2>
                    <p className="text-sm text-neutral-600">
                      놓치면 후회할 기회
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="group font-semibold"
                  onClick={() => {
                    setSortBy('closing')
                    setStatusFilter('LIVE')
                  }}
                >
                  전체보기
                  <span className="ml-1 transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </Button>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {homeData.endingSoon.slice(0, 4).map((auction, idx) => (
                  <div
                    key={auction.auctionId}
                    className="group animate-fade-in cursor-pointer"
                    style={{ animationDelay: `${idx * 100}ms` }}
                    onClick={() =>
                      router.push(`/auctions/${auction.auctionId}`)
                    }
                  >
                    <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
                      {/* Urgency Badge */}
                      <div className="absolute top-3 right-3 z-10 rounded-full bg-linear-to-r from-red-500 to-orange-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                        🔥 마감임박
                      </div>

                      {/* Image */}
                      <div className="relative aspect-square overflow-hidden bg-neutral-100">
                        {auction.imageUrl ? (
                          <img
                            src={auction.imageUrl}
                            alt={auction.name || ''}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <span className="text-6xl opacity-50">📦</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <h3 className="group-hover:text-primary-600 mb-3 line-clamp-2 text-lg leading-tight font-bold text-neutral-900 transition-colors">
                          {auction.name}
                        </h3>

                        <div className="bg-primary-50 mb-4 flex items-baseline justify-between rounded-lg p-3">
                          <span className="text-sm font-medium text-neutral-700">
                            현재가
                          </span>
                          <span className="text-primary-600 text-xl font-extrabold">
                            {formatPrice(
                              auction.currentHighestBid ||
                                auction.startPrice ||
                                0,
                            )}
                          </span>
                        </div>

                        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-600">
                          <Clock className="h-4 w-4 animate-pulse" />
                          <span className="text-sm font-bold">
                            {auction.remainingTimeSeconds !== undefined &&
                            auction.remainingTimeSeconds > 0
                              ? `${Math.floor(auction.remainingTimeSeconds / 3600)}시간 ${Math.floor((auction.remainingTimeSeconds % 3600) / 60)}분 남음`
                              : '곧 종료'}
                          </span>
                        </div>

                        <Button
                          size="lg"
                          className="from-primary-500 to-primary-600 w-full bg-linear-to-r font-bold shadow-md transition-all duration-300 hover:shadow-xl"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/auctions/${auction.auctionId}`)
                          }}
                        >
                          입찰하기
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 인기 경매 */}
          {homeData.popular && homeData.popular.length > 0 && (
            <div
              className="animate-fade-in"
              style={{ animationDelay: '200ms' }}
            >
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-orange-500 to-pink-500 shadow-lg">
                    <span className="text-2xl">🔥</span>
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900">
                      인기 경매
                    </h2>
                    <p className="text-sm text-neutral-600">
                      많은 사람들이 주목하는
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="group font-semibold"
                  onClick={() => {
                    setSortBy('popular')
                    setStatusFilter('LIVE')
                  }}
                >
                  전체보기
                  <span className="ml-1 transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </Button>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {homeData.popular.slice(0, 4).map((auction, idx) => (
                  <div
                    key={auction.auctionId}
                    className="group animate-fade-in cursor-pointer"
                    style={{ animationDelay: `${(idx + 4) * 100}ms` }}
                    onClick={() =>
                      router.push(`/auctions/${auction.auctionId}`)
                    }
                  >
                    <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
                      {/* Popular Badge */}
                      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full bg-linear-to-r from-orange-500 to-pink-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                        <span className="animate-pulse">⭐</span>
                        인기
                      </div>

                      {/* Image */}
                      <div className="relative aspect-square overflow-hidden bg-neutral-100">
                        {auction.imageUrl ? (
                          <img
                            src={auction.imageUrl}
                            alt={auction.name || ''}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <span className="text-6xl opacity-50">📦</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <h3 className="group-hover:text-primary-600 mb-3 line-clamp-2 text-lg leading-tight font-bold text-neutral-900 transition-colors">
                          {auction.name}
                        </h3>

                        <div className="bg-primary-50 mb-4 flex items-baseline justify-between rounded-lg p-3">
                          <span className="text-sm font-medium text-neutral-700">
                            현재가
                          </span>
                          <span className="text-primary-600 text-xl font-extrabold">
                            {formatPrice(
                              auction.currentHighestBid ||
                                auction.startPrice ||
                                0,
                            )}
                          </span>
                        </div>

                        <div className="mb-4 flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                          <div className="flex items-center gap-1 text-neutral-700">
                            <User className="h-4 w-4" />
                            <span className="text-sm font-semibold">
                              {auction.bidCount || 0}
                            </span>
                            <span className="text-xs text-neutral-500">
                              입찰
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-pink-500">
                            <span className="text-base">❤️</span>
                            <span className="text-sm font-semibold">
                              {auction.bookmarkCount || 0}
                            </span>
                          </div>
                        </div>

                        <Button
                          size="lg"
                          variant="outline"
                          className="hover:border-primary-500 hover:bg-primary-50 w-full border-2 font-bold transition-all duration-300"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/auctions/${auction.auctionId}`)
                          }}
                        >
                          상세보기
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 검색 및 필터 */}
      <div className="mb-8">
        {/* 검색 바 */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute top-1/2 left-4 z-10 h-5 w-5 -translate-y-1/2 text-neutral-600" />
            <Input
              placeholder="상품명을 검색하세요 (2~20자)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.slice(0, 20))}
              maxLength={20}
              className="h-12 pl-12"
            />
          </div>
        </div>

        {/* 카테고리 필터 및 정렬 옵션 */}
        <div className="mb-4 flex items-center justify-between gap-4">
          {/* 카테고리 탭 */}
          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTER_OPTIONS.map((category) => (
              <button
                key={category.value}
                onClick={() => {
                  setSelectedCategory(category.value as CategoryValue | 'all')
                  setSelectedSubCategory('all') // 카테고리 변경 시 서브카테고리 초기화
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  selectedCategory === category.value
                    ? 'bg-neutral-900 text-white shadow-md'
                    : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* 경매 상태 필터 및 정렬 */}
          <div className="flex items-center gap-3">
            {/* 경매 상태 필터 */}
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as 'ALL' | 'SCHEDULED' | 'LIVE' | 'ENDED',
                )
              }
              className="focus:border-primary-300 focus:ring-primary-200 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* 정렬 옵션 */}
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'newest' | 'closing' | 'popular')
              }
              className="focus:border-primary-300 focus:ring-primary-200 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
            >
              <option value="newest">최신 등록순</option>
              <option value="closing">마감 임박순</option>
              <option value="popular">인기순</option>
            </select>
          </div>
        </div>

        {/* 서브카테고리 탭 (카테고리 선택 시에만 표시) */}
        {selectedCategory !== 'all' && (
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSubCategory('all')}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                selectedSubCategory === 'all'
                  ? 'bg-neutral-900 text-white shadow-md'
                  : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              전체
            </button>
            {CATEGORIES.find(
              (cat) => cat.value === selectedCategory,
            )?.subCategories.map((subCategory) => (
              <button
                key={subCategory.value}
                onClick={() => setSelectedSubCategory(subCategory.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  selectedSubCategory === subCategory.value
                    ? 'bg-neutral-900 text-white shadow-md'
                    : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                {subCategory.label}
              </button>
            ))}
          </div>
        )}
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
                  onClick={() => router.push('/login')}
                >
                  로그인
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => router.push('/login?tab=signup')}
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
        {isLoading && products.length === 0 ? (
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
        ) : error ? (
          <Card variant="outlined">
            <CardContent className="py-12 text-center">
              <div className="mb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                  오류가 발생했습니다
                </h3>
                <p className="text-neutral-600">{error}</p>
                <Button
                  onClick={() => loadProducts(undefined, true)}
                  className="mt-4"
                >
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
                  key={`${product.auctionId}-${product.productId}`}
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
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl || ''}
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

                      {/* 상품 제목 */}
                      <div>
                        <h3 className="mb-2 line-clamp-2 text-lg font-bold text-neutral-900">
                          {product.name}
                        </h3>
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

                      {/* 경매 상태 및 입찰 정보 */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Clock className="text-warning-500 h-4 w-4" />
                          <span className="text-sm font-medium text-neutral-700">
                            {product.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-neutral-600">
                          <MapPin className="h-4 w-4 text-neutral-400" />
                          <span>입찰 {product.bidCount || 0}회</span>
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex space-x-3 pt-4">
                        <Button
                          size="md"
                          variant="gradient"
                          className="sm:size-lg flex-1"
                          onClick={() =>
                            router.push(`/auctions/${product.auctionId}`)
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

            {/* 페이지 크기 선택 */}
            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-neutral-600">
                {products.length}개 표시 중
              </div>
            </div>

            {/* 무한 스크롤 감지 요소 */}
            <div ref={observerTarget} className="mt-8 flex justify-center py-4">
              {isLoading && hasMore && (
                <div className="flex items-center space-x-2">
                  <div className="border-primary-200 border-t-primary-600 h-6 w-6 animate-spin rounded-full border-2"></div>
                  <span className="text-sm text-neutral-600">로딩중...</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
