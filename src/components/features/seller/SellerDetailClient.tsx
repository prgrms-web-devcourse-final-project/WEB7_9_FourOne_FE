'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { productApi, reviewApi } from '@/lib/api'
import { Product } from '@/types'
import {
  Calendar,
  CheckCircle,
  Eye,
  MapPin,
  MessageSquare,
  Package,
  Shield,
  Star,
  Users,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface SellerDetailClientProps {
  seller: {
    id: string
    nickname: string
    profileImage?: string
    creditScore: number
    reviewCount: number
  }
  products?: Product[]
}

type TabType = 'selling' | 'sold' | 'reviews'

interface Review {
  reviewId: number
  productId: number
  productName: string
  buyerNickname: string
  rating: number
  comment: string
  createDate: string
  isSatisfied: boolean
}

export function SellerDetailClient({
  seller,
  products: initialProducts,
}: SellerDetailClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('selling')
  const [products, setProducts] = useState<Product[]>(initialProducts || [])
  const [soldProducts, setSoldProducts] = useState<Product[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  console.log('🏪 SellerDetailClient 렌더링:', {
    seller,
    initialProducts,
    productsCount: products.length,
  })

  // 이미지 URL을 안전하게 추출하는 함수
  const getImageUrl = (
    image:
      | string
      | { imageUrl: string; id?: number; productId?: number }
      | undefined,
  ): string => {
    if (!image) return ''
    if (typeof image === 'string') return image
    return image.imageUrl || ''
  }

  // API 응답의 영어 status를 한국어로 변환
  const mapApiStatusToKorean = (apiStatus: string): string => {
    switch (apiStatus) {
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

  // 상품 데이터 매핑 함수
  const mapProductData = (productsData: any[]): Product[] => {
    return productsData.map((product: any) => ({
      productId: product.productId,
      name: product.name,
      description: product.description,
      category: product.category,
      initialPrice: product.initialPrice,
      currentPrice: product.currentPrice,
      auctionStartTime: product.auctionStartTime,
      auctionEndTime: product.auctionEndTime,
      status: mapApiStatusToKorean(product.status || 'BIDDING') as any,
      images: product.thumbnailUrl
        ? [product.thumbnailUrl]
        : product.images || [],
      thumbnailUrl: product.thumbnailUrl,
      seller: {
        id: String(product.seller?.id),
        nickname: product.seller?.nickname || '판매자',
        profileImage:
          product.seller?.profileImageUrl || product.seller?.profileImage,
        creditScore: product.seller?.creditScore || 0,
        reviewCount: product.seller?.reviewCount || 0,
      },
      location: product.location,
      createDate: product.createDate,
      modifyDate: product.modifyDate,
      bidderCount: product.bidderCount,
      deliveryMethod: product.deliveryMethod || 'BOTH',
    }))
  }

  // 판매자 상품 조회 (등록된 상품)
  const fetchSellerProducts = async () => {
    setIsLoading(true)
    setApiError('')
    try {
      const response = await productApi.getProductsByMember(+seller.id, {
        status: 'SELLING' as any,
      })
      if (response.success && response.data) {
        let productsData = []
        if (Array.isArray(response.data)) {
          productsData = response.data
        } else if (
          response.data.content &&
          Array.isArray(response.data.content)
        ) {
          productsData = response.data.content
        }

        setProducts(mapProductData(productsData))
      } else {
        setApiError(response.msg || '상품을 불러오는데 실패했습니다.')
      }
    } catch (error: any) {
      console.error('🏪 판매자 상품 조회 실패:', error)
      setApiError(
        error.response?.data?.msg || '상품을 불러오는데 실패했습니다.',
      )
    }
    setIsLoading(false)
  }

  // 판매완료 상품 조회
  const fetchSoldProducts = async () => {
    setIsLoading(true)
    setApiError('')
    try {
      const response = await productApi.getProductsByMember(+seller.id, {
        status: 'SOLD' as any,
      })
      if (response.success && response.data) {
        let productsData = []
        if (Array.isArray(response.data)) {
          productsData = response.data
        } else if (
          response.data.content &&
          Array.isArray(response.data.content)
        ) {
          productsData = response.data.content
        }

        setSoldProducts(mapProductData(productsData))
      } else {
        setApiError(response.msg || '판매완료 상품을 불러오는데 실패했습니다.')
      }
    } catch (error: any) {
      console.error('🏪 판매완료 상품 조회 실패:', error)
      setApiError(
        error.response?.data?.msg || '판매완료 상품을 불러오는데 실패했습니다.',
      )
    }
    setIsLoading(false)
  }

  // 판매자 리뷰 조회
  const fetchSellerReviews = async () => {
    setIsLoading(true)
    setApiError('')
    try {
      // 1. 판매완료 상품들 조회
      const productsResponse = await productApi.getProductsByMember(
        +seller.id,
        {
          status: 'SOLD' as any,
        },
      )
      let soldProductsData = []
      if (Array.isArray(productsResponse.data)) {
        soldProductsData = productsResponse.data
      } else if (
        productsResponse.data.content &&
        Array.isArray(productsResponse.data.content)
      ) {
        soldProductsData = productsResponse.data.content
      }

      // 2. 각 상품의 리뷰 조회
      const allReviews: Review[] = []
      for (const product of soldProductsData) {
        try {
          const reviewsResponse = await reviewApi.getReviewsByProduct(
            product.productId,
          )
          if (reviewsResponse.success && reviewsResponse.data) {
            const productReviews = reviewsResponse.data.map((review: any) => ({
              reviewId: review.reviewId,
              productId: product.productId,
              productName: product.name,
              buyerNickname: review.buyerNickname || '구매자',
              rating: review.rating || 0,
              comment: review.comment || '',
              createDate: review.createDate,
              isSatisfied: review.isSatisfied || false,
            }))
            allReviews.push(...productReviews)
          }
        } catch (error) {
          console.warn(`상품 ${product.productId} 리뷰 조회 실패:`, error)
        }
      }

      setReviews(allReviews)
    } catch (error: any) {
      console.error('🏪 판매자 리뷰 조회 실패:', error)
      setApiError(
        error.response?.data?.msg || '리뷰를 불러오는데 실패했습니다.',
      )
    }
    setIsLoading(false)
  }

  // 탭 변경 핸들러
  const handleTabChange = async (tab: TabType) => {
    setActiveTab(tab)
    setApiError('')

    // 이미 데이터가 있으면 다시 로드하지 않음
    switch (tab) {
      case 'selling':
        if (products.length === 0) {
          await fetchSellerProducts()
        }
        break
      case 'sold':
        if (soldProducts.length === 0) {
          await fetchSoldProducts()
        }
        break
      case 'reviews':
        if (reviews.length === 0) {
          await fetchSellerReviews()
        }
        break
    }
  }

  useEffect(() => {
    // 초기 로드 시 등록된 상품 먼저 로드
    const loadInitialData = async () => {
      if (!initialProducts || initialProducts.length === 0) {
        await fetchSellerProducts()
      }
    }

    loadInitialData()

    // 백그라운드에서 나머지 데이터 로드 (통계용)
    const loadBackgroundData = async () => {
      try {
        await Promise.all([fetchSoldProducts(), fetchSellerReviews()])
      } catch (error) {
        console.warn('백그라운드 데이터 로드 실패:', error)
      }
    }

    // 약간의 지연 후 백그라운드 로드
    setTimeout(loadBackgroundData, 500)
  }, [])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원'
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString || dateString === 'Invalid Date' || dateString === '') {
      return ''
    }
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return ''
      }
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    } catch {
      return ''
    }
  }

  const formatDisplayValue = (value: any, fallback: string = '') => {
    if (
      value === null ||
      value === undefined ||
      value === '' ||
      value === 'Invalid Date'
    ) {
      return fallback
    }
    return value
  }

  const getCreditScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600'
    if (score >= 60) return 'text-amber-600'
    return 'text-red-500'
  }

  const getCreditScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    if (score >= 60) return 'bg-amber-100 text-amber-800 border-amber-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { text: string; color: string } } = {
      '경매 중': { text: '경매중', color: 'bg-blue-100 text-blue-800' },
      '경매 시작 전': {
        text: '경매 시작 전',
        color: 'bg-gray-100 text-gray-800',
      },
      낙찰: { text: '낙찰', color: 'bg-green-100 text-green-800' },
      유찰: { text: '유찰', color: 'bg-red-100 text-red-800' },
    }
    return (
      statusMap[status] || {
        text: '알 수 없음',
        color: 'bg-gray-100 text-gray-800',
      }
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 판매자 프로필 헤더 */}
        <div className="relative mb-12 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 text-white shadow-2xl">
          {/* 배경 패턴 */}
          <div className="absolute inset-0 opacity-20">
            <div className="h-full w-full bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:20px_20px]"></div>
          </div>

          <div className="relative">
            <div className="flex flex-col items-center space-y-8 lg:flex-row lg:items-start lg:space-y-0 lg:space-x-12">
              {/* 판매자 아바타 */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="h-32 w-32 overflow-hidden rounded-full bg-white/20 shadow-2xl ring-4 ring-white/30 backdrop-blur-sm">
                    <div className="flex h-32 w-32 items-center justify-center">
                      <span className="text-4xl font-bold text-white">
                        {formatDisplayValue(seller.nickname, 'S')
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="absolute -right-2 -bottom-2 rounded-full bg-emerald-500 p-3 shadow-lg ring-4 ring-white">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>

              {/* 판매자 정보 */}
              <div className="min-w-0 flex-1 text-center lg:text-left">
                <div className="mb-8">
                  <h1 className="mb-4 text-5xl font-bold text-white drop-shadow-lg">
                    {formatDisplayValue(seller.nickname, '판매자')}
                  </h1>
                </div>

                {/* 판매자 통계 */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
                  <div className="rounded-2xl bg-white/15 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-white/20">
                    <div className="text-center">
                      <div className="mb-2 text-3xl font-bold text-white">
                        {products.length}
                      </div>
                      <div className="flex items-center justify-center text-sm text-white/90">
                        <Package className="mr-1 h-4 w-4" />
                        등록 상품
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/15 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-white/20">
                    <div className="text-center">
                      <div className="mb-2 text-3xl font-bold text-white">
                        {soldProducts.length}
                      </div>
                      <div className="flex items-center justify-center text-sm text-white/90">
                        <CheckCircle className="mr-1 h-4 w-4" />
                        판매 완료
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/15 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-white/20">
                    <div className="text-center">
                      <div className="mb-2 text-3xl font-bold text-white">
                        {seller.creditScore}
                      </div>
                      <div className="flex items-center justify-center text-sm text-white/90">
                        <Star className="mr-1 h-4 w-4" />
                        신뢰도 점수
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/15 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-white/20">
                    <div className="text-center">
                      <div className="mb-2 text-3xl font-bold text-white">
                        {reviews.length}
                      </div>
                      <div className="flex items-center justify-center text-sm text-white/90">
                        <MessageSquare className="mr-1 h-4 w-4" />
                        리뷰 수
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="mb-8">
          <div className="flex space-x-1 rounded-2xl bg-white/80 p-2 shadow-lg backdrop-blur-sm">
            <button
              onClick={() => handleTabChange('selling')}
              className={`flex flex-1 items-center justify-center space-x-2 rounded-xl px-6 py-4 font-semibold transition-all duration-300 ${
                activeTab === 'selling'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
              }`}
            >
              <Package className="h-5 w-5" />
              <span>판매상품</span>
              <span className="rounded-full bg-white/20 px-2 py-1 text-xs">
                {products.length}
              </span>
            </button>
            <button
              onClick={() => handleTabChange('sold')}
              className={`flex flex-1 items-center justify-center space-x-2 rounded-xl px-6 py-4 font-semibold transition-all duration-300 ${
                activeTab === 'sold'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
              }`}
            >
              <CheckCircle className="h-5 w-5" />
              <span>판매완료</span>
              <span className="rounded-full bg-white/20 px-2 py-1 text-xs">
                {soldProducts.length}
              </span>
            </button>
            <button
              onClick={() => handleTabChange('reviews')}
              className={`flex flex-1 items-center justify-center space-x-2 rounded-xl px-6 py-4 font-semibold transition-all duration-300 ${
                activeTab === 'reviews'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
              }`}
            >
              <MessageSquare className="h-5 w-5" />
              <span>리뷰</span>
              <span className="rounded-full bg-white/20 px-2 py-1 text-xs">
                {reviews.length}
              </span>
            </button>
          </div>
        </div>

        {/* 탭 콘텐츠 */}
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-lg text-gray-600">데이터를 불러오는 중...</p>
          </div>
        ) : (
          <>
            {/* 등록된 상품 탭 */}
            {activeTab === 'selling' && (
              <>
                {products.length === 0 ? (
                  <Card className="overflow-hidden border-0 bg-white/80 shadow-xl backdrop-blur-sm">
                    <CardContent className="py-20 text-center">
                      <div className="mb-8">
                        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-gray-100 to-gray-200">
                          <Package className="h-12 w-12 text-gray-400" />
                        </div>
                        <h3 className="mb-4 text-2xl font-bold text-gray-900">
                          등록된 상품이 없습니다
                        </h3>
                        <p className="text-lg text-gray-600">
                          이 판매자는 아직 상품을 등록하지 않았습니다.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {products.map((product) => {
                      const statusInfo = getStatusBadge(product.status)
                      return (
                        <Card
                          key={product.productId}
                          className="group overflow-hidden border-0 bg-white/80 shadow-lg backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
                        >
                          <CardContent className="p-0">
                            <div className="space-y-0">
                              {/* 상품 이미지 */}
                              <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                                {product.thumbnailUrl ||
                                (product.images && product.images[0]) ? (
                                  <img
                                    src={
                                      product.thumbnailUrl ||
                                      getImageUrl(product.images[0])
                                    }
                                    alt={product.name}
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center">
                                    <div className="text-center">
                                      <Package className="mx-auto mb-2 h-12 w-12 text-gray-400" />
                                      <p className="text-sm text-gray-500">
                                        이미지 준비중
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* 카테고리 배지 */}
                                <div className="absolute top-4 left-4">
                                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-700 shadow-lg backdrop-blur-sm">
                                    {formatDisplayValue(
                                      product.category,
                                      '기타',
                                    )}
                                  </span>
                                </div>

                                {/* 상태 배지 */}
                                <div className="absolute top-4 right-4">
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${statusInfo.color} shadow-lg`}
                                  >
                                    {statusInfo.text}
                                  </span>
                                </div>
                              </div>

                              {/* 상품 정보 */}
                              <div className="space-y-4 p-6">
                                <h3 className="line-clamp-2 text-lg font-bold text-gray-900 transition-colors duration-300 group-hover:text-indigo-600">
                                  {formatDisplayValue(
                                    product.name,
                                    '상품명 없음',
                                  )}
                                </h3>

                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-2xl font-bold text-transparent">
                                      {formatPrice(product.currentPrice)}
                                    </span>
                                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                                      <Users className="h-4 w-4" />
                                      <span>
                                        {formatDisplayValue(
                                          product.bidderCount,
                                          '0',
                                        )}
                                        명
                                      </span>
                                    </div>
                                  </div>

                                  {formatDate(product.createDate) && (
                                    <div className="flex items-center justify-between text-sm text-gray-500">
                                      <div className="flex items-center space-x-1">
                                        <Calendar className="h-4 w-4" />
                                        <span>등록일</span>
                                      </div>
                                      <span>
                                        {formatDate(product.createDate)}
                                      </span>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between text-sm text-gray-500">
                                    <div className="flex items-center space-x-1">
                                      <MapPin className="h-4 w-4" />
                                      <span>거래지역</span>
                                    </div>
                                    {product.location ? (
                                      <span className="text-sm text-gray-600">
                                        {product.location}
                                      </span>
                                    ) : (
                                      <span className="text-sm text-gray-600">
                                        배송만 가능
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* 액션 버튼 */}
                              <div className="p-6 pt-0">
                                <Button
                                  className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl"
                                  onClick={() =>
                                    router.push(
                                      `/products/${product.productId}`,
                                    )
                                  }
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  상품 보기
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* 판매완료 상품 탭 */}
            {activeTab === 'sold' && (
              <>
                {soldProducts.length === 0 ? (
                  <Card className="overflow-hidden border-0 bg-white/80 shadow-xl backdrop-blur-sm">
                    <CardContent className="py-20 text-center">
                      <div className="mb-8">
                        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-emerald-100 to-teal-200">
                          <CheckCircle className="h-12 w-12 text-emerald-400" />
                        </div>
                        <h3 className="mb-4 text-2xl font-bold text-gray-900">
                          판매완료 상품이 없습니다
                        </h3>
                        <p className="text-lg text-gray-600">
                          아직 판매가 완료된 상품이 없습니다.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {soldProducts.map((product) => {
                      const statusInfo = getStatusBadge(product.status)
                      return (
                        <Card
                          key={product.productId}
                          className="group overflow-hidden border-0 bg-white/80 shadow-lg backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
                        >
                          <CardContent className="p-0">
                            <div className="space-y-0">
                              {/* 상품 이미지 */}
                              <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                                {product.thumbnailUrl ||
                                (product.images && product.images[0]) ? (
                                  <img
                                    src={
                                      product.thumbnailUrl ||
                                      getImageUrl(product.images[0])
                                    }
                                    alt={product.name}
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center">
                                    <div className="text-center">
                                      <Package className="mx-auto mb-2 h-12 w-12 text-gray-400" />
                                      <p className="text-sm text-gray-500">
                                        이미지 준비중
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* 카테고리 배지 */}
                                <div className="absolute top-4 left-4">
                                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-700 shadow-lg backdrop-blur-sm">
                                    {formatDisplayValue(
                                      product.category,
                                      '기타',
                                    )}
                                  </span>
                                </div>

                                {/* 상태 배지 */}
                                <div className="absolute top-4 right-4">
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${statusInfo.color} shadow-lg`}
                                  >
                                    {statusInfo.text}
                                  </span>
                                </div>
                              </div>

                              {/* 상품 정보 */}
                              <div className="space-y-4 p-6">
                                <h3 className="line-clamp-2 text-lg font-bold text-gray-900 transition-colors duration-300 group-hover:text-emerald-600">
                                  {formatDisplayValue(
                                    product.name,
                                    '상품명 없음',
                                  )}
                                </h3>

                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-2xl font-bold text-transparent">
                                      {formatPrice(product.currentPrice)}
                                    </span>
                                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                                      <Users className="h-4 w-4" />
                                      <span>
                                        {formatDisplayValue(
                                          product.bidderCount,
                                          '0',
                                        )}
                                        명
                                      </span>
                                    </div>
                                  </div>

                                  {formatDate(product.createDate) && (
                                    <div className="flex items-center justify-between text-sm text-gray-500">
                                      <div className="flex items-center space-x-1">
                                        <Calendar className="h-4 w-4" />
                                        <span>등록일</span>
                                      </div>
                                      <span>
                                        {formatDate(product.createDate)}
                                      </span>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between text-sm text-gray-500">
                                    <div className="flex items-center space-x-1">
                                      <MapPin className="h-4 w-4" />
                                      <span>거래지역</span>
                                    </div>
                                    {product.location ? (
                                      <span className="text-sm text-gray-600">
                                        {product.location}
                                      </span>
                                    ) : (
                                      <span className="text-sm text-gray-600">
                                        배송만 가능
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* 액션 버튼 */}
                              <div className="p-6 pt-0">
                                <Button
                                  className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:from-emerald-700 hover:to-teal-700 hover:shadow-xl"
                                  onClick={() =>
                                    router.push(
                                      `/products/${product.productId}`,
                                    )
                                  }
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  상품 보기
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* 리뷰 탭 */}
            {activeTab === 'reviews' && (
              <>
                {reviews.length === 0 ? (
                  <Card className="overflow-hidden border-0 bg-white/80 shadow-xl backdrop-blur-sm">
                    <CardContent className="py-20 text-center">
                      <div className="mb-8">
                        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-amber-100 to-orange-200">
                          <MessageSquare className="h-12 w-12 text-amber-400" />
                        </div>
                        <h3 className="mb-4 text-2xl font-bold text-gray-900">
                          등록된 리뷰가 없습니다
                        </h3>
                        <p className="text-lg text-gray-600">
                          아직 이 판매자에 대한 리뷰가 없습니다.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <Card
                        key={review.reviewId}
                        className="overflow-hidden border-0 bg-white/80 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl"
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start space-x-4">
                            {/* 리뷰어 아바타 */}
                            <div className="flex-shrink-0">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-600">
                                <span className="text-lg font-bold text-white">
                                  {review.buyerNickname.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>

                            {/* 리뷰 내용 */}
                            <div className="flex-1">
                              <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <h4 className="text-lg font-semibold text-gray-900">
                                    {review.buyerNickname}
                                  </h4>
                                  <div className="flex items-center space-x-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`h-4 w-4 ${
                                          i < (review.isSatisfied ? 5 : 2)
                                            ? 'fill-current text-amber-400'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <span className="text-sm text-gray-500">
                                  {formatDate(review.createDate)}
                                </span>
                              </div>

                              <p className="mb-3 leading-relaxed text-gray-700">
                                {review.comment}
                              </p>

                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-500">
                                  상품:
                                </span>
                                <span className="text-sm font-medium text-indigo-600">
                                  {review.productName}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
