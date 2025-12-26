'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { useWebSocketMyAuctions } from '@/hooks/useWebSocketMyAuctions'
import { productApi } from '@/lib/api'
import { handleApiError } from '@/lib/api/common'
import { getFullImageUrl } from '@/lib/utils/image-url'
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast'
import { Product } from '@/types'
import {
  Clock,
  Edit,
  Heart,
  MessageSquare,
  Send,
  Trash2,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface MyProductsClientProps {
  initialProducts?: Product[]
}

export function MyProductsClient({ initialProducts }: MyProductsClientProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [sortBy, setSortBy] = useState<'LATEST' | 'POPULAR'>('LATEST')
  const [products, setProducts] = useState(initialProducts || [])
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  // QnA 모달 관련 상태
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  )
  const [isQnaModalOpen, setIsQnaModalOpen] = useState(false)
  const [qnaList, setQnaList] = useState<any[]>([])
  const [isQnaLoading, setIsQnaLoading] = useState(false)
  const [newAnswers, setNewAnswers] = useState<Record<number, string>>({})

  // apiError가 변경되면 토스트로 표시
  useEffect(() => {
    if (apiError) {
      showErrorToast(apiError)
      setApiError('') // 토스트 표시 후 초기화
    }
  }, [apiError])

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
              status: mapApiStatusToDisplay(update.status, update),
            } as any
          }
          return product
        })
      })
    }
  }, [myAuctionUpdates])

  // 내 상품 목록 조회
  const fetchMyProducts = async () => {
    setIsLoading(true)
    setApiError('')
    try {
      const response: any = await productApi.getMyProducts()

      if (response.success && response.data) {
        // API 응답 데이터 구조에 맞게 변환
        let productsData = []
        if (Array.isArray(response.data)) {
          productsData = response.data
        } else if (
          response.data.products &&
          Array.isArray(response.data.products)
        ) {
          productsData = response.data.products
        } else if (
          response.data.content &&
          Array.isArray(response.data.content)
        ) {
          productsData = response.data.content
        }
        // API 응답의 status를 새로운 상태로 변환
        // 경매가 없으면 PENDING, 여러 경매가 있으면 가장 최근 경매의 상태 사용
        const processedProducts = productsData.map((product: any) => {
          // 가장 최근 경매 정보 가져오기 (auctions 배열이 있다면)
          const latestAuction = product.auctions?.[0] || product.auction
          const displayStatus = mapApiStatusToDisplay(
            product.status,
            latestAuction,
          )
          return {
            ...product,
            status: displayStatus,
            latestAuction, // 최근 경매 정보도 함께 저장
            // 응답 필드명 매핑
            thumbnailUrl: product.imageUrl || product.thumbnailUrl,
            currentPrice:
              product.currentHighestBid || product.currentPrice || 0,
            initialPrice: product.startPrice || product.initialPrice || 0,
            bidderCount: product.bidCount || product.bidderCount || 0,
            auctionEndTime: product.endAt || product.auctionEndTime,
          }
        })

        console.log('📋 처리된 상품 데이터:', processedProducts)
        setProducts(processedProducts)
      } else {
        console.error('❌ API 응답 실패:', response)
        setApiError(
          response.message ||
            response.msg ||
            '상품 목록을 불러오는데 실패했습니다.',
        )
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
        showSuccessToast('상품이 성공적으로 삭제되었습니다.')
        // 정렬 상태를 유지하면서 목록 새로고침 (상태 필터링 제거)
        fetchMyProducts()
      } else {
        setApiError(
          response.message || response.msg || '상품 삭제에 실패했습니다.',
        )
      }
    } catch (error: any) {
      console.error('상품 삭제 실패:', error)
      // 백엔드 에러 메시지 그대로 표시
      const apiError = handleApiError(error)
      setApiError(apiError.message)
    }
    setIsLoading(false)
  }

  // API 응답의 영어 status를 새로운 상태로 변환
  // 경매가 없으면 PENDING, 여러 경매가 있으면 가장 최근 경매의 상태 사용
  const mapApiStatusToDisplay = (apiStatus: string, auction?: any): string => {
    // 경매가 없으면 PENDING
    if (!auction) {
      return 'PENDING'
    }

    // API 상태를 새로운 상태로 매핑
    switch (apiStatus) {
      case 'BEFORE_START':
        return 'SCHEDULED' // 경매 등록 완료, 시작 대기 중
      case 'SELLING':
        return 'LIVE' // 경매 진행 중
      case 'SOLD':
      case 'FAILED':
        return 'ENDED' // 경매 마감 (낙찰/유찰)
      case 'PENDING':
        return 'PENDING' // 경매 등록 전
      case 'SCHEDULED':
        return 'SCHEDULED' // 경매 등록 완료, 시작 대기 중
      case 'LIVE':
        return 'LIVE' // 경매 진행 중
      case 'ENDED':
        return 'ENDED' // 경매 마감
      default:
        return apiStatus || 'PENDING' // 알 수 없는 상태는 PENDING으로 기본값
    }
  }

  // 표시용 상태를 한국어로 변환
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'PENDING':
        return '경매 등록 전'
      case 'SCHEDULED':
        return '경매 시작 대기'
      case 'LIVE':
        return '경매 진행 중'
      case 'ENDED':
        return '경매 마감'
      default:
        return status || '알 수 없음'
    }
  }

  // 정렬 변경 핸들러
  const handleSortChange = (sort: 'LATEST' | 'POPULAR') => {
    setSortBy(sort)
    fetchMyProducts()
  }

  // 컴포넌트 마운트 시 상품 목록 조회
  useEffect(() => {
    if (!initialProducts || initialProducts.length === 0) {
      fetchMyProducts()
    }
  }, [])

  // 정렬이 변경될 때마다 API 호출
  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      // 초기 데이터가 있는 경우에만 API 호출
      fetchMyProducts()
    }
  }, [sortBy, initialProducts])

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
      case 'PENDING':
        return { label: '경매 등록 전', variant: 'neutral' as const }
      case 'SCHEDULED':
        return { label: '경매 시작 대기', variant: 'secondary' as const }
      case 'LIVE':
        return { label: '경매 진행 중', variant: 'primary' as const }
      case 'ENDED':
        return { label: '경매 마감', variant: 'success' as const }
      default:
        return {
          label: getStatusLabel(status) || '알 수 없음',
          variant: 'neutral' as const,
        }
    }
  }

  // QnA 목록 조회
  const fetchQnaList = async (productId: number) => {
    setIsQnaLoading(true)
    try {
      const response = await productApi.getQna(productId, {
        page: 0,
        size: 100,
      })
      if (response.success && response.data) {
        setQnaList(response.data.productQnAResponses || [])
      }
    } catch (error) {
      console.error('QnA 목록 조회 실패:', error)
      showErrorToast('QnA 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsQnaLoading(false)
    }
  }

  // QnA 모달 열기
  const handleOpenQnaModal = (productId: number) => {
    setSelectedProductId(productId)
    setIsQnaModalOpen(true)
    setNewAnswers({})
    fetchQnaList(productId)
  }

  // QnA 답변 등록
  const handleAddAnswer = async (qnaId: number) => {
    if (!selectedProductId) return

    const answer = newAnswers[qnaId]
    if (!answer?.trim()) {
      showErrorToast('답변을 입력해주세요.')
      return
    }

    try {
      const response = await productApi.addAnswer(
        selectedProductId,
        qnaId,
        answer,
      )
      if (response.success) {
        setNewAnswers((prev) => ({ ...prev, [qnaId]: '' }))
        fetchQnaList(selectedProductId)
        showSuccessToast('답변이 등록되었습니다.')
      } else {
        showErrorToast(
          response.message || response.msg || '답변 등록에 실패했습니다.',
        )
      }
    } catch (error: any) {
      console.error('답변 등록 실패:', error)
      const apiError = handleApiError(error)
      showErrorToast(apiError.message)
    }
  }

  // QnA 답변 삭제
  const handleDeleteAnswer = async (qnaId: number, answerId: number) => {
    if (!selectedProductId) return

    if (!confirm('답변을 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await productApi.deleteAnswer(
        selectedProductId,
        qnaId,
        answerId,
      )
      if (response.success) {
        fetchQnaList(selectedProductId)
        showSuccessToast('답변이 삭제되었습니다.')
      } else {
        showErrorToast(
          response.message || response.msg || '답변 삭제에 실패했습니다.',
        )
      }
    } catch (error: any) {
      const apiError = handleApiError(error)
      showErrorToast(apiError.message)
    }
  }

  // 전체 상품 목록을 상태별로 표시 (필터링 없음)
  const filteredProducts = products

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* API 에러 메시지 */}
      {apiError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center">
            <div className="shrink-0">
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
                className="inline-flex shrink-0 rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100"
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
      {/* 상품 목록 */};
      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full">
            <Card variant="outlined">
              <CardContent className="py-12 text-center">
                <div className="mb-4">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                    <span className="text-2xl">📦</span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                    등록한 상품이 없습니다
                  </h3>
                  <p className="mb-4 text-neutral-600">
                    새로운 상품을 등록해보세요
                  </p>
                  <Button onClick={() => router.push('/register-product')}>
                    + 첫 상품 등록하기
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredProducts.map((product, index) => {
            const statusBadge = getStatusBadge(product.status)
            const imageUrl = getFullImageUrl(
              (product as any).thumbnailUrl || (product as any).imageUrl,
            )

            return (
              <Card
                key={product.productId}
                variant="elevated"
                hover
                className="animate-fade-in group flex flex-col overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="flex flex-1 flex-col p-0">
                  {/* 상품 이미지 */}
                  <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-neutral-100 to-neutral-200">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="text-5xl text-neutral-400">📦</span>
                      </div>
                    )}
                    {/* 상태 배지 (이미지 위) */}
                    <div className="absolute top-3 left-3">
                      <Badge
                        variant={statusBadge.variant}
                        className="shadow-lg backdrop-blur-sm"
                      >
                        {statusBadge.label}
                      </Badge>
                    </div>
                    {/* 통계 정보 (이미지 위) */}
                    <div className="absolute top-3 right-3 flex items-center space-x-2 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
                      {(product as any).bookmarkCount !== undefined &&
                        (product as any).bookmarkCount > 0 && (
                          <div className="flex items-center space-x-1">
                            <Heart className="h-3 w-3 fill-current" />
                            <span>{(product as any).bookmarkCount}</span>
                          </div>
                        )}
                      {(product as any).bidCount !== undefined &&
                        (product as any).bidCount > 0 && (
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="h-3 w-3" />
                            <span>{(product as any).bidCount}</span>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* 상품 정보 */}
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="group-hover:text-primary-600 mb-3 line-clamp-2 text-lg font-bold text-neutral-900 transition-colors">
                      {product.name}
                    </h3>

                    {/* 가격 및 통계 */}
                    <div className="mb-4 grid grid-cols-2 gap-3">
                      <div className="from-primary-50 to-primary-100/50 rounded-xl bg-gradient-to-br p-3">
                        <div className="mb-1 flex items-center space-x-1 text-xs text-neutral-600">
                          {(product as any).status === 'PENDING' ? (
                            <>
                              <Zap className="h-3 w-3" />
                              <span>시작가</span>
                            </>
                          ) : (
                            <>
                              <TrendingUp className="h-3 w-3" />
                              <span>현재가</span>
                            </>
                          )}
                        </div>
                        <div className="text-primary-600 text-lg font-bold">
                          {(product as any).status === 'PENDING'
                            ? formatPrice((product as any).initialPrice || 0)
                            : formatPrice((product as any).currentPrice || 0)}
                        </div>
                      </div>
                      <div className="rounded-xl bg-neutral-50 p-3">
                        <div className="mb-1 text-xs text-neutral-600">
                          {(product as any).status === 'PENDING'
                            ? '상태'
                            : '입찰 수'}
                        </div>
                        <div className="text-lg font-semibold text-neutral-900">
                          {(product as any).status === 'PENDING'
                            ? '경매 등록 전'
                            : `${(product as any).bidCount || 0}건`}
                        </div>
                      </div>
                    </div>

                    {/* 경매 종료 시간 */}
                    {(product as any).auctionEndTime && (
                      <div className="mb-4 flex items-center space-x-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                        <Clock className="h-4 w-4 text-neutral-400" />
                        <span>
                          종료: {formatDate((product as any).auctionEndTime)}
                        </span>
                      </div>
                    )}

                    {/* 액션 버튼들 */}
                    <div className="mt-auto flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
                      {/* QnA 관리 버튼 (모든 상태에서 표시) */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenQnaModal(product.productId)}
                        className="border-primary-200 text-primary-600 hover:bg-primary-50 w-full"
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        QnA 관리
                      </Button>

                      {(product as any).status === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/products/${product.productId}/register-auction`,
                              )
                            }
                            className="bg-primary-600 hover:bg-primary-700 flex-1 shadow-sm"
                          >
                            <Zap className="mr-2 h-4 w-4" />
                            경매 등록
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              router.push(`/products/${product.productId}/edit`)
                            }
                            className="flex-1"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            수정
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleDeleteProduct(product.productId)
                            }
                            disabled={isLoading}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {(product as any).status === 'SCHEDULED' && (
                        <div className="w-full rounded-lg bg-blue-50 px-4 py-3 text-center text-sm text-blue-700">
                          <Clock className="mx-auto mb-1 h-5 w-5" />
                          경매 시작을 기다리는 중입니다
                        </div>
                      )}
                      {(product as any).status === 'LIVE' && (
                        <div className="w-full rounded-lg bg-green-50 px-4 py-3 text-center text-sm text-green-700">
                          <Zap className="mx-auto mb-1 h-5 w-5 animate-pulse" />
                          경매가 진행 중입니다
                        </div>
                      )}
                      {(product as any).status === 'ENDED' && (
                        <Button
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/register-product?relist=${product.productId}`,
                            )
                          }
                          className="bg-primary-600 hover:bg-primary-700 w-full"
                        >
                          <Zap className="mr-2 h-4 w-4" />
                          재경매 등록
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
      {/* QnA 관리 모달 */};
      <Dialog open={isQnaModalOpen} onOpenChange={setIsQnaModalOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden p-0">
          <div className="flex flex-col">
            {/* 헤더 */}
            <div className="border-b border-neutral-200 bg-white px-6 py-4">
              <DialogHeader className="space-y-1">
                <DialogTitle className="flex items-center space-x-2 text-xl">
                  <MessageSquare className="text-primary-600 h-5 w-5" />
                  <span>QnA 관리</span>
                </DialogTitle>
                <DialogDescription className="text-sm">
                  상품에 대한 문의를 확인하고 답변을 작성할 수 있습니다.
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* 콘텐츠 영역 (스크롤 가능) */}
            <div className="overflow-y-auto px-6 py-4">
              {isQnaLoading ? (
                <div className="flex min-h-[300px] items-center justify-center">
                  <div className="text-center">
                    <div className="border-t-primary-500 mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200"></div>
                    <p className="text-sm text-neutral-500">
                      QnA 목록을 불러오는 중...
                    </p>
                  </div>
                </div>
              ) : qnaList.length === 0 ? (
                <div className="flex min-h-[300px] items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                      <MessageSquare className="h-8 w-8 text-neutral-400" />
                    </div>
                    <p className="mb-2 text-lg font-semibold text-neutral-900">
                      등록된 문의가 없습니다
                    </p>
                    <p className="text-sm text-neutral-500">
                      아직 상품에 대한 문의가 없습니다.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {qnaList.map((qna: any) => {
                    const qnaData = qna.productQnaCreateResponse || qna
                    const answers = qna.answers || []

                    return (
                      <Card
                        key={qnaData.qnaId}
                        variant="outlined"
                        className="overflow-hidden transition-shadow hover:shadow-md"
                      >
                        <CardContent className="p-5">
                          {/* 질문 */}
                          <div className="from-primary-50 to-primary-100/50 mb-4 rounded-xl bg-gradient-to-r p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="mb-2 flex items-center space-x-2">
                                  <span className="bg-primary-600 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white">
                                    Q
                                  </span>
                                  <span className="text-base font-semibold text-neutral-900">
                                    {qnaData.question}
                                  </span>
                                </div>
                              </div>
                              <span className="ml-4 shrink-0 text-xs text-neutral-500">
                                {qnaData.questionedAt
                                  ? new Date(
                                      qnaData.questionedAt,
                                    ).toLocaleDateString('ko-KR', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : ''}
                              </span>
                            </div>
                          </div>

                          {/* 답변 목록 */}
                          {answers.length > 0 && (
                            <div className="border-primary-200 mb-4 space-y-3 border-l-2 pl-4">
                              {answers.map((answer: any) => (
                                <div
                                  key={answer.answerId}
                                  className="group rounded-lg bg-neutral-50 p-4 transition-colors hover:bg-neutral-100"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="mb-2 flex items-center space-x-2">
                                        <span className="bg-primary-600 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white">
                                          A
                                        </span>
                                        <span className="text-sm text-neutral-700">
                                          {answer.answer}
                                        </span>
                                      </div>
                                      <span className="ml-8 text-xs text-neutral-500">
                                        {answer.answeredAt
                                          ? new Date(
                                              answer.answeredAt,
                                            ).toLocaleDateString('ko-KR', {
                                              year: 'numeric',
                                              month: '2-digit',
                                              day: '2-digit',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                            })
                                          : ''}
                                      </span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleDeleteAnswer(
                                          qnaData.qnaId,
                                          answer.answerId,
                                        )
                                      }
                                      className="ml-2 h-8 w-8 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                                      title="답변 삭제"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 답변 작성 */}
                          <div className="rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50/50 p-4">
                            <div className="mb-2 flex items-center space-x-2">
                              <MessageSquare className="h-4 w-4 text-neutral-400" />
                              <span className="text-sm font-medium text-neutral-700">
                                답변 작성
                              </span>
                            </div>
                            <div className="space-y-2">
                              <textarea
                                placeholder="답변을 입력해주세요..."
                                value={newAnswers[qnaData.qnaId] || ''}
                                onChange={(e) =>
                                  setNewAnswers((prev) => ({
                                    ...prev,
                                    [qnaData.qnaId]: e.target.value,
                                  }))
                                }
                                rows={3}
                                className="focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                              />
                              <Button
                                onClick={() => handleAddAnswer(qnaData.qnaId)}
                                disabled={!newAnswers[qnaData.qnaId]?.trim()}
                                size="sm"
                                className="bg-primary-600 hover:bg-primary-700 w-full"
                              >
                                <Send className="mr-2 h-4 w-4" />
                                답변 등록
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
