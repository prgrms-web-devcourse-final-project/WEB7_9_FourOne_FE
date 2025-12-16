'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { productApi } from '@/lib/api'
import { CATEGORY_FILTER_OPTIONS, type CategoryValue } from '@/lib/constants/categories'
import { Product } from '@/types'
import { Clock, MapPin, Search, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

interface ProductInfiniteScrollClientProps {
  initialProducts?: Product[]
}

export function ProductInfiniteScrollClient({
  initialProducts,
}: ProductInfiniteScrollClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // API 호출 함수
  const fetchProducts = useCallback(
    async ({ page, size }: { page: number; size: number }) => {
      const selectedCategoryData = CATEGORY_FILTER_OPTIONS.find(
        (cat) => cat.value === selectedCategory,
      )

      const requestParams = {
        page,
        size,
        keyword: searchQuery.trim() || undefined,
        // 새로운 백엔드는 카테고리 필터를 어떻게 받는지 확인 필요
        // TODO: 백엔드 API 스펙 확인 후 category 필터 타입 조정
        category: selectedCategoryData?.apiValue
          ? [selectedCategoryData.apiValue as CategoryValue]
          : undefined,
        sort: 'LATEST' as const,
        status: 'BIDDING' as const,
      }

      return await productApi.getProducts(requestParams)
    },
    [selectedCategory, searchQuery],
  )

  // 무한 스크롤 훅 사용
  const {
    data: products,
    currentPage,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    loadMore,
    refresh,
    reset,
    loadMoreRef,
  } = useInfiniteScroll(fetchProducts, {
    pageSize: 20,
    autoLoad: true,
    threshold: 200,
  })

  // 상품 데이터 변환 함수
  const transformProductData = (productsData: any[]): Product[] => {
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
      status: product.status || 'BIDDING',
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
      location: product.location || product.seller?.location,
      createDate: product.createDate,
      modifyDate: product.modifyDate,
      bidderCount: product.bidderCount,
      deliveryMethod: product.deliveryMethod,
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

  // 검색어나 카테고리 변경 시 리셋
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    reset()
  }

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId)
    reset()
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">
          무한 스크롤 상품 목록
        </h1>
        <p className="mt-2 text-neutral-600">
          스크롤하면 자동으로 더 많은 상품을 불러옵니다
        </p>
      </div>

      {/* 검색 및 필터 */}
      <div className="mb-8">
        <div className="mb-6 flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-4 z-10 h-5 w-5 -translate-y-1/2 text-neutral-600" />
            <Input
              placeholder="상품명을 검색하세요"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-12 pl-12"
            />
          </div>
        </div>

        {/* 카테고리 탭 */}
        <div className="flex flex-wrap gap-3">
          {CATEGORY_FILTER_OPTIONS.map((category) => (
            <button
              key={category.value}
              onClick={() => handleCategoryChange(category.value)}
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

      {/* 에러 메시지 */}
      {error && (
        <Card variant="outlined" className="mb-6">
          <CardContent className="py-12 text-center">
            <div className="mb-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                오류가 발생했습니다
              </h3>
              <p className="text-neutral-600">{error}</p>
              <Button onClick={refresh} className="mt-4">
                다시 시도
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 상품 목록 */}
      <div className="space-y-4">
        {isLoading && transformedProducts.length === 0 ? (
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
                    ? `"${searchQuery}"에 대한 검색 결과가 없습니다.`
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
                  key={`${product.productId}-${index}`}
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

            {/* 무한 스크롤 트리거 */}
            <div ref={loadMoreRef} className="py-8">
              {isLoadingMore && (
                <div className="text-center">
                  <div className="border-primary-200 border-t-primary-600 mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4"></div>
                  <p className="text-neutral-600">
                    더 많은 상품을 불러오는 중...
                  </p>
                </div>
              )}
              {!hasMore && transformedProducts.length > 0 && (
                <div className="text-center">
                  <p className="text-neutral-500">모든 상품을 불러왔습니다.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
