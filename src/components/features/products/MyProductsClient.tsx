'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { useWebSocketMyAuctions } from '@/hooks/useWebSocketMyAuctions'
import { productApi } from '@/lib/api'
import { handleApiError } from '@/lib/api/common'
import { Product } from '@/types'
import { MyProductsParams } from '@/types/api-types'
import { Edit, Trash2, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface MyProductsClientProps {
  initialProducts?: Product[]
}

export function MyProductsClient({ initialProducts }: MyProductsClientProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [selectedTab, setSelectedTab] = useState<
    '경매 시작 전' | '경매 중' | '낙찰' | '유찰'
  >('경매 시작 전')
  const [sortBy, setSortBy] = useState<'LATEST' | 'POPULAR'>('LATEST')
  const [products, setProducts] = useState(initialProducts || [])
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  // WebSocket 내 경매 실시간 모니터링
  const { myAuctionUpdates, isSubscribed: isMyAuctionsSubscribed } =
    useWebSocketMyAuctions(user?.id || null)

  // 실시간 업데이트를 상품 목록에 반영
  useEffect(() => {
    if (myAuctionUpdates.length > 0) {
      setProducts((prevProducts) => {
        return prevProducts.map((product) => {
          const update = myAuctionUpdates.find(
            (update) => update.productId === product.productId,
          )
          if (update) {
            return {
              ...product,
              currentPrice: update.currentPrice,
              bidCount: update.bidCount,
              status: mapApiStatusToKorean(update.status),
            } as any
          }
          return product
        })
      })
    }
  }, [myAuctionUpdates])

  // 내 상품 목록 조회
  const fetchMyProducts = async (params?: MyProductsParams) => {
    setIsLoading(true)
    setApiError('')
    try {
      console.log('🔍 API 요청 파라미터:', params)
      const response = await productApi.getMyProducts(params)
      console.log('📦 API 응답:', response)

      if (response.success && response.data) {
        // API 응답 데이터 구조에 맞게 변환
        let productsData = []
        if (Array.isArray(response.data)) {
          productsData = response.data
        } else if (
          response.data.content &&
          Array.isArray(response.data.content)
        ) {
          productsData = response.data.content
        }
        // API 응답의 status를 한글로 변환
        const processedProducts = productsData.map((product: any) => ({
          ...product,
          status: mapApiStatusToKorean(product.status),
        }))

        console.log('📋 처리된 상품 데이터:', processedProducts)
        setProducts(processedProducts)
      } else {
        console.error('❌ API 응답 실패:', response)
        setApiError(response.message || response.msg || '상품 목록을 불러오는데 실패했습니다.')
      }
    } catch (error: any) {
      console.error('❌ 내 상품 목록 조회 실패:', error)
      // 백엔드 에러 메시지 그대로 표시
      const apiError = handleApiError(error)
      setApiError(apiError.message)
    }
    setIsLoading(false)
  }

  // 상품 삭제
  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('정말로 이 상품을 삭제하시겠습니까?')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await productApi.deleteProduct(productId)
      if (response.success) {
        alert('상품이 성공적으로 삭제되었습니다.')
        // 현재 탭과 정렬 상태를 유지하면서 목록 새로고침
        fetchMyProducts({
          status: mapTabToApiStatus(selectedTab),
          sort: sortBy,
        })
      } else {
        setApiError(response.message || response.msg || '상품 삭제에 실패했습니다.')
      }
    } catch (error: any) {
      console.error('상품 삭제 실패:', error)
      // 백엔드 에러 메시지 그대로 표시
      const apiError = handleApiError(error)
      setApiError(apiError.message)
    }
    setIsLoading(false)
  }

  // 한국어 탭을 영어 API 파라미터로 매핑
  const mapTabToApiStatus = (
    tab: '경매 시작 전' | '경매 중' | '낙찰' | '유찰',
  ): 'BEFORE_START' | 'SELLING' | 'SOLD' | 'FAILED' | undefined => {
    switch (tab) {
      case '경매 시작 전':
        return 'BEFORE_START'
      case '경매 중':
        return 'SELLING'
      case '낙찰':
        return 'SOLD'
      case '유찰':
        return 'FAILED'
      default:
        return undefined
    }
  }

  // API 응답의 영어 status를 한국어로 변환
  const mapApiStatusToKorean = (apiStatus: string): string => {
    switch (apiStatus) {
      case 'BEFORE_START':
        return '경매 시작 전'
      case 'SELLING':
        return '경매 중'
      case 'SOLD':
        return '낙찰'
      case 'FAILED':
        return '유찰'
      default:
        return apiStatus // 알 수 없는 상태는 그대로 반환
    }
  }

  // 탭 변경 핸들러
  const handleTabChange = (
    tab: '경매 시작 전' | '경매 중' | '낙찰' | '유찰',
  ) => {
    setSelectedTab(tab)
    const apiStatus = mapTabToApiStatus(tab)
    fetchMyProducts({ status: apiStatus, sort: sortBy })
  }

  // 정렬 변경 핸들러
  const handleSortChange = (sort: 'LATEST' | 'POPULAR') => {
    setSortBy(sort)
    const apiStatus = mapTabToApiStatus(selectedTab)
    fetchMyProducts({ status: apiStatus, sort })
  }

  // 컴포넌트 마운트 시 상품 목록 조회
  useEffect(() => {
    if (!initialProducts || initialProducts.length === 0) {
      const apiStatus = mapTabToApiStatus(selectedTab)
      fetchMyProducts({ status: apiStatus, sort: sortBy })
    }
  }, [])

  // 탭이나 정렬이 변경될 때마다 API 호출
  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      // 초기 데이터가 있는 경우에만 API 호출
      const apiStatus = mapTabToApiStatus(selectedTab)
      fetchMyProducts({ status: apiStatus, sort: sortBy })
    }
  }, [selectedTab, sortBy, initialProducts])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원'
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
        return { label: '경매 시작 전', variant: 'neutral' as const }
      case '경매 중':
        return { label: '경매 중', variant: 'primary' as const }
      case '낙찰':
        return { label: '낙찰', variant: 'success' as const }
      case '유찰':
        return { label: '유찰', variant: 'warning' as const }
      default:
        return { label: status || '알 수 없음', variant: 'neutral' as const }
    }
  }

  // API에서 이미 필터링된 데이터를 받으므로 그대로 사용
  const filteredProducts = products

  const statusTabs = [
    { id: '경매 시작 전' as const, label: '경매 시작 전' },
    { id: '경매 중' as const, label: '경매 중' },
    { id: '낙찰' as const, label: '낙찰' },
    { id: '유찰' as const, label: '유찰' },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* API 에러 메시지 */}
      {apiError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                오류가 발생했습니다
              </h3>
              <div className="mt-1 text-sm text-red-700">{apiError}</div>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setApiError('')}
                className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 실시간 연결 상태 */}
      {isMyAuctionsSubscribed && (
        <div className="mb-4 flex items-center justify-center space-x-2 rounded-lg bg-green-50 p-3">
          <Zap className="h-4 w-4 animate-pulse text-green-500" />
          <span className="text-sm text-green-700">
            내 경매 실시간 모니터링 중
          </span>
        </div>
      )}

      {/* 상품 목록 탭 */}
      <div className="mb-6">
        <div className="flex space-x-1 rounded-lg bg-neutral-100 p-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                selectedTab === tab.id
                  ? 'text-primary-600 bg-white shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 정렬 옵션 */}
        <div className="mt-4 flex justify-end">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-neutral-600">정렬:</span>
            <div className="flex space-x-1 rounded-lg bg-neutral-100 p-1">
              <button
                onClick={() => handleSortChange('LATEST')}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  sortBy === 'LATEST'
                    ? 'text-primary-600 bg-white shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                최신 등록순
              </button>
              <button
                onClick={() => handleSortChange('POPULAR')}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  sortBy === 'POPULAR'
                    ? 'text-primary-600 bg-white shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                인기순
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 상품 목록 */}
      <div className="space-y-4">
        {filteredProducts.length === 0 ? (
          <Card variant="outlined">
            <CardContent className="py-12 text-center">
              <div className="mb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                  <span className="text-2xl">📦</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                  {selectedTab === '경매 시작 전' &&
                    '경매 시작 전인 상품이 없습니다'}
                  {selectedTab === '경매 중' && '현재 진행중인 경매가 없습니다'}
                  {selectedTab === '낙찰' && '낙찰된 상품이 없습니다'}
                  {selectedTab === '유찰' && '유찰된 상품이 없습니다'}
                </h3>
                <p className="mb-4 text-neutral-600">
                  {selectedTab === '경매 시작 전' &&
                    '새로운 상품을 등록해보세요'}
                  {selectedTab === '경매 중' && '새로운 상품을 등록해보세요'}
                  {selectedTab === '낙찰' && '상품을 판매해보세요'}
                  {selectedTab === '유찰' && '상품을 판매해보세요'}
                </p>
                <Button onClick={() => router.push('/register-product')}>
                  {selectedTab === '경매 시작 전' && '+ 첫 상품 등록하기'}
                  {selectedTab === '경매 중' && '+ 첫 상품 등록하기'}
                  {selectedTab === '낙찰' && '+ 새 상품 등록하기'}
                  {selectedTab === '유찰' && '+ 상품 등록하기'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredProducts.map((product) => {
            const statusBadge = getStatusBadge(product.status)

            return (
              <Card
                key={product.productId}
                variant="outlined"
                className="transition-shadow hover:shadow-md"
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* 상품 이미지 */}
                    <div className="flex-shrink-0">
                      <div className="h-24 w-24 overflow-hidden rounded-xl bg-neutral-100 shadow-sm">
                        {product.thumbnailUrl ? (
                          <img
                            src={product.thumbnailUrl}
                            alt={product.name}
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
                        <Badge
                          variant={statusBadge.variant}
                          className="text-xs"
                        >
                          {statusBadge.label}
                        </Badge>
                        <span className="text-sm text-neutral-500">
                          {product.category}
                        </span>
                      </div>

                      <h3 className="mb-3 line-clamp-2 text-xl font-bold text-neutral-900">
                        {product.name}
                      </h3>

                      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg bg-neutral-50 p-3">
                          <div className="mb-1 text-xs text-neutral-600">
                            현재가
                          </div>
                          <div className="text-primary-600 text-lg font-bold">
                            {formatPrice(product.currentPrice)}
                          </div>
                        </div>
                        <div className="rounded-lg bg-neutral-50 p-3">
                          <div className="mb-1 text-xs text-neutral-600">
                            참여자
                          </div>
                          <div className="text-lg font-semibold text-neutral-900">
                            {product.bidderCount || 0}명
                          </div>
                        </div>
                      </div>

                      <div className="mb-4 text-sm text-neutral-600">
                        <div className="flex items-center space-x-2">
                          <svg
                            className="h-4 w-4 text-neutral-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>
                            종료: {formatDate(product.auctionEndTime)}
                          </span>
                        </div>
                      </div>

                      {/* 액션 버튼들 */}
                      <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-2">
                        {product.status === '경매 시작 전' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                router.push(
                                  `/products/${product.productId}/edit`,
                                )
                              }
                              className="flex-1"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              상품 수정
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleDeleteProduct(product.productId)
                              }
                              disabled={isLoading}
                              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              상품 삭제
                            </Button>
                          </>
                        )}
                        {product.status === '경매 중' && (
                          <div className="w-full text-center text-sm text-neutral-500">
                            경매가 진행 중입니다
                          </div>
                        )}
                        {product.status === '유찰' && (
                          <Button
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/register-product?relist=${product.productId}`,
                              )
                            }
                            className="bg-primary-600 hover:bg-primary-700 w-full"
                          >
                            재경매 등록
                          </Button>
                        )}
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
